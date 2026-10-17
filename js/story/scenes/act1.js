'use strict';
// Cinematic scene specs for act 1. Merged into window.STORY_SCENE_SPECS.
// Loads before js/smb-story-narrative-scene.js, which reads the table.
// 8 specs. Chapter ids 17, 19, 22, 24, 26, 29, 30, 31.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  S[17] = {
    bg: 'fracture',
    npcColor: '#3ddc84',
    beats: [
      {
        letterbox: true,
        warp: 0.60,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.48 },
          { at: 80, zoom: 0.95, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 5, strength: 14, dur: 28 }],
        playerPos: [
          { at: 0,  x: 0.50, state: 'fall',  facing: 1, alpha: 0.3 },
          { at: 25, x: 0.48, state: 'hit',   facing: 1, alpha: 0.8 },
          { at: 45, x: 0.46, state: 'float', facing: 1, alpha: 1.0 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.55, fadeIn: 30, portals: [
            { xf: 0.15, yf: 0.20, height: 0.28, color: '#9944ff', a: 0.70 },
            { xf: 0.78, yf: 0.15, height: 0.36, color: '#7722ee', a: 0.60 },
            { xf: 0.35, yf: 0.60, height: 0.22, color: '#aa66ff', a: 0.55 },
          ]},
        ],
        effects: [
          { type: 'screen_flash', color: '#7722ee', startFrame: 5, duration: 18, alpha: 0.55 },
          { type: 'speedlines', cx: 0.50, cy: 0.48, count: 24, color: '#9944ff', alpha: 0.50, startFrame: 5, duration: 35, fadeIn: 8 },
        ],
      },
      {
        letterbox: true,
        warp: 0.38,
        camAnim: [
          { at: 0,  zoom: 0.95, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.05, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.46, state: 'float', facing:  1 },
          { at: 50, x: 0.50, state: 'look',  facing: -1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.45, portals: [
            { xf: 0.22, yf: 0.28, height: 0.24, color: '#8833dd', a: 0.60 },
            { xf: 0.68, yf: 0.22, height: 0.32, color: '#9944ee', a: 0.55 },
            { xf: 0.50, yf: 0.55, height: 0.20, color: '#aa55ff', a: 0.50 },
          ]},
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.45, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.48, cy: 0.50 },
          { at: 45, zoom: 1.35, cx: 0.40, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.40, state: 'float', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle',  facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.55 },
        ],
        effects: [
          { type: 'static_noise', alpha: 0.55 },
          { type: 'phone', xf: 0.46, yf: 0.54, alpha: 0.80 },
        ],
        bubbleX: 0.50,
      },
    ],
  };

  S[19] = {
    bg: 'city',
    npcColor: '#cc66cc',
    beats: [
      {
        letterbox: true,
        warp: 0.45,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.12, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'walk',  facing: 1 },
          { at: 55, x: 0.32, state: 'idle',  facing: 1 },
          { at: 75, x: 0.32, state: 'look',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#1a0820', skyMid: '#240d30', skyBot: '#1a0820' },
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.30, fadeIn: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.50, cy: 0.50 },
          { at: 18, zoom: 1.30, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 8, strength: 10, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',  facing: 1 },
          { at: 8,  x: 0.26, state: 'hit',   facing: 1 },
          { at: 22, x: 0.27, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle',  facing: -1, alpha: 0.0, show: true },
          { at: 8,  x: 0.68, state: 'walk',  facing: -1, alpha: 0.6 },
          { at: 22, x: 0.65, state: 'idle',  facing: -1, alpha: 1.0 },
        ],
        warp: 0.25,
        cityOpts: { skyTop: '#1a0820', skyMid: '#240d30', skyBot: '#1a0820' },
        effects: [
          { type: 'speedlines', cx: 0.65, cy: 0.48, count: 18, color: '#cc66cc', alpha: 0.55, startFrame: 8, duration: 22, fadeIn: 6 },
          { type: 'screen_flash', color: '#cc66cc', startFrame: 8, duration: 12, alpha: 0.55 },
        ],
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.42, cx: 0.62, cy: 0.50 },
          { at: 80, zoom: 1.35, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.27, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.65, state: 'talk',  facing: -1 }],
        warp: 0.18,
        cityOpts: { skyTop: '#1a0820', skyMid: '#240d30', skyBot: '#1a0820' },
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.65 },
        ],
        bubbleX: 0.65,
      },
    ],
  };

  S[22] = {
    bg: 'fracture',
    npcColor: '#7700cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.88, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 0.95, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.35, portals: [
            { xf: 0.35, yf: 0.30, height: 0.18, color: '#6600aa', a: 0.50 },
            { xf: 0.60, yf: 0.22, height: 0.22, color: '#440088', a: 0.45 },
            { xf: 0.80, yf: 0.35, height: 0.16, color: '#5500aa', a: 0.40 },
          ]},
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.95, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.25, cx: 0.65, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle', facing: -1, alpha: 0.0, scale: 1.5 },
          { at: 30, x: 0.70, state: 'idle', facing: -1, alpha: 0.6, scale: 1.5 },
          { at: 65, x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.5 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.70, cy: 0.50, count: 20, color: '#7700cc', alpha: 0.40, startFrame: 25, fadeIn: 18 },
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.50, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.65, cy: 0.50 },
          { at: 30, zoom: 1.38, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1, scale: 1.4 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.60 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.58, cy: 0.50 },
          { at: 35, zoom: 1.20, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'guard',  facing: 1 },
          { at: 20, x: 0.36, state: 'run',    facing: 1 },
          { at: 45, x: 0.42, state: 'attack', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.68, state: 'guard', facing: -1, scale: 1.4 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.80, fadeIn: 18 },
          { type: 'speedlines', cx: 0.36, cy: 0.50, count: 18, color: '#4488ff', alpha: 0.55, startFrame: 20, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash', color: '#4488ff', startFrame: 43, duration: 10, alpha: 0.50 },
        ],
      },
    ],
  };

  S[24] = {
    bg: 'fracture',
    npcColor: '#9955cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.88, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.16, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: [
          { xf: 0.38, color: '#9955cc', facing: -1, state: 'idle', alpha: 0.70 },
          { xf: 0.50, color: '#7733aa', facing: -1, state: 'idle', alpha: 0.65 },
          { xf: 0.60, color: '#8844bb', facing: -1, state: 'idle', alpha: 0.60 },
          { xf: 0.70, color: '#6622aa', facing: -1, state: 'idle', alpha: 0.55 },
          { xf: 0.80, color: '#9955cc', facing: -1, state: 'idle', alpha: 0.50 },
          { xf: 0.88, color: '#7733aa', facing: -1, state: 'idle', alpha: 0.40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.15, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 5, strength: 8, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.16, state: 'idle',  facing: 1 },
          { at: 5,  x: 0.15, state: 'guard', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: [
          { xf: 0.38, color: '#9955cc', facing: -1, state: 'walk', alpha: 0.75 },
          { xf: 0.50, color: '#7733aa', facing: -1, state: 'walk', alpha: 0.70 },
          { xf: 0.60, color: '#8844bb', facing: -1, state: 'walk', alpha: 0.65 },
          { xf: 0.70, color: '#6622aa', facing: -1, state: 'walk', alpha: 0.60 },
          { xf: 0.80, color: '#9955cc', facing: -1, state: 'run',  alpha: 0.55 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#9955cc', alpha: 0.45, fadeIn: 20 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.50, cy: 0.50 },
          { at: 25, zoom: 1.35, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.18, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.60, state: 'walk',  facing: -1, alpha: 0.5 },
          { at: 18, x: 0.58, state: 'talk',  facing: -1, alpha: 1.0 },
        ],
        extraFigures: [
          { xf: 0.68, color: '#7733aa', facing: -1, state: 'idle', alpha: 0.65 },
          { xf: 0.78, color: '#8844bb', facing: -1, state: 'idle', alpha: 0.55 },
          { xf: 0.86, color: '#6622aa', facing: -1, state: 'idle', alpha: 0.45 },
        ],
        bubbleX: 0.58,
      },
    ],
  };

  S[26] = {
    bg: 'fracture',
    npcColor: '#6600aa',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.48, cy: 0.50 },
          { at: 70, zoom: 1.12, cx: 0.52, cy: 0.50 },
        ],
        playerPos: [
          { at: 0, x: 0.24, state: 'walk', facing: 1 },
          { at: 55, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.34, state: 'walk', facing: 1 },
          { at: 55, x: 0.36, state: 'idle', facing: 1, alpha: 0.70 },
        ],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.30, portals: [
            { xf: 0.68, yf: 0.25, height: 0.30, color: '#5500aa', a: 0.55 },
            { xf: 0.82, yf: 0.35, height: 0.22, color: '#440088', a: 0.45 },
          ]},
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.52, cy: 0.50 },
          { at: 60, zoom: 1.25, cx: 0.60, cy: 0.50 },
        ],
        camShake: [{ at: 50, strength: 10, dur: 20 }],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.36, state: 'look', facing: 1, alpha: 0.70 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.60, fadeIn: 25 },
          { type: 'speedlines', cx: 0.75, cy: 0.50, count: 20, color: '#6600aa', alpha: 0.40, startFrame: 45, fadeIn: 12 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.60, cy: 0.50 },
          { at: 20, zoom: 1.10, cx: 0.52, cy: 0.50 },
        ],
        camShake: [{ at: 8, strength: 18, dur: 25 }],
        playerPos: [
          { at: 0,  x: 0.20, state: 'look',  facing: 1 },
          { at: 8,  x: 0.18, state: 'hit',   facing: 1 },
          { at: 22, x: 0.20, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle',  facing: -1, alpha: 0.0, scale: 1.45 },
          { at: 8,  x: 0.70, state: 'idle',  facing: -1, alpha: 0.7, scale: 1.45 },
          { at: 25, x: 0.68, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.75 },
          { type: 'speedlines', cx: 0.70, cy: 0.50, count: 22, color: '#6600aa', alpha: 0.60, startFrame: 8, duration: 25, fadeIn: 6 },
        ],
        effects: [
          { type: 'shockwave',    cx: 0.70, cy: 0.65, color: '#aa44ff', startFrame: 8,  duration: 35 },
          { type: 'screen_flash', color: '#6600aa', startFrame: 8, duration: 14, alpha: 0.65 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.52, cy: 0.50 },
          { at: 30, zoom: 1.30, cx: 0.52, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1, scale: 1.4 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.45 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  S[29] = {
    bg: 'fracture',
    npcColor: '#880044',
    beats: [
      {
        letterbox: true,
        cam: { zoom: 1.0, cx: 0.50, cy: 0.50 },
        playerPos: [
          { at: 0, x: 0.26, state: 'walk', facing: 1, alpha: 0.0 },
          { at: 50, x: 0.28, state: 'idle', facing: 1, alpha: 1.0 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'echo_text', text: 'The Crucible', color: '#880044', alpha: 0.45, fadeIn: 40 },
        ],
        effects: [
          { type: 'screen_flash', color: '#000000', startFrame: 0, duration: 40, alpha: 0.80 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 0.92, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: [
          { xf: 0.40, color: '#440022', facing: -1, state: 'idle', alpha: 0.22 },
          { xf: 0.50, color: '#550033', facing:  1, state: 'idle', alpha: 0.18 },
          { xf: 0.60, color: '#440022', facing: -1, state: 'float', alpha: 0.15 },
          { xf: 0.68, color: '#660044', facing:  1, state: 'idle', alpha: 0.12 },
          { xf: 0.76, color: '#550033', facing: -1, state: 'idle', alpha: 0.10 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#880044', alpha: 0.35, fadeIn: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.92, cx: 0.50, cy: 0.50 },
          { at: 25, zoom: 1.20, cx: 0.60, cy: 0.50 },
        ],
        camShake: [{ at: 18, strength: 14, dur: 22 }],
        playerPos: [{ at: 0, x: 0.20, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle',  facing: -1, alpha: 0.0, scale: 1.3 },
          { at: 18, x: 0.68, state: 'reach', facing: -1, alpha: 0.8, scale: 1.3 },
          { at: 35, x: 0.66, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.3 },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.68, cy: 0.50, count: 24, color: '#880044', alpha: 0.60, startFrame: 18, duration: 28, fadeIn: 8 },
          { type: 'fragment_pulse', color: '#880044', alpha: 0.65, fadeIn: 15 },
        ],
        effects: [
          { type: 'energy_burst', cx: 0.68, cy: 0.52, color: '#aa0055', startFrame: 18, duration: 30 },
          { type: 'screen_flash', color: '#880044', startFrame: 18, duration: 14, alpha: 0.55 },
          { type: 'impact_sparks', cx: 0.68, cy: 0.55, count: 16, color: '#cc2266', startFrame: 18, duration: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.60, cy: 0.50 },
          { at: 40, zoom: 1.50, cx: 0.58, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',  facing: -1, scale: 1.25 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#880044', alpha: 0.50 },
        ],
        bubbleX: 0.66,
      },
    ],
  };

  S[30] = {
    bg: 'level', level: { ch: 31, x: 480 },
    npcColor: '#3ddc84',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.92, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
      {
        letterbox: true,
        cam: { zoom: 1.10, cx: 0.46, cy: 0.50, lerpSpeed: 0.04 },
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.62, state: 'idle', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.46, cy: 0.50 },
          { at: 35, zoom: 1.25, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.62, state: 'idle', facing: -1 },
          { at: 20, x: 0.60, state: 'talk', facing: -1 },
        ],
        bubbleX: 0.60,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.35, cx: 0.36, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.60, fadeIn: 25 },
        ],
        bubbleX: 0.60,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.36, cy: 0.50 },
          { at: 50, zoom: 1.50, cx: 0.33, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.75 },
        ],
        bubbleX: 0.60,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.50, cx: 0.33, cy: 0.48 },
          { at: 40, zoom: 1.50, cx: 0.60, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.55 },
        ],
        bubbleX: 0.60,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.50, cx: 0.60, cy: 0.48 },
          { at: 70, zoom: 1.05, cx: 0.46, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
      },
      {
        letterbox: true,
        playerExpr: 'serene',
        npcExpr: 'focused',
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.46, cy: 0.50 },
          { at: 35, zoom: 1.42, cx: 0.32, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle',  facing: 1 },
          { at: 20, x: 0.32, state: 'reach', facing: 1, expr: 'serene' },
        ],
        npcPos: [
          { at: 0,  x: 0.60, state: 'idle', facing: -1 },
          { at: 22, x: 0.58, state: 'look', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.90, fadeIn: 15 },
          { type: 'energy_burst', cx: 0.32, cy: 0.50, color: '#4488ff', startFrame: 20, duration: 28 },
          { type: 'speedlines', cx: 0.32, cy: 0.50, count: 14, color: '#4488ff', alpha: 0.50, startFrame: 20, fadeIn: 8 },
        ],
        effects: [
          { type: 'screen_flash', color: '#4488ff', startFrame: 20, duration: 10, alpha: 0.30 },
        ],
      },
    ],
  };

  S[31] = {
    bg: 'fracture',
    npcColor: '#6633cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.88, cx: 0.50, cy: 0.50 },
          { at: 90, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'walk', facing: 1 },
          { at: 60, x: 0.24, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.60, fadeIn: 40, portals: [
            { xf: 0.50, yf: 0.18, height: 0.65, color: '#6633cc', a: 0.80 },
            { xf: 0.66, yf: 0.35, height: 0.35, color: '#4422aa', a: 0.55 },
            { xf: 0.36, yf: 0.40, height: 0.28, color: '#7744dd', a: 0.50 },
          ]},
          { type: 'speedlines', cx: 0.50, cy: 0.35, count: 28, color: '#6633cc', alpha: 0.35, fadeIn: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.28, cx: 0.64, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle',  facing: -1, alpha: 0.0, scale: 1.2 },
          { at: 30, x: 0.70, state: 'float', facing: -1, alpha: 0.6, scale: 1.2 },
          { at: 65, x: 0.68, state: 'idle',  facing: -1, alpha: 1.0, scale: 1.2 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.70, yf: 0.30, height: 0.60, color: '#6633cc', alpha: 0.70 },
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.55, fadeIn: 35 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.70, cy: 0.48, count: 18, color: '#6633cc', alpha: 0.45, startFrame: 28, fadeIn: 15 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.64, cy: 0.50 },
          { at: 35, zoom: 1.35, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1, scale: 1.15 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.50 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.58, cy: 0.50 },
          { at: 40, zoom: 1.48, cx: 0.66, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1, scale: 1.15 }],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        playerExpr: 'cool',
        camAnim: [
          { at: 0,  zoom: 1.48, cx: 0.66, cy: 0.48 },
          { at: 15, zoom: 1.52, cx: 0.26, cy: 0.47 },
          { at: 70, zoom: 1.40, cx: 0.28, cy: 0.48 },
        ],
        playerPos: [{ at: 0, x: 0.24, state: 'idle', facing: 1, expr: 'cool' }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1, scale: 1.15 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.70, fadeIn: 15 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        playerExpr: 'intense',
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.28, cy: 0.48 },
          { at: 8,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 50, zoom: 1.22, cx: 0.56, cy: 0.50 },
        ],
        camShake: [{ at: 8, strength: 14, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.24, state: 'idle',   facing: 1, expr: 'intense' },
          { at: 8,  x: 0.44, state: 'run',    facing: 1, expr: 'intense' },
          { at: 33, x: 0.54, state: 'attack', facing: 1, expr: 'intense' },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle',  facing: -1, scale: 1.15 },
          { at: 8,  x: 0.66, state: 'guard', facing: -1, scale: 1.15 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.95, fadeIn: 6 },
          { type: 'speedlines', cx: 0.42, cy: 0.50, count: 26, color: '#4488ff', alpha: 0.72, startFrame: 8, duration: 30, fadeIn: 5 },
        ],
        effects: [
          { type: 'screen_flash',   color: '#4488ff', startFrame: 33, duration: 10, alpha: 0.65 },
          { type: 'shockwave',      cx: 0.56, cy: 0.65, color: '#4488ff', startFrame: 33, duration: 28 },
          { type: 'impact_sparks',  cx: 0.56, cy: 0.55, count: 16, color: '#88aaff', startFrame: 33, duration: 25 },
          { type: 'ground_crack',   cx: 0.56, cy: 0.70, color: '#4466ff', startFrame: 33, duration: 30 },
        ],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
