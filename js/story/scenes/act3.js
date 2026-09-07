'use strict';
// js/story/scenes/act3.js — cinematic scene specs for act3.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 9 specs — chapter ids: 50, 51, 52, 53, 54, 56, 58, 61, 64

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ── Chapter 50 — The Probe ──────────────────────────────────────────────────
  S[50] = {
    bg: 'fracture',
    npcColor: '#bbbbdd',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.28, cx: 0.56, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#bbbbdd', alpha: 0.30, fadeIn: 40 },
        ],
        bubbleX: 0.22,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.56, cy: 0.50 },
          { at: 45, zoom: 1.38, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#bbbbdd', alpha: 0.40 },
        ],
        bubbleX: 0.22,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.22, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle', facing: -1, alpha: 0.0 },
          { at: 20, x: 0.72, state: 'walk', facing: -1, alpha: 0.7 },
          { at: 50, x: 0.68, state: 'idle', facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.40, fadeIn: 15 },
          { type: 'fragment_pulse', color: '#bbbbdd', alpha: 0.35, fadeIn: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.60, cy: 0.50 },
          { at: 45, zoom: 1.35, cx: 0.56, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.45 },
        ],
        bubbleX: 0.22,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.56, cy: 0.50 },
          { at: 15, zoom: 1.35, cx: 0.38, cy: 0.50 },
          { at: 60, zoom: 1.28, cx: 0.44, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.40 },
        ],
        bubbleX: 0.22,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.44, cy: 0.50 },
          { at: 40, zoom: 1.38, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle',  facing: 1 },
          { at: 30, x: 0.30, state: 'reach', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.60, fadeIn: 25 },
        ],
        bubbleX: 0.38,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.38, cy: 0.50 },
          { at: 20, zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.22, cx: 0.52, cy: 0.50 },
        ],
        camShake: [{ at: 20, strength: 10, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',   facing: -1 },
          { at: 20, x: 0.64, state: 'attack', facing: -1 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.55, fadeIn: 10 },
          { type: 'speedlines', cx: 0.55, cy: 0.50, count: 20, color: '#bbbbdd', alpha: 0.55, startFrame: 18, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ccccee', startFrame: 20, duration: 10, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.55, cy: 0.62, color: '#bbbbdd', startFrame: 20, duration: 28 },
        ],
      },
    ],
  };

  // ── Chapter 51 — The Split (branch) ─────────────────────────────────────────
  S[51] = {
    bg: 'fracture',
    npcColor: '#2266bb',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.25, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.30, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.38, cx: 0.62, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.45 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.62, cy: 0.48 },
          { at: 40, zoom: 1.30, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        bubbleX: 0.36,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.40, cx: 0.64, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.50 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.64, cy: 0.48 },
          { at: 40, zoom: 1.35, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        bubbleX: 0.40,
      },
      {
        // The fragment reacts. Not to the argument — to the Third Architect's certainty.
        // Player turns. Already decided before anyone else in the room.
        letterbox: true,
        playerExpr: 'focused',
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.50, cy: 0.50 },
          { at: 50, zoom: 1.52, cx: 0.32, cy: 0.48 }, // push tight to player — they're the only still thing
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1, expr: 'focused' },
          { at: 35, x: 0.27, state: 'look', facing: 1, expr: 'focused' }, // looks at the Third Architect directly
        ],
        npcPos:    [{ at: 0, x: 0.66, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.80, fadeIn: 28 },
          { type: 'speedlines', cx: 0.28, cy: 0.50, count: 14, color: '#4488ff', alpha: 0.48, startFrame: 32, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash', color: '#224488', startFrame: 35, duration: 12, alpha: 0.28 },
        ],
      },
    ],
  };

  // ── Chapter 52 — Rogue Faction ──────────────────────────────────────────────
  S[52] = {
    bg: 'city',
    npcColor: '#cc8833',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.18, cx: 0.54, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.78, state: 'idle', facing: -1, alpha: 0.3 },
          { at: 65, x: 0.72, state: 'idle', facing: -1, alpha: 0.9 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc8833', alpha: 0.25, fadeIn: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.54, cy: 0.50 },
          { at: 50, zoom: 1.35, cx: 0.66, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc8833', alpha: 0.50 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.66, cy: 0.48 },
          { at: 45, zoom: 1.42, cx: 0.66, cy: 0.46 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc8833', alpha: 0.60 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.42, cx: 0.66, cy: 0.46 },
          { at: 40, zoom: 1.28, cx: 0.54, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc8833', alpha: 0.40 },
        ],
        bubbleX: 0.28,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.54, cy: 0.50 },
          { at: 18, zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 55, zoom: 1.14, cx: 0.52, cy: 0.50 },
        ],
        camShake: [{ at: 18, strength: 14, dur: 25 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',   facing: -1 },
          { at: 18, x: 0.62, state: 'attack', facing: -1 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 22, color: '#cc8833', alpha: 0.65, startFrame: 15, fadeIn: 8 },
          { type: 'fragment_pulse', color: '#cc8833', alpha: 0.70, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc8833', startFrame: 18, duration: 12, alpha: 0.45 },
          { type: 'shockwave',     cx: 0.50, cy: 0.62, color: '#cc8833', startFrame: 18, duration: 32 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.52, count: 14, color: '#ffaa44', startFrame: 18, duration: 26 },
        ],
      },
    ],
  };

  // ── Chapter 53 — What Veran Didn't Say (branch) ─────────────────────────────
  S[53] = {
    bg: 'fracture',
    npcColor: '#88aaff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.28, cx: 0.54, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.25, fadeIn: 45 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.54, cy: 0.50 },
          { at: 50, zoom: 1.40, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle', facing: -1, alpha: 0.0 },
          { at: 18, x: 0.70, state: 'walk', facing: -1, alpha: 0.8 },
          { at: 45, x: 0.66, state: 'idle', facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.40, fadeIn: 20 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.60, cy: 0.50 },
          { at: 35, zoom: 1.35, cx: 0.46, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 22, x: 0.30, state: 'walk', facing: 1 },
          { at: 35, x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.66, state: 'idle', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.46, cy: 0.50 },
          { at: 45, zoom: 1.45, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.50, fadeIn: 25 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.60, cy: 0.50 },
          { at: 40, zoom: 1.50, cx: 0.64, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.60 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.50, cx: 0.64, cy: 0.48 },
          { at: 50, zoom: 1.15, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.32, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.50, fadeIn: 20 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.32, cx: 0.60, cy: 0.50 },
          { at: 50, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
          { at: 30, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.66, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.40, fadeIn: 30 },
        ],
      },
    ],
  };

  // ── Chapter 54 — The Upload ──────────────────────────────────────────────────
  S[54] = {
    bg: 'fracture',
    npcColor: '#88aaff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.32, cx: 0.44, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 0.9 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.40, fadeIn: 35 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.32, cx: 0.44, cy: 0.50 },
          { at: 45, zoom: 1.45, cx: 0.62, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.55 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.62, cy: 0.48 },
          { at: 30, zoom: 1.55, cx: 0.66, cy: 0.46 },
          { at: 60, zoom: 1.40, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',  facing: 1 },
          { at: 30, x: 0.28, state: 'reach', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.70, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aaff', alpha: 0.70 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.60, cy: 0.50 },
          { at: 22, zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.18, cx: 0.50, cy: 0.50 },
        ],
        camShake: [
          { at: 22, strength: 14, dur: 25 },
          { at: 50, strength:  8, dur: 14 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'guard', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.70, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.70, fadeIn: 18, portals: [
            { xf: 0.72, yf: 0.22, height: 0.50, color: '#9999cc', a: 0.75 },
            { xf: 0.86, yf: 0.38, height: 0.32, color: '#8888bb', a: 0.55 },
          ]},
          { type: 'speedlines', cx: 0.52, cy: 0.50, count: 22, color: '#9999cc', alpha: 0.55, startFrame: 18, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#aaaacc', startFrame: 22, duration: 12, alpha: 0.45 },
          { type: 'shockwave',     cx: 0.52, cy: 0.62, color: '#9999cc', startFrame: 22, duration: 32 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.30, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'idle',  facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.55, fadeIn: 25 },
        ],
        bubbleX: 0.28,
      },
    ],
  };

  // ── Chapter 56 — Signal Maze (exploration with narrative) ───────────────────
  S[56] = {
    bg: 'city',
    npcColor: '#8844ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.92, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.08, cx: 0.46, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'walk', facing: 1 },
          { at: 75, x: 0.26, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.35, fadeIn: 30 },
          { type: 'speedlines', cx: 0.50, cy: 0.40, count: 12, color: '#554466', alpha: 0.25, fadeIn: 55 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.08, cx: 0.46, cy: 0.50 },
          { at: 55, zoom: 1.22, cx: 0.56, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.78, state: 'idle', facing: -1, alpha: 0.0 },
          { at: 20, x: 0.70, state: 'walk', facing: -1, alpha: 0.7 },
          { at: 45, x: 0.66, state: 'idle', facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.45, fadeIn: 20 },
        ],
        bubbleX: 0.38,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.56, cy: 0.50 },
          { at: 45, zoom: 1.35, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle', facing: 1 },
          { at: 30, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.66, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#8844ff', alpha: 0.60, fadeIn: 22 },
          { type: 'speedlines', cx: 0.28, cy: 0.50, count: 12, color: '#8844ff', alpha: 0.40, startFrame: 28, fadeIn: 12 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.38, cy: 0.50 },
          { at: 60, zoom: 1.10, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 20, x: 0.32, state: 'walk', facing: 1 },
          { at: 60, x: 0.42, state: 'run',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.66, state: 'idle', facing: -1, alpha: 0.0 }],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.50, fadeIn: 15 },
          { type: 'speedlines', cx: 0.44, cy: 0.52, count: 16, color: '#554466', alpha: 0.45, startFrame: 55, fadeIn: 8 },
        ],
      },
    ],
  };

  // ── Chapter 58 — Converted ──────────────────────────────────────────────────
  S[58] = {
    bg: 'forest',
    npcColor: '#557799',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 100, zoom: 1.22, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.20, state: 'walk', facing: 1 },
          { at: 75, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.74, state: 'idle', facing: -1, alpha: 0.5 },
          { at: 75, x: 0.70, state: 'idle', facing: -1, alpha: 0.9 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.25, fadeIn: 50 },
          { type: 'static_noise', alpha: 0.25, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.58, cy: 0.50 },
          { at: 60, zoom: 1.35, cx: 0.64, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.40, fadeIn: 25 },
          { type: 'fragment_pulse', color: '#9999cc', alpha: 0.45, fadeIn: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.64, cy: 0.50 },
          { at: 40, zoom: 1.28, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9999cc', alpha: 0.35 },
        ],
        bubbleX: 0.28,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.50, cy: 0.50 },
          { at: 45, zoom: 1.42, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 30, x: 0.27, state: 'look', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.70, state: 'guard', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.65, fadeIn: 25 },
          { type: 'static_noise', alpha: 0.35, fadeIn: 20 },
        ],
        effects: [
          { type: 'screen_flash', color: '#2266bb', startFrame: 40, duration: 12, alpha: 0.30 },
        ],
      },
    ],
  };

  // ── Chapter 61 — Against the Architect ──────────────────────────────────────
  S[61] = {
    bg: 'ice',
    npcColor: '#2266bb',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.25, cx: 0.56, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle', facing: -1, alpha: 0.0 },
          { at: 22, x: 0.72, state: 'walk', facing: -1, alpha: 0.8 },
          { at: 55, x: 0.66, state: 'idle', facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.35, count: 10, color: '#88ccff', alpha: 0.22, fadeIn: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.56, cy: 0.50 },
          { at: 45, zoom: 1.40, cx: 0.64, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.40, fadeIn: 30 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.64, cy: 0.48 },
          { at: 40, zoom: 1.30, cx: 0.56, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.50 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.56, cy: 0.50 },
          { at: 60, zoom: 1.22, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.66, state: 'idle',  facing: -1 },
          { at: 35, x: 0.70, state: 'idle',  facing: -1, alpha: 0.8 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.35, fadeIn: 30 },
          { type: 'fragment_pulse', color: '#9999cc', alpha: 0.40, fadeIn: 35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.62, cy: 0.50 },
          { at: 45, zoom: 1.35, cx: 0.64, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.45 },
        ],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.64, cy: 0.48 },
          { at: 18, zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.18, cx: 0.52, cy: 0.50 },
        ],
        camShake: [{ at: 18, strength: 10, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 20, x: 0.28, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.66, state: 'idle',  facing: -1 },
          { at: 18, x: 0.62, state: 'attack', facing: -1 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 18, color: '#2266bb', alpha: 0.55, startFrame: 15, fadeIn: 8 },
          { type: 'fragment_pulse', color: '#2266bb', alpha: 0.65, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#2266bb', startFrame: 18, duration: 10, alpha: 0.40 },
          { type: 'shockwave',     cx: 0.50, cy: 0.62, color: '#88ccff', startFrame: 18, duration: 30 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.52, count: 12, color: '#aaddff', startFrame: 18, duration: 24 },
        ],
        bubbleX: 0.66,
      },
    ],
  };

  // ── Chapter 64 — The Enforcer ────────────────────────────────────────────────
  S[64] = {
    bg: 'ruins',
    npcColor: '#cc0044',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 110, zoom: 1.15, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_cracks', alpha: 0.45, fadeIn: 45 },
          { type: 'smoke', cx: 0.60, cy: 0.28, color: '#220011', alpha: 0.50, fadeIn: 35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.30, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.85, state: 'idle',  facing: -1, alpha: 0.0, scale: 1.15 },
          { at: 18, x: 0.76, state: 'walk',  facing: -1, alpha: 0.6, scale: 1.15 },
          { at: 55, x: 0.70, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.15 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.50, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.60, fadeIn: 20 },
          { type: 'smoke', cx: 0.70, cy: 0.28, color: '#330011', alpha: 0.55, fadeIn: 16 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.70, cy: 0.48, count: 20, color: '#cc0044', alpha: 0.45, startFrame: 16, fadeIn: 14 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.60, cy: 0.50 },
          { at: 45, zoom: 1.38, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'idle', facing: -1, scale: 1.12 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc0044', alpha: 0.40, fadeIn: 30 },
        ],
        bubbleX: 0.30,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.48, cy: 0.50 },
          { at: 40, zoom: 1.48, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.26, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'idle',  facing: -1, scale: 1.12 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc0044', alpha: 0.55 },
        ],
        bubbleX: 0.30,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.48, cx: 0.38, cy: 0.50 },
          { at: 15, zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 55, zoom: 1.18, cx: 0.52, cy: 0.50 },
        ],
        camShake: [
          { at: 15, strength: 20, dur: 32 },
          { at: 40, strength: 10, dur: 16 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'guard', facing: 1 },
          { at: 18, x: 0.22, state: 'fall',  facing: 1 },
          { at: 45, x: 0.26, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle',   facing: -1, scale: 1.12 },
          { at: 14, x: 0.58, state: 'attack', facing: -1, scale: 1.12 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.44, cy: 0.50, count: 28, color: '#cc0044', alpha: 0.70, startFrame: 12, fadeIn: 6 },
          { type: 'fragment_pulse', color: '#cc0044', alpha: 0.85, fadeIn: 10 },
          { type: 'sky_cracks', alpha: 0.70, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc0044', startFrame: 15, duration: 16, alpha: 0.60 },
          { type: 'shockwave',     cx: 0.44, cy: 0.60, color: '#cc0044', startFrame: 15, duration: 42 },
          { type: 'impact_sparks', cx: 0.44, cy: 0.50, count: 22, color: '#ff4466', startFrame: 15, duration: 35 },
          { type: 'ground_crack',  cx: 0.44, cy: 0.68, color: '#cc0044', startFrame: 15, duration: 50 },
        ],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
