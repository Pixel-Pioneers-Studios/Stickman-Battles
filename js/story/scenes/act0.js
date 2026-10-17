'use strict';
// js/story/scenes/act0.js: cinematic scene specs for act0 (chapter ids 0, 2-4, 6-8, 10-16).
// Merges into window.STORY_SCENE_SPECS. Must load before smb-story-narrative-scene.js, which reads it.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // Chapter 0: Fracture Point
  S[0] = {
    bg: 'city',
    npcColor: '#88aacc',
    level: { ch: 0, x: 3000 },
    beats: [
      {
        letterbox: true,
        level: { ch: 0, x: 3000, tearAt: 66 },
        camAnim: [
          { at: 0,   zoom: 1.34, cx: 0.30, cy: 0.58 },
          { at: 62,  zoom: 1.30, cx: 0.36, cy: 0.58 }, // travelling with him
          { at: 72,  zoom: 1.04, cx: 0.48, cy: 0.50 }, // thrown wide by the rip
          { at: 170, zoom: 1.08, cx: 0.46, cy: 0.50 },
          { at: 300, zoom: 1.30, cx: 0.44, cy: 0.47 }, // the held breath: slow creep in
        ],
        camShake: [{ at: 66, strength: 16, dur: 26 }],
        playerPos: [
          { at: 0,   x: 0.25, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 66,  x: 0.37, state: 'hit',    facing: 1, ease: 'settle' },
          { at: 86,  x: 0.31, state: 'brace',  facing: 1 },
          { at: 186, x: 0.31, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.56, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'speedlines', cx: 0.50, cy: 0.41, count: 26, color: '#cc88ff', alpha: 0.55, startFrame: 66, duration: 100, fadeIn: 6 },
        ],
        effects: [
          { type: 'shockwave',    cx: 0.50, cy: 0.41, color: '#cc88ff', startFrame: 66, duration: 34 },
          { type: 'screen_flash', color: '#9944ff', startFrame: 66, duration: 14, alpha: 0.55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.41, count: 14, color: '#e8d8ff', startFrame: 66, duration: 30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.60, cx: 0.50, cy: 0.44 }, // on the tear
          { at: 38,  zoom: 1.60, cx: 0.51, cy: 0.44 },
          { at: 56,  zoom: 1.40, cx: 0.52, cy: 0.58 }, // follow the drop
          { at: 112, zoom: 1.20, cx: 0.44, cy: 0.55 }, // open to both of them
          { at: 178, zoom: 1.24, cx: 0.44, cy: 0.55 },
        ],
        camShake: [{ at: 52, strength: 7, dur: 12 }],
        playerPos: [
          { at: 0,  x: 0.31, state: 'lookUp', facing: 1 },
          { at: 44, x: 0.31, state: 'stance',  facing: 1, ease: 'settle' },
          { at: 62, x: 0.28, state: 'stance',  facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.505, y: -0.10, state: 'float',  facing: -1, alpha: 0 },
          { at: 26,  x: 0.505, y: -0.10, state: 'float',  facing: -1, alpha: 1 },
          { at: 40,  x: 0.515, y: -0.10, state: 'fall',   facing: -1, ease: 'linear' },
          { at: 52,  x: 0.555, y: 0,     state: 'crouch', facing: -1 },
          { at: 86,  x: 0.555, state: 'idle',  facing: -1 },
          { at: 116, x: 0.555, state: 'point', facing: -1 },
        ],
        effects: [
          { type: 'impact_sparks', cx: 0.555, cy: 0.74, count: 10, color: '#aaccff', startFrame: 52, duration: 24 },
          { type: 'shockwave',     cx: 0.555, cy: 0.74, color: '#aaccff', startFrame: 52, duration: 22, alpha: 0.5 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.24, cx: 0.44, cy: 0.55 },
          { at: 70, zoom: 1.46, cx: 0.50, cy: 0.54 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.555, state: 'point', facing: -1 },
          { at: 22, x: 0.555, state: 'talk',  facing: -1 },
        ],
        bubbleX: 0.555,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.75, cx: 0.30, cy: 0.58 },
          { at: 78,  zoom: 1.82, cx: 0.30, cy: 0.58 },
          { at: 96,  zoom: 1.16, cx: 0.42, cy: 0.54 },
          { at: 200, zoom: 1.20, cx: 0.42, cy: 0.54 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'stance', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.555, state: 'idle',  facing: -1 },
          { at: 70, x: 0.555, state: 'walk',  facing: -1, ease: 'linear' },
          { at: 92, x: 0.52,  state: 'stance', facing: -1 },
        ],
      },
    ],
  };

  // Chapter 2: The Seams
  S[2] = {
    bg: 'city',
    npcColor: '#cc4444',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.20, cy: 0.58 },
          { at: 60,  zoom: 1.38, cx: 0.27, cy: 0.56 },
          { at: 145, zoom: 1.06, cx: 0.44, cy: 0.46 }, // pull out and up to the sky
        ],
        playerPos: [
          { at: 0,  x: 0.14, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 62, x: 0.25, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.70, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.06, cx: 0.44, cy: 0.46 },
          { at: 15,  zoom: 1.00, cx: 0.50, cy: 0.42 }, // snap wide to show the whole sky
          { at: 100, zoom: 1.00, cx: 0.48, cy: 0.46 },
          { at: 150, zoom: 1.30, cx: 0.36, cy: 0.58 }, // down to where he hides
        ],
        camShake: [{ at: 15, strength: 18, dur: 28 }],
        playerPos: [
          { at: 0,   x: 0.25,  state: 'lookUp', facing: 1 },
          { at: 15,  x: 0.25,  state: 'hit',    facing: 1, ease: 'settle' },
          { at: 33,  x: 0.22,  state: 'brace',  facing: 1 },
          { at: 104, x: 0.22,  state: 'run',    facing: 1, ease: 'linear' },
          { at: 132, x: 0.345, state: 'crouch', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_bleed', alpha: 0.90, fadeIn: 18, startFrame: 12 },
          { type: 'multi_portals', alpha: 0.80, fadeIn: 20, startFrame: 12, portals: [
            { xf: 0.08, yf: 0.22, height: 0.30, color: '#cc44ff', a: 0.85 },
            { xf: 0.22, yf: 0.12, height: 0.42, color: '#dd66ff', a: 0.90 },
            { xf: 0.40, yf: 0.18, height: 0.35, color: '#aa44ee', a: 0.80 },
            { xf: 0.58, yf: 0.10, height: 0.48, color: '#ee88ff', a: 0.90 },
            { xf: 0.74, yf: 0.20, height: 0.32, color: '#bb55ff', a: 0.80 },
            { xf: 0.88, yf: 0.14, height: 0.40, color: '#cc66ff', a: 0.85 },
          ]},
        ],
        effects: [
          { type: 'speedlines', cx: 0.50, cy: 0.30, count: 28, color: '#cc44ff', alpha: 0.55, startFrame: 12, duration: 30, fadeIn: 8 },
          { type: 'screen_flash', color: '#cc44ff', startFrame: 14, duration: 18, alpha: 0.40 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.34, cx: 0.74, cy: 0.60 },
          { at: 80,  zoom: 1.30, cx: 0.66, cy: 0.60 },
          { at: 130, zoom: 1.08, cx: 0.52, cy: 0.56 },
        ],
        playerPos: [{ at: 0, x: 0.345, state: 'crouch', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.72, state: 'walk', facing: -1, ease: 'linear' },
          { at: 84, x: 0.56, state: 'idle', facing: -1 },
        ],
        effectsBehind: [
          { type: 'sky_bleed', alpha: 0.75 },
          { type: 'multi_portals', alpha: 0.55, portals: [
            { xf: 0.35, yf: 0.20, height: 0.38, color: '#cc66ff', a: 0.80 },
            { xf: 0.65, yf: 0.15, height: 0.44, color: '#aa44ee', a: 0.75 },
          ]},
        ],
        extraFigures: [
          { color: '#cc3333', pos: [{ at: 0, x: 0.80, state: 'walk', facing: -1, alpha: 0.90, ease: 'linear' }, { at: 84, x: 0.64, state: 'idle', facing: -1, alpha: 0.90 }] },
          { color: '#aa2222', pos: [{ at: 0, x: 0.88, state: 'walk', facing: -1, alpha: 0.85, ease: 'linear' }, { at: 84, x: 0.72, state: 'idle', facing: -1, alpha: 0.85 }] },
          { color: '#bb3333', pos: [{ at: 0, x: 0.96, state: 'walk', facing: -1, alpha: 0.80, ease: 'linear' }, { at: 84, x: 0.80, state: 'idle', facing: -1, alpha: 0.80 }] },
          { color: '#993322', pos: [{ at: 0, x: 1.04, state: 'walk', facing: -1, alpha: 0.75, ease: 'linear' }, { at: 84, x: 0.88, state: 'idle', facing: -1, alpha: 0.75 }] },
          { color: '#cc4433', pos: [{ at: 0, x: 1.12, state: 'walk', facing: -1, alpha: 0.70, ease: 'linear' }, { at: 84, x: 0.96, state: 'idle', facing: -1, alpha: 0.70 }] },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.08, cx: 0.52, cy: 0.56 },
          { at: 30,  zoom: 1.42, cx: 0.60, cy: 0.56 }, // push in on the order
          { at: 84,  zoom: 1.42, cx: 0.60, cy: 0.56 },
          { at: 124, zoom: 1.14, cx: 0.48, cy: 0.56 }, // open to the whole street
          { at: 220, zoom: 1.18, cx: 0.46, cy: 0.56 },
        ],
        playerPos: [
          { at: 0,   x: 0.345, state: 'crouch', facing: 1 },
          { at: 128, x: 0.345, state: 'stance',  facing: 1, ease: 'settle' },
          { at: 146, x: 0.32,  state: 'stance',  facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.56, state: 'point', facing: -1 },
          { at: 44,  x: 0.56, state: 'talk',  facing: -1 },
          { at: 112, x: 0.56, state: 'point', facing: -1 },
        ],
        effectsBehind: [
          { type: 'sky_bleed', alpha: 0.60 },
        ],
        extraFigures: [
          { color: '#cc3333', pos: [{ at: 0, x: 0.64, state: 'idle', facing: -1, alpha: 0.90 }, { at: 90, x: 0.64, state: 'walk', facing: -1, alpha: 0.90, ease: 'linear' }, { at: 150, x: 0.50, state: 'stance', facing: -1, alpha: 0.95 }] },
          { color: '#aa2222', pos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0.85 }, { at: 100, x: 0.72, state: 'walk', facing: -1, alpha: 0.85, ease: 'linear' }, { at: 160, x: 0.62, state: 'stance', facing: -1, alpha: 0.90 }] },
          { color: '#bb3333', pos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0.80 }] },
          { color: '#993322', pos: [{ at: 0, x: 0.88, state: 'idle', facing: -1, alpha: 0.75 }] },
          { color: '#cc4433', pos: [{ at: 0, x: 0.96, state: 'idle', facing: -1, alpha: 0.70 }] },
        ],
        bubbleX: 0.56,
      },
    ],
  };

  // Chapter 3: Disorientation (hidden)
  S[3] = {
    bg: 'city',
    npcColor: '#88ccff',
    beats: [
      {
        warp: 0.65,
        camShake: [{ at: 5, strength: 12, dur: 30 }],
        cam: { zoom: 1.08, cx: 0.50, cy: 0.50 },
        playerPos: [
          { at: 0,  x: 0.35, state: 'idle', facing: 1 },
          { at: 20, x: 0.34, state: 'hit',  facing: 1 }, // reality impact
          { at: 38, x: 0.35, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: [
          { xf: 0.52, color: '#556677', facing:  1, state: 'walk', alpha: 0.38 },
          { xf: 0.65, color: '#445566', facing: -1, state: 'idle', alpha: 0.32 },
          { xf: 0.78, color: '#667788', facing:  1, state: 'look', alpha: 0.28 },
        ],
      },
      {
        warp: 0.35,
        cam: { zoom: 1.05, cx: 0.50, cy: 0.50 },
        playerPos: [{ at: 0, x: 0.30, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        extraFigures: [
          { xf: 0.48, color: '#556677', facing:  1, state: 'walk', alpha: 0.35 },
          { xf: 0.62, color: '#667788', facing: -1, state: 'idle', alpha: 0.30 },
          { xf: 0.74, color: '#445566', facing: -1, state: 'walk', alpha: 0.25 },
        ],
      },
      {
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.40, cx: 0.36, cy: 0.52 }, // push into player + phone
        ],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.65, fadeIn: 30 },
        ],
        effects: [
          { type: 'phone',        xf: 0.38, yf: 0.56, alpha: 0.95 },
          { type: 'static_noise', alpha: 0.45 },
        ],
        bubbleX: 0.42,
      },
      {
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.36, cy: 0.48 },
          { at: 40, zoom: 1.60, cx: 0.34, cy: 0.47 },
        ],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effects: [
          { type: 'phone', xf: 0.38, yf: 0.56, alpha: 0.80 },
        ],
        bubbleX: 0.42,
      },
      {
        camAnim: [
          { at: 0,  zoom: 1.60, cx: 0.34, cy: 0.47 },
          { at: 50, zoom: 1.05, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
      {
        cam: { zoom: 1.05, cx: 0.50, cy: 0.50 },
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
          { at: 15, x: 0.50, state: 'walk', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
    ],
  };

  // Chapter 4: Bleeding Sky
  S[4] = {
    bg: 'city',
    npcColor: '#8855cc',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.55, cx: 0.20, cy: 0.74 }, // low, on the climb
          { at: 52,  zoom: 1.45, cx: 0.22, cy: 0.62 },
          { at: 188, zoom: 1.12, cx: 0.36, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.17, y: 0.15, state: 'reach',  facing: 1, ease: 'smooth' },
          { at: 46,  x: 0.19, y: 0,    state: 'crouch', facing: 1 },
          { at: 78,  x: 0.19, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 150, x: 0.32, state: 'idle',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.76, state: 'crouch', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.25, fadeIn: 50 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.12, cx: 0.36, cy: 0.50 },
          { at: 110, zoom: 1.00, cx: 0.50, cy: 0.36 },
          { at: 245, zoom: 1.03, cx: 0.50, cy: 0.20 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle',   facing: 1 },
          { at: 14, x: 0.32, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.76, state: 'crouch', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'sky_cracks', spreadFrames: 200 },
        ],
      },
      {
        letterbox: true,
        transition: 'whip',
        camAnim: [
          { at: 0,   zoom: 1.65, cx: 0.95, cy: 0.70 }, // zoom pivots on cx: this frames the Watcher alone
          { at: 52,  zoom: 1.65, cx: 0.95, cy: 0.68 },
          { at: 96,  zoom: 1.16, cx: 0.54, cy: 0.54 }, // open to both
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'lookUp', facing: 1 },
          { at: 60, x: 0.32, state: 'stance',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.76, state: 'crouch', facing: -1 },
          { at: 44, x: 0.76, state: 'idle',   facing: -1 },
        ],
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.92 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.16, cx: 0.54, cy: 0.54 },
          { at: 140, zoom: 1.36, cx: 0.46, cy: 0.56 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'stance', facing: 1, ease: 'settle' },
          { at: 70, x: 0.32, state: 'stance', facing: 1, ease: 'settle' },
          { at: 90, x: 0.29, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.76, state: 'walk',  facing: -1, ease: 'linear' },
          { at: 76,  x: 0.61, state: 'talk',  facing: -1 },
          { at: 150, x: 0.61, state: 'point', facing: -1 },
        ],
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.92 },
        ],
        bubbleX: 0.61,
      },
    ],
  };

  // Chapter 6: Ground Zero
  S[6] = {
    bg: 'city',
    npcColor: '#885500',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.70, cx: 0.30, cy: 0.67 },
          { at: 90, zoom: 1.58, cx: 0.30, cy: 0.66 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look', facing: -1 },
          { at: 62, x: 0.30, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#100200', skyMid: '#1a0400', skyBot: '#100200' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.40, alpha: 0.60, fadeIn: 40 },
        ],
        effects: [
          { type: 'echo_text', text: '"You\'re not the first."', color: '#aaccff', alpha: 0.85 },
        ],
        bubbleX: 0.22,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.25, cx: 0.32, cy: 0.54 },
          { at: 30,  zoom: 1.25, cx: 0.32, cy: 0.56 }, // follow the drop
          { at: 150, zoom: 1.12, cx: 0.40, cy: 0.54 },
        ],
        camShake: [{ at: 26, strength: 6, dur: 12 }],
        playerPos: [
          { at: 0,   x: 0.30, y: -0.42, state: 'fall', facing: 1, ease: 'linear' },
          { at: 26,  x: 0.31, y: 0,     state: 'crouch', facing: 1 },
          { at: 64,  x: 0.31, state: 'walk', facing: 1, ease: 'linear' },
          { at: 130, x: 0.43, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#14040a', skyMid: '#1e0808', skyBot: '#120606' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.65, alpha: 0.80, fadeIn: 30 },
          { type: 'smoke', alpha: 0.55 },
        ],
        effects: [
          { type: 'impact_sparks', cx: 0.31, cy: 0.74, count: 8, color: '#ffcc88', startFrame: 26, duration: 22 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.12, cx: 0.40, cy: 0.54 },
          { at: 24,  zoom: 1.00, cx: 0.50, cy: 0.50 }, // thrown wide by the blast
          { at: 200, zoom: 1.10, cx: 0.60, cy: 0.54 },
        ],
        camShake: [{ at: 24, strength: 14, dur: 24 }],
        playerPos: [
          { at: 0,   x: 0.43, state: 'look',   facing: 1 },
          { at: 24,  x: 0.43, state: 'hit',    facing: 1, ease: 'settle' },
          { at: 42,  x: 0.40, state: 'brace',  facing: 1 },
          { at: 120, x: 0.40, state: 'run',    facing: 1, ease: 'linear' },
          { at: 142, x: 0.50, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 1.02,  state: 'walk',  facing: -1, ease: 'linear' },
          { at: 150, x: 0.75,  state: 'reach', facing: -1 },
          { at: 205, x: 0.75,  state: 'point', facing: -1 },
        ],
        cityOpts: { skyTop: '#1e0600', skyMid: '#2a0c00', skyBot: '#180600' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.65, alpha: 0.80 },
          { type: 'fire_glow', intensity: 1.0, alpha: 0.90, startFrame: 22, fadeIn: 14 },
          { type: 'smoke', alpha: 0.85 },
          { type: 'sky_bleed', alpha: 0.40 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ff8833', startFrame: 24, duration: 14, alpha: 0.45 },
          { type: 'impact_sparks', cx: 0.62, cy: 0.50, count: 16, color: '#ffbb55', startFrame: 24, duration: 34 },
          { type: 'shockwave', cx: 0.62, cy: 0.56, color: '#ff9944', startFrame: 24, duration: 30, alpha: 0.6 },
        ],
        extraFigures: [
          { color: '#664400', pos: [
            { at: 0,   x: 1.12,  state: 'walk',   facing: -1, alpha: 0.85, ease: 'linear' },
            { at: 160, x: 0.832, state: 'reach',  facing: 1,  alpha: 0.85 },
            { at: 215, x: 0.832, state: 'stance', facing: -1, alpha: 0.85 },
          ] },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.60, cy: 0.54 },
          { at: 74, zoom: 1.30, cx: 0.58, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.50, state: 'stance', facing: 1 },
          { at: 58, x: 0.50, state: 'stance', facing: 1, ease: 'settle' },
          { at: 74, x: 0.47, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.75,  state: 'point',  facing: -1 },
          { at: 20, x: 0.75,  state: 'walk',   facing: -1, ease: 'linear' },
          { at: 62, x: 0.675, state: 'stance', facing: -1 },
        ],
        cityOpts: { skyTop: '#1e0600', skyMid: '#2a0c00', skyBot: '#180600' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 1.0, alpha: 0.90 },
          { type: 'smoke', alpha: 0.70 },
        ],
        extraFigures: [
          { color: '#664400', pos: [
            { at: 0,  x: 0.832, state: 'stance', facing: -1, alpha: 0.85 },
            { at: 30, x: 0.832, state: 'walk',   facing: -1, alpha: 0.85, ease: 'linear' },
            { at: 70, x: 0.76,  state: 'stance', facing: -1, alpha: 0.85 },
          ] },
        ],
      },
    ],
  };

  // Chapter 7: The Long Walk
  S[7] = {
    bg: 'city',
    npcColor: '#3ddc84',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.16, cy: 0.62 },
          { at: 60,  zoom: 1.30, cx: 0.22, cy: 0.58 },
          { at: 140, zoom: 1.05, cx: 0.50, cy: 0.46 },
        ],
        playerPos: [
          { at: 0,  x: 0.10, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 56, x: 0.20, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#06101e', skyMid: '#0c1830', skyBot: '#081220' },
        effectsBehind: [
          { type: 'objective_marker', xf: 0.84, yf: 0.38, color: '#44ffaa', alpha: 0.85, startFrame: 50, fadeIn: 40 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.05, cx: 0.50, cy: 0.46 },
          { at: 38,  zoom: 1.25, cx: 0.30, cy: 0.56 },
          { at: 46,  zoom: 1.08, cx: 0.42, cy: 0.52 },
          { at: 200, zoom: 1.16, cx: 0.38, cy: 0.54 },
          { at: 400, zoom: 1.22, cx: 0.28, cy: 0.55 },
        ],
        camShake: [{ at: 40, strength: 14, dur: 22 }],
        playerPos: [
          { at: 0,   x: 0.20,  state: 'walk',   facing: 1, ease: 'linear' },
          { at: 40,  x: 0.272, state: 'hit',    facing: 1 },
          { at: 41,  x: 0.272, state: 'hit',    facing: 1, ease: 'settle' },
          { at: 58,  x: 0.24,  state: 'brace',  facing: 1 },
          { at: 120, x: 0.24,  state: 'look',   facing: 1 },
          { at: 175, x: 0.24,  state: 'stance', facing: 1 },
          { at: 285, x: 0.24,  state: 'look',   facing: -1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#06101e', skyMid: '#0c1830', skyBot: '#081220' },
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.60, startFrame: 38, fadeIn: 10, portals: [
            { xf: 0.44, yf: 0.66, height: 0.20, color: '#aa55ff', a: 0.70 },
            { xf: 0.62, yf: 0.62, height: 0.18, color: '#8833dd', a: 0.55 },
            { xf: 0.76, yf: 0.64, height: 0.22, color: '#bb66ff', a: 0.60 },
          ]},
          { type: 'objective_marker', xf: 0.90, yf: 0.36, color: '#44ffaa', alpha: 0.65 },
        ],
        effects: [
          { type: 'screen_flash', color: '#aa55ff', startFrame: 40, duration: 12, alpha: 0.40 },
          { type: 'shockwave', cx: 0.44, cy: 0.62, color: '#cc88ff', startFrame: 40, duration: 30 },
        ],
        extraFigures: [
          { color: '#665544', pos: [
            { at: 0,   x: 0.62,  state: 'idle', facing: -1, alpha: 0 },
            { at: 60,  x: 0.62,  state: 'walk', facing: -1, alpha: 0,    ease: 'linear' },
            { at: 90,  x: 0.566, state: 'walk', facing: -1, alpha: 0.42, ease: 'linear' },
            { at: 420, x: -0.03, state: 'walk', facing: -1, alpha: 0.42 },
          ] },
          { color: '#556677', pos: [
            { at: 0,   x: 0.76, state: 'look', facing: -1, alpha: 0 },
            { at: 70,  x: 0.76, state: 'look', facing: -1, alpha: 0 },
            { at: 110, x: 0.76, state: 'look', facing: -1, alpha: 0.32 },
          ] },
          { color: '#554433', pos: [
            { at: 0,   x: 0.50,  state: 'idle', facing: 1, alpha: 0 },
            { at: 100, x: 0.50,  state: 'walk', facing: 1, alpha: 0,    ease: 'linear' },
            { at: 130, x: 0.554, state: 'walk', facing: 1, alpha: 0.30, ease: 'linear' },
            { at: 400, x: 1.04,  state: 'walk', facing: 1, alpha: 0.30 },
          ] },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.22, cx: 0.28, cy: 0.55 },
          { at: 40,  zoom: 1.55, cx: 0.26, cy: 0.65 },
          { at: 140, zoom: 1.55, cx: 0.26, cy: 0.65 },
          { at: 210, zoom: 1.05, cx: 0.50, cy: 0.44 },
        ],
        playerPos: [
          { at: 0,   x: 0.24, state: 'look',   facing: -1 },
          { at: 14,  x: 0.24, state: 'listen', facing: 1 },
          { at: 150, x: 0.24, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#06101e', skyMid: '#0c1830', skyBot: '#081220' },
        effects: [
          { type: 'static_noise', alpha: 0.40, duration: 140 },
          { type: 'phone', xf: 0.30, yf: 0.54, alpha: 0.85, duration: 150 },
        ],
        effectsBehind: [
          { type: 'objective_marker', xf: 0.90, yf: 0.36, color: '#44ffaa', alpha: 0.55 },
          { type: 'objective_marker', xf: 0.90, yf: 0.36, color: '#44ffaa', alpha: 0.60, startFrame: 150, fadeIn: 40 },
        ],
        extraFigures: [
          { color: '#556677', pos: [
            { at: 0,   x: 0.76, state: 'look', facing: -1, alpha: 0.32 },
            { at: 120, x: 0.76, state: 'look', facing: -1, alpha: 0 },
          ] },
        ],
        bubbleX: 0.30,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.05, cx: 0.50, cy: 0.44 },
          { at: 110, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.24,  state: 'lookUp', facing: 1 },
          { at: 12,  x: 0.24,  state: 'walk',   facing: 1, ease: 'linear' },
          { at: 110, x: 0.416, state: 'idle',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.90, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#06101e', skyMid: '#0c1830', skyBot: '#081220' },
        effectsBehind: [
          { type: 'objective_marker', xf: 0.90, yf: 0.36, color: '#44ffaa', alpha: 0.95 },
        ],
      },
    ],
  };

  // Chapter 8: Cache Discovery
  S[8] = {
    bg: 'cave',
    npcColor: '#446688',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.35, cx: 0.20, cy: 0.60 },
          { at: 60,  zoom: 1.30, cx: 0.28, cy: 0.58 },
          { at: 104, zoom: 1.15, cx: 0.50, cy: 0.52 }, // open to the door
        ],
        playerPos: [
          { at: 0,  x: 0.16, state: 'walk', facing: 1, ease: 'linear' },
          { at: 78, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'door', xf: 0.62, yf: 0.74, w2: 0.09, h2: 0.40, crack: 0 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.50, cy: 0.52 },
          { at: 100, zoom: 1.45, cx: 0.56, cy: 0.63 },
          { at: 150, zoom: 1.45, cx: 0.56, cy: 0.63 },
          { at: 162, zoom: 1.15, cx: 0.50, cy: 0.52 }, // thrown back by the blast
          { at: 300, zoom: 1.20, cx: 0.52, cy: 0.52 },
        ],
        camShake: [{ at: 150, strength: 16, dur: 24 }],
        playerPos: [
          { at: 0,   x: 0.30, state: 'walk',  facing: 1, ease: 'linear' },
          { at: 100, x: 0.48, state: 'reach', facing: 1 },
          { at: 150, x: 0.48, state: 'hit',   facing: 1, ease: 'settle' },
          { at: 170, x: 0.43, state: 'brace', facing: 1 },
          { at: 240, x: 0.43, state: 'look',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.80, startFrame: 105, fadeIn: 15 },
          { type: 'door_opening', xf: 0.62, yf: 0.74, w2: 0.09, h2: 0.40, openFrames: 30, startFrame: 122 },
          { type: 'speedlines', cx: 0.62, cy: 0.55, count: 20, color: '#4488ff', alpha: 0.60, startFrame: 122, duration: 60, fadeIn: 8 },
        ],
        effects: [
          { type: 'shockwave',    cx: 0.62, cy: 0.65, color: '#88ccff', startFrame: 150, duration: 30 },
          { type: 'impact_sparks', cx: 0.62, cy: 0.58, count: 14, color: '#88ccff', startFrame: 150, duration: 28 },
          { type: 'screen_flash', color: '#88ccff', startFrame: 150, duration: 12, alpha: 0.55 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.52, cy: 0.52 },
          { at: 120, zoom: 1.25, cx: 0.54, cy: 0.54 },
          { at: 140, zoom: 1.50, cx: 0.90, cy: 0.64 }, // snap to the guard
          { at: 176, zoom: 1.50, cx: 0.90, cy: 0.64 },
          { at: 215, zoom: 1.12, cx: 0.62, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.43, state: 'look',   facing: 1 },
          { at: 20,  x: 0.43, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 60,  x: 0.50, state: 'reach',  facing: 1 },
          { at: 150, x: 0.50, state: 'stance', facing: 1, ease: 'settle' },
          { at: 166, x: 0.47, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.82, state: 'crouch', facing: 1,  alpha: 0 },
          { at: 126, x: 0.82, state: 'crouch', facing: 1,  alpha: 0 },
          { at: 142, x: 0.82, state: 'crouch', facing: -1, alpha: 1 },
          { at: 168, x: 0.82, state: 'idle',   facing: -1 },
        ],
        effects: [
          { type: 'cache_items', alpha: 0.92, fadeIn: 35 },
        ],
        effectsBehind: [
          { type: 'door', xf: 0.62, yf: 0.74, w2: 0.09, h2: 0.40, crack: 1 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.12, cx: 0.62, cy: 0.54 },
          { at: 80,  zoom: 1.35, cx: 0.62, cy: 0.60 },
          { at: 160, zoom: 1.45, cx: 0.64, cy: 0.63 },
          { at: 250, zoom: 1.18, cx: 0.56, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.47, state: 'stance', facing: 1 },
          { at: 165, x: 0.47, state: 'stance', facing: 1, ease: 'settle' },
          { at: 180, x: 0.44, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.82, state: 'walk',   facing: -1, ease: 'linear' },
          { at: 78,  x: 0.68, state: 'talk',   facing: -1 },
          { at: 160, x: 0.68, state: 'point',  facing: -1 },
          { at: 250, x: 0.68, state: 'stance', facing: -1 },
        ],
        effectsBehind: [
          { type: 'door', xf: 0.62, yf: 0.74, w2: 0.09, h2: 0.40, crack: 1 },
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.35 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // Chapter 10: The Lava Crossing
  S[10] = {
    bg: 'city',
    npcColor: '#cc4400',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.30 }, // high
          { at: 40,  zoom: 1.10, cx: 0.40, cy: 0.50 },
          { at: 150, zoom: 1.40, cx: 0.28, cy: 0.62 }, // down at the melting floor
          { at: 280, zoom: 1.10, cx: 0.50, cy: 0.55 },
        ],
        camShake: [{ at: 40, strength: 8, dur: 16 }],
        playerPos: [
          { at: 0,   x: 0.04, state: 'run',    facing: 1, ease: 'linear' },
          { at: 40,  x: 0.22, state: 'brace',  facing: 1 },
          { at: 130, x: 0.22, state: 'crouch', facing: 1 },
          { at: 270, x: 0.22, state: 'look',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#200400', skyMid: '#300800', skyBot: '#200400' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 1.0, alpha: 0.92 },
          { type: 'smoke', alpha: 0.80 },
        ],
        effects: [
          { type: 'ground_crack', cx: 0.32, color: '#ff6622', startFrame: 40, duration: 90 },
          { type: 'screen_flash', color: '#ff5511', startFrame: 40, duration: 12, alpha: 0.30 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.55 },
          { at: 90,  zoom: 1.25, cx: 0.72, cy: 0.54 },
          { at: 200, zoom: 1.12, cx: 0.56, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'look',   facing: 1 },
          { at: 20, x: 0.22, state: 'lookUp', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.84, state: 'stance', facing: -1, alpha: 0 },
          { at: 120, x: 0.84, state: 'stance', facing: -1, alpha: 0 },
          { at: 180, x: 0.84, state: 'stance', facing: -1, alpha: 0.55 },
        ],
        cityOpts: { skyTop: '#200400', skyMid: '#300800', skyBot: '#200400' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.85, alpha: 0.85 },
          { type: 'objective_marker', xf: 0.86, yf: 0.33, color: '#ff8844', alpha: 0.85, fadeIn: 30 },
        ],
        effects: [
          { type: 'ground_crack', cx: 0.32, color: '#ff6622', startFrame: -90, duration: 90 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.56, cy: 0.50 },
          { at: 60, zoom: 1.20, cx: 0.55, cy: 0.55 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'lookUp', facing: 1 },
          { at: 10, x: 0.22, state: 'stance', facing: 1 },
          { at: 28, x: 0.22, state: 'run',    facing: 1, ease: 'linear' },
          { at: 52, x: 0.33, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.84, state: 'stance', facing: -1, alpha: 0.55 },
          { at: 40, x: 0.84, state: 'walk',   facing: -1, alpha: 1, ease: 'linear' },
          { at: 80, x: 0.77, state: 'stance', facing: -1 },
        ],
        cityOpts: { skyTop: '#200400', skyMid: '#300800', skyBot: '#200400' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.90, alpha: 0.88 },
          { type: 'smoke', alpha: 0.55 },
          { type: 'objective_marker', xf: 0.86, yf: 0.33, color: '#ff8844', alpha: 0.70 },
        ],
        effects: [
          { type: 'ground_crack', cx: 0.32, color: '#ff6622', startFrame: -90, duration: 90 },
        ],
      },
    ],
  };

  // Chapter 11: The Relay Station
  S[11] = {
    bg: 'fracture',
    npcColor: '#3ddc84',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.16, cy: 0.58 },
          { at: 90,  zoom: 1.10, cx: 0.40, cy: 0.48 },
          { at: 290, zoom: 1.00, cx: 0.50, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,   x: 0.08, state: 'walk',   facing: 1, ease: 'linear' },
          { at: 90,  x: 0.24, state: 'lookUp', facing: 1 },
          { at: 180, x: 0.24, state: 'look',   facing: -1 },
          { at: 250, x: 0.24, state: 'look',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.70, fadeIn: 50, portals: [
            { xf: 0.48, yf: 0.25, height: 0.55, color: '#44aaff', a: 0.80 },
            { xf: 0.66, yf: 0.38, height: 0.32, color: '#88ccff', a: 0.60 },
            { xf: 0.32, yf: 0.42, height: 0.26, color: '#66bbff', a: 0.55 },
            { xf: 0.80, yf: 0.20, height: 0.40, color: '#4499ff', a: 0.65 },
          ]},
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.48 },
          { at: 14, zoom: 1.00, cx: 0.50, cy: 0.48 },
          { at: 90, zoom: 1.35, cx: 0.70, cy: 0.60 },
        ],
        camShake: [{ at: 10, strength: 5, dur: 10 }],
        playerPos: [
          { at: 0,  x: 0.24, state: 'look',   facing: 1 },
          { at: 12, x: 0.24, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'portal', xf: 0.74, yf: 0.34, height: 0.58, color: '#44aaff', alpha: 0.90, fadeIn: 14 },
          { type: 'speedlines', cx: 0.74, cy: 0.42, count: 16, color: '#88ccff', alpha: 0.35, fadeIn: 30 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.70, cy: 0.60 },
          { at: 80, zoom: 1.18, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.24, state: 'stance', facing: 1 },
          { at: 30, x: 0.24, state: 'stance', facing: 1, ease: 'settle' },
          { at: 46, x: 0.21, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.74,  state: 'idle', facing: -1, alpha: 0 },
          { at: 10, x: 0.74,  state: 'walk', facing: -1, alpha: 0, ease: 'linear' },
          { at: 28, x: 0.708, state: 'walk', facing: -1, alpha: 1, ease: 'linear' },
          { at: 55, x: 0.66,  state: 'idle', facing: -1 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.74, yf: 0.34, height: 0.58, color: '#44aaff', alpha: 0.80 },
        ],
        effects: [
          { type: 'screen_flash', color: '#aaddff', startFrame: 10, duration: 10, alpha: 0.35 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.18, cx: 0.50, cy: 0.52 },
          { at: 110, zoom: 1.40, cx: 0.60, cy: 0.62 },
          { at: 172, zoom: 1.14, cx: 0.42, cy: 0.54 },
          { at: 300, zoom: 1.18, cx: 0.42, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.21, state: 'stance', facing: 1 },
          { at: 44,  x: 0.21, state: 'idle',   facing: 1 },
          { at: 168, x: 0.21, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'talk',   facing: -1 },
          { at: 125, x: 0.66, state: 'walk',   facing: -1, ease: 'linear' },
          { at: 165, x: 0.59, state: 'stance', facing: -1 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.74, yf: 0.34, height: 0.58, color: '#44aaff', alpha: 0.60 },
        ],
        bubbleX: 0.66,
      },
    ],
  };

  // Chapter 12: What Veran Knew
  S[12] = {
    bg: 'fracture',
    npcColor: '#3ddc84',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 130, zoom: 1.25, cx: 0.56, cy: 0.54 },
          { at: 200, zoom: 1.30, cx: 0.68, cy: 0.58 },
          { at: 400, zoom: 1.22, cx: 0.54, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'listen', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.68,  state: 'talk',  facing: -1 },
          { at: 130, x: 0.68,  state: 'walk',  facing: 1, ease: 'linear' },
          { at: 160, x: 0.734, state: 'reach', facing: 1 },
          { at: 250, x: 0.734, state: 'talk',  facing: -1 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.88, yf: 0.36, height: 0.50, color: '#ff00cc', alpha: 0.40, startFrame: 160, fadeIn: 40 },
        ],
        bubbleX: 0.68,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.22, cx: 0.54, cy: 0.52 },
          { at: 50,  zoom: 1.50, cx: 0.32, cy: 0.64 },
          { at: 240, zoom: 1.56, cx: 0.31, cy: 0.65 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'listen', facing: 1 },
          { at: 60, x: 0.28, state: 'hands',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.734, state: 'talk',  facing: -1 },
          { at: 12, x: 0.734, state: 'point', facing: -1 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.88, yf: 0.36, height: 0.50, color: '#ff00cc', alpha: 0.40 },
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.80, startFrame: 30, fadeIn: 20 },
        ],
        bubbleX: 0.734,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.50, cx: 0.32, cy: 0.64 },
          { at: 30,  zoom: 1.42, cx: 0.72, cy: 0.62 },
          { at: 120, zoom: 1.20, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'hands', facing: 1 },
          { at: 40, x: 0.28, state: 'look',  facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.734, state: 'talk', facing: -1 },
          { at: 70,  x: 0.734, state: 'look', facing: 1 },
          { at: 110, x: 0.734, state: 'look', facing: -1 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.88, yf: 0.36, height: 0.50, color: '#ff00cc', alpha: 0.55 },
          { type: 'fragment_pulse', color: '#6644ff', alpha: 0.60 },
        ],
        bubbleX: 0.734,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 8,  zoom: 1.05, cx: 0.36, cy: 0.50 },
          { at: 60, zoom: 1.14, cx: 0.34, cy: 0.52 },
        ],
        camShake: [{ at: 8, strength: 20, dur: 30 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',   facing: 1 },
          { at: 8,  x: 0.28, state: 'hit',    facing: 1, ease: 'settle' },
          { at: 26, x: 0.34, state: 'stance', facing: -1 },
        ],
        npcPos: [
          { at: 0,  x: 0.734, state: 'look',   facing: -1 },
          { at: 14, x: 0.734, state: 'stance', facing: -1 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.08, yf: 0.42, height: 0.56, color: '#ff00cc', alpha: 0.90, startFrame: 6, fadeIn: 10 },
          { type: 'sky_bleed', alpha: 0.50 },
          { type: 'speedlines', cx: 0.08, cy: 0.50, count: 24, color: '#ff00cc', alpha: 0.60, startFrame: 8, duration: 50, fadeIn: 8 },
        ],
        effects: [
          { type: 'shockwave',    cx: 0.12, cy: 0.65, color: '#ff44cc', startFrame: 8,  duration: 40 },
          { type: 'impact_sparks', cx: 0.10, cy: 0.55, count: 14, color: '#ff44cc', startFrame: 8, duration: 30 },
          { type: 'screen_flash', color: '#ff00cc', startFrame: 8, duration: 14, alpha: 0.50 },
        ],
        extraFigures: [
          { color: '#aa00ff', pos: [
            { at: 0,  x: 0.09, state: 'idle',   facing: 1, alpha: 0 },
            { at: 34, x: 0.09, state: 'idle',   facing: 1, alpha: 0 },
            { at: 60, x: 0.11, state: 'stance', facing: 1, alpha: 1 },
          ] },
        ],
      },
    ],
  };

  // Chapter 13: Resonance
  S[13] = {
    bg: 'level', level: { ch: 12, x: 3000 },
    npcColor: '#88aacc',
    beats: [
      {
        npcColor: '#aa00ff',
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.30, cx: 0.48, cy: 0.58 },
          { at: 66,  zoom: 1.42, cx: 0.44, cy: 0.62 },
          { at: 76,  zoom: 1.05, cx: 0.50, cy: 0.50 }, // thrown back: he is the source
          { at: 300, zoom: 1.14, cx: 0.46, cy: 0.50 },
        ],
        camShake: [{ at: 20, strength: 5, dur: 8 }, { at: 44, strength: 6, dur: 8 }, { at: 70, strength: 16, dur: 26 }],
        playerPos: [
          { at: 0,   x: 0.44,  state: 'stance', facing: 1 },
          { at: 20,  x: 0.44,  state: 'hit',    facing: 1, ease: 'settle' },
          { at: 34,  x: 0.425, state: 'brace',  facing: 1 },
          { at: 44,  x: 0.425, state: 'hit',    facing: 1, ease: 'settle' },
          { at: 58,  x: 0.41,  state: 'crouch', facing: 1 },
          { at: 70,  x: 0.41,  state: 'attack', facing: 1 },
          { at: 130, x: 0.41,  state: 'brace',  facing: 1 },
          { at: 210, x: 0.41,  state: 'idle',   facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'run',    facing: -1, ease: 'linear' },
          { at: 18,  x: 0.52, state: 'attack', facing: -1 },
          { at: 34,  x: 0.52, state: 'stance', facing: -1 },
          { at: 42,  x: 0.52, state: 'attack', facing: -1 },
          { at: 70,  x: 0.52, state: 'hit',    facing: -1, ease: 'settle' },
          { at: 100, x: 0.80, state: 'fall',   facing: -1, alpha: 1 },
          { at: 150, x: 0.84, state: 'fall',   facing: -1, alpha: 0 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#66ccff', alpha: 0.75, startFrame: 56, fadeIn: 12 },
        ],
        effects: [
          { type: 'impact_sparks', cx: 0.46, cy: 0.54, count: 6,  color: '#ffddaa', startFrame: 20, duration: 16 },
          { type: 'impact_sparks', cx: 0.45, cy: 0.54, count: 6,  color: '#ffddaa', startFrame: 44, duration: 16 },
          { type: 'screen_flash',  color: '#88ddff', startFrame: 70, duration: 14, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.42, cy: 0.60, color: '#66ccff', startFrame: 70, duration: 40 },
          { type: 'impact_sparks', cx: 0.44, cy: 0.52, count: 20, color: '#aaeeff', startFrame: 72, duration: 30 },
          { type: 'speedlines',    cx: 0.42, cy: 0.54, count: 22, color: '#88ddff', alpha: 0.5, startFrame: 70, duration: 46, fadeIn: 4 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.14, cx: 0.46, cy: 0.50 },
          { at: 60, zoom: 1.50, cx: 0.42, cy: 0.64 },
        ],
        playerPos: [
          { at: 0,  x: 0.41, state: 'idle',  facing: 1 },
          { at: 14, x: 0.41, state: 'hands', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.30 }],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.50, cx: 0.42, cy: 0.64 },
          { at: 50,  zoom: 1.15, cx: 0.44, cy: 0.50 },
          { at: 250, zoom: 1.24, cx: 0.43, cy: 0.54 },
        ],
        playerPos: [
          { at: 0,   x: 0.41, state: 'hands',  facing: 1 },
          { at: 40,  x: 0.41, state: 'look',   facing: -1 },
          { at: 110, x: 0.41, state: 'look',   facing: 1 },
          { at: 170, x: 0.41, state: 'listen', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aacc', alpha: 0.45, startFrame: 20, fadeIn: 20 },
          { type: 'static_noise', alpha: 0.16, fadeIn: 25 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.24, cx: 0.43, cy: 0.54 },
          { at: 40,  zoom: 1.10, cx: 0.56, cy: 0.50 },
          { at: 200, zoom: 1.10, cx: 0.56, cy: 0.50 },
          { at: 310, zoom: 1.42, cx: 0.42, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,   x: 0.41, state: 'listen', facing: 1 },
          { at: 300, x: 0.41, state: 'hands',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aacc', alpha: 0.45 },
          { type: 'fragment_pulse', color: '#66ccff', alpha: 0.55, startFrame: 200, fadeIn: 70 },
          { type: 'echo_text', color: '#88aacc', alpha: 0.35 },
        ],
        extraFigures: [
          { color: '#aa00ff', pos: [
            { at: 0,   x: 0.74, state: 'stance', facing: -1, alpha: 0 },
            { at: 30,  x: 0.74, state: 'stance', facing: -1, alpha: 0.26 },
            { at: 50,  x: 0.74, state: 'attack', facing: -1, alpha: 0.26 },
            { at: 95,  x: 0.74, state: 'stance', facing: -1, alpha: 0.26 },
            { at: 130, x: 0.74, state: 'hit',    facing: -1, alpha: 0.26 },
            { at: 190, x: 0.74, state: 'hit',    facing: -1, alpha: 0 },
          ] },
          { color: '#4488ff', pos: [
            { at: 0,   x: 0.66, state: 'stance', facing: 1, alpha: 0 },
            { at: 30,  x: 0.66, state: 'stance', facing: 1, alpha: 0.26 },
            { at: 54,  x: 0.66, state: 'hit',    facing: 1, alpha: 0.26 },
            { at: 95,  x: 0.66, state: 'stance', facing: 1, alpha: 0.26 },
            { at: 120, x: 0.66, state: 'attack', facing: 1, alpha: 0.26 },
            { at: 190, x: 0.66, state: 'attack', facing: 1, alpha: 0 },
          ] },
        ],
        bubbleX: 0.41,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.42, cx: 0.42, cy: 0.62 },
          { at: 80, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.41, state: 'hands', facing: 1 },
          { at: 16, x: 0.41, state: 'look',  facing: -1 },
          { at: 70, x: 0.41, state: 'idle',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#446677', alpha: 0.16 }],
      },
    ],
  };

  // Chapter 14: Coherence
  S[14] = {
    bg: 'level', level: { ch: 11, x: 3000 },
    npcColor: '#88aacc',
    beats: [
      {
        letterbox: true,
        npcColor: '#3ddc84',
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.52 },
          { at: 36,  zoom: 1.20, cx: 0.44, cy: 0.54 },
          { at: 140, zoom: 1.45, cx: 0.34, cy: 0.63 },
        ],
        camShake: [{ at: 36, strength: 14, dur: 20 }],
        playerPos: [
          { at: 0,   x: 0.40, state: 'stance', facing: 1 },
          { at: 36,  x: 0.40, state: 'hit',    facing: 1, ease: 'settle' },
          { at: 60,  x: 0.33, state: 'crouch', facing: 1 },
          { at: 130, x: 0.33, state: 'kneel',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.60, state: 'stance', facing: -1 },
          { at: 22, x: 0.60, state: 'run',    facing: -1, ease: 'linear' },
          { at: 34, x: 0.50, state: 'attack', facing: -1 },
          { at: 90, x: 0.50, state: 'stance', facing: -1 },
        ],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.40 }],
        effects: [
          { type: 'impact_sparks', cx: 0.43, cy: 0.54, count: 12, color: '#ffe0aa', startFrame: 36, duration: 22 },
          { type: 'screen_flash', color: '#88ccee', startFrame: 36, duration: 10, alpha: 0.28 },
        ],
      },
      {
        letterbox: true,
        npcColor: '#3ddc84',
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.45, cx: 0.34, cy: 0.63 },
          { at: 100, zoom: 1.65, cx: 0.33, cy: 0.67 },
        ],
        camShake: [{ at: 26, strength: 6, dur: 14 }],
        playerPos: [
          { at: 0,  x: 0.33, state: 'kneel', facing: 1, alpha: 1 },
          { at: 24, x: 0.33, state: 'kneel', facing: 1, alpha: 1 },
          { at: 30, x: 0.33, state: 'kneel', facing: 1, alpha: 0.35 },
          { at: 40, x: 0.33, state: 'kneel', facing: 1, alpha: 0.90 },
          { at: 52, x: 0.33, state: 'kneel', facing: 1, alpha: 0.30 },
          { at: 70, x: 0.33, state: 'kneel', facing: 1, alpha: 0.75 },
        ],
        npcPos: [
          { at: 0,  x: 0.50, state: 'stance', facing: -1, alpha: 1 },
          { at: 30, x: 0.50, state: 'stance', facing: -1, alpha: 1 },
          { at: 70, x: 0.50, state: 'stance', facing: -1, alpha: 0.18 },
        ],
        effectsBehind: [{ type: 'fragment_pulse', color: '#335566', alpha: 0.22 }],
        effects: [{ type: 'static_noise', alpha: 0.24, startFrame: 24 }],
      },
      {
        letterbox: true,
        npcColor: '#3ddc84',
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.65, cx: 0.33, cy: 0.67 },
          { at: 100, zoom: 1.55, cx: 0.34, cy: 0.65 },
        ],
        playerPos: [{ at: 0, x: 0.33, state: 'kneel', facing: 1, alpha: 0.75 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'stance', facing: -1, alpha: 0.18 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aacc', alpha: 0.42, fadeIn: 18 },
          { type: 'static_noise', alpha: 0.14 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.55, cx: 0.34, cy: 0.65 },
          { at: 200, zoom: 1.25, cx: 0.36, cy: 0.54 },
          { at: 330, zoom: 1.30, cx: 0.36, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,   x: 0.33, state: 'kneel',  facing: 1, alpha: 0.75 },
          { at: 120, x: 0.33, state: 'kneel',  facing: 1, alpha: 0.55 },
          { at: 240, x: 0.33, state: 'kneel',  facing: 1, alpha: 0.70 },
          { at: 300, x: 0.33, state: 'kneel',  facing: 1, alpha: 1 },
          { at: 330, x: 0.33, state: 'crouch', facing: 1, alpha: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#88aacc', alpha: 0.42 },
          { type: 'echo_text', color: '#88aacc', alpha: 0.32 },
        ],
        extraFigures: [
          { color: '#3ddc84', pos: [{ at: 0, x: 0.50, state: 'stance', facing: -1, alpha: 0.18 }] },
          { color: '#4488ff', pos: [
            { at: 0,   x: 0.33, state: 'kneel', facing: 1, alpha: 0,    ease: 'smooth' },
            { at: 60,  x: 0.33, state: 'kneel', facing: 1, alpha: 0.22, ease: 'smooth' },
            { at: 200, x: 0.39, state: 'kneel', facing: 1, alpha: 0.22, ease: 'smooth' },
            { at: 300, x: 0.33, state: 'kneel', facing: 1, alpha: 0,    ease: 'smooth' },
          ] },
          { color: '#4488ff', pos: [
            { at: 0,   x: 0.33, state: 'kneel', facing: 1, alpha: 0,    ease: 'smooth' },
            { at: 60,  x: 0.33, state: 'kneel', facing: 1, alpha: 0.22, ease: 'smooth' },
            { at: 200, x: 0.27, state: 'kneel', facing: 1, alpha: 0.22, ease: 'smooth' },
            { at: 300, x: 0.33, state: 'kneel', facing: 1, alpha: 0,    ease: 'smooth' },
          ] },
        ],
        bubbleX: 0.33,
      },
      {
        letterbox: true,
        npcColor: '#3ddc84',
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.36, cy: 0.58 },
          { at: 90, zoom: 1.08, cx: 0.44, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.33, state: 'crouch', facing: 1 },
          { at: 24, x: 0.33, state: 'idle',   facing: 1 },
          { at: 70, x: 0.33, state: 'stance', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.50, state: 'stance', facing: -1, alpha: 0.18 },
          { at: 40, x: 0.50, state: 'stance', facing: -1, alpha: 1 },
        ],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.50, fadeIn: 22 }],
      },
    ],
  };

  // Chapter 15: Phase
  S[15] = {
    bg: 'level', level: { ch: 12, x: 3950 },
    npcColor: '#88aacc',
    beats: [
      {
        npcColor: '#aa00ff',
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.48, cy: 0.50 },
          { at: 36,  zoom: 1.45, cx: 0.43, cy: 0.63 },
          { at: 70,  zoom: 1.45, cx: 0.43, cy: 0.63 },
          { at: 180, zoom: 1.15, cx: 0.40, cy: 0.52 },
          { at: 400, zoom: 1.22, cx: 0.36, cy: 0.52 },
        ],
        camShake: [{ at: 40, strength: 4, dur: 10 }],
        playerPos: [
          { at: 0,   x: 0.42,  state: 'stance', facing: 1,  alpha: 1 },
          { at: 26,  x: 0.42,  state: 'brace',  facing: 1,  alpha: 1 },
          { at: 36,  x: 0.42,  state: 'brace',  facing: 1,  alpha: 1,    ease: 'smooth' },
          { at: 40,  x: 0.405, state: 'brace',  facing: 1,  alpha: 0.30, ease: 'smooth' },
          { at: 54,  x: 0.405, state: 'brace',  facing: 1,  alpha: 0.30, ease: 'smooth' },
          { at: 62,  x: 0.42,  state: 'brace',  facing: 1,  alpha: 1 },
          { at: 96,  x: 0.42,  state: 'hands',  facing: 1 },
          { at: 190, x: 0.42,  state: 'look',   facing: -1 },
          { at: 270, x: 0.42,  state: 'walk',   facing: -1, ease: 'linear' },
          { at: 310, x: 0.35,  state: 'crouch', facing: -1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'run',    facing: -1, ease: 'linear' },
          { at: 34,  x: 0.47, state: 'attack', facing: -1, ease: 'linear' },
          { at: 62,  x: 0.33, state: 'crouch', facing: -1, alpha: 1 },
          { at: 170, x: 0.33, state: 'crouch', facing: -1, alpha: 1 },
          { at: 250, x: 0.33, state: 'crouch', facing: -1, alpha: 0 },
        ],
        effectsBehind: [{ type: 'static_noise', alpha: 0.20, startFrame: 36, duration: 30 }],
        effects: [{ type: 'screen_flash', color: '#88ccee', startFrame: 40, duration: 10, alpha: 0.30 }],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.35, cy: 0.52 },
          { at: 80, zoom: 1.40, cx: 0.35, cy: 0.62 },
        ],
        playerPos: [
          { at: 0,  x: 0.35, state: 'crouch', facing: -1 },
          { at: 14, x: 0.35, state: 'lookUp', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#88aacc', alpha: 0.44, fadeIn: 16 }],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.35, cy: 0.62 },
          { at: 60,  zoom: 1.12, cx: 0.58, cy: 0.50 },
          { at: 320, zoom: 1.12, cx: 0.58, cy: 0.50 },
          { at: 360, zoom: 1.40, cx: 0.35, cy: 0.62 },
        ],
        camShake: [{ at: 340, strength: 5, dur: 10 }],
        playerPos: [
          { at: 0,   x: 0.35, state: 'lookUp', facing: 1 },
          { at: 30,  x: 0.35, state: 'listen', facing: 1 },
          { at: 340, x: 0.35, state: 'hit',    facing: 1 },
          { at: 372, x: 0.35, state: 'hands',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'echo_text', color: '#88aacc', alpha: 0.34 },
          { type: 'fragment_pulse', color: '#88aacc', alpha: 0.40 },
        ],
        effects: [
          { type: 'impact_sparks', cx: 0.37, cy: 0.52, count: 5, color: '#ffddaa', startFrame: 340, duration: 16 },
        ],
        extraFigures: [
          { color: '#4488ff', pos: [
            { at: 0,   x: 0.68,  state: 'brace', facing: 1, alpha: 0,    ease: 'smooth' },
            { at: 50,  x: 0.68,  state: 'brace', facing: 1, alpha: 0.28, ease: 'smooth' },
            { at: 150, x: 0.68,  state: 'brace', facing: 1, alpha: 0.28, ease: 'smooth' },
            { at: 160, x: 0.665, state: 'brace', facing: 1, alpha: 0.10, ease: 'smooth' },
            { at: 196, x: 0.665, state: 'brace', facing: 1, alpha: 0.10, ease: 'smooth' },
            { at: 206, x: 0.68,  state: 'brace', facing: 1, alpha: 0.28, ease: 'smooth' },
            { at: 300, x: 0.68,  state: 'brace', facing: 1, alpha: 0.28, ease: 'smooth' },
            { at: 340, x: 0.68,  state: 'brace', facing: 1, alpha: 0,    ease: 'smooth' },
          ] },
          { color: '#88ccee', pos: [
            { at: 0,   x: 0.68,  state: 'brace', facing: 1, alpha: 0,    ease: 'smooth' },
            { at: 150, x: 0.68,  state: 'brace', facing: 1, alpha: 0,    ease: 'smooth' },
            { at: 160, x: 0.705, state: 'brace', facing: 1, alpha: 0.26, ease: 'smooth' },
            { at: 196, x: 0.705, state: 'brace', facing: 1, alpha: 0.26, ease: 'smooth' },
            { at: 206, x: 0.68,  state: 'brace', facing: 1, alpha: 0,    ease: 'smooth' },
          ] },
          { color: '#aa00ff', pos: [
            { at: 0,   x: 0.92, state: 'stance', facing: -1, alpha: 0 },
            { at: 60,  x: 0.92, state: 'stance', facing: -1, alpha: 0.28 },
            { at: 120, x: 0.92, state: 'run',    facing: -1, alpha: 0.28, ease: 'linear' },
            { at: 160, x: 0.73, state: 'attack', facing: -1, alpha: 0.28, ease: 'linear' },
            { at: 200, x: 0.60, state: 'crouch', facing: -1, alpha: 0.28 },
            { at: 300, x: 0.60, state: 'crouch', facing: -1, alpha: 0.28 },
            { at: 340, x: 0.60, state: 'crouch', facing: -1, alpha: 0 },
          ] },
        ],
        bubbleX: 0.35,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.35, cy: 0.62 },
          { at: 160, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.35, state: 'hands',  facing: 1 },
          { at: 30,  x: 0.35, state: 'look',   facing: -1 },
          { at: 100, x: 0.35, state: 'look',   facing: 1 },
          { at: 150, x: 0.35, state: 'stance', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
    ],
  };

  // Chapter 16: The Weight of Other Hands
  S[16] = {
    bg: 'level', level: { ch: 12, x: 1160 },
    npcColor: '#3ddc84',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 120, zoom: 1.22, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,   x: 0.22, state: 'walk', facing: 1, ease: 'linear' },
          { at: 66,  x: 0.34, state: 'talk', facing: 1 },
          { at: 130, x: 0.34, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.66, state: 'reach',  facing: 1 },
          { at: 112, x: 0.66, state: 'listen', facing: -1 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.22, cx: 0.50, cy: 0.52 },
          { at: 60, zoom: 1.32, cx: 0.60, cy: 0.59 },
          { at: 78, zoom: 1.32, cx: 0.60, cy: 0.59 },
          { at: 88, zoom: 1.40, cx: 0.38, cy: 0.62 },
        ],
        camShake: [{ at: 78, strength: 9, dur: 16 }],
        playerPos: [
          { at: 0,   x: 0.34, state: 'listen', facing: 1 },
          { at: 78,  x: 0.34, state: 'hit',    facing: 1 },
          { at: 104, x: 0.34, state: 'hands',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.66, state: 'talk', facing: -1 },
          { at: 78, x: 0.66, state: 'look', facing: -1, ease: 'settle' },
          { at: 96, x: 0.69, state: 'look', facing: -1 },
        ],
        effectsBehind: [{ type: 'fragment_pulse', color: '#88aacc', alpha: 0.70, startFrame: 76, fadeIn: 5 }],
        effects: [{ type: 'screen_flash', color: '#aaccee', startFrame: 78, duration: 12, alpha: 0.30 }],
        bubbleX: 0.66,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.40, cx: 0.38, cy: 0.62 },
          { at: 100, zoom: 1.55, cx: 0.36, cy: 0.65 },
        ],
        playerPos: [{ at: 0, x: 0.34, state: 'hands', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.69, state: 'look',  facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#88aacc', alpha: 0.50 }],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.55, cx: 0.36, cy: 0.65 },
          { at: 85, zoom: 1.20, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.34, state: 'hands', facing: 1 },
          { at: 30, x: 0.34, state: 'idle',  facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.69, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#88aacc', alpha: 0.30 }],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 50,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 120, zoom: 1.15, cx: 0.30, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos: [
          { at: 0,   x: 0.69, state: 'listen', facing: -1 },
          { at: 110, x: 0.69, state: 'look',   facing: -1 },
        ],
        effectsBehind: [
          { type: 'echo_text', color: '#88aacc', alpha: 0.38 },
          { type: 'fragment_pulse', color: '#88aacc', alpha: 0.52 },
        ],
        extraFigures: [
          { color: '#7788aa', pos: [{ at: 0, x: 0.06, state: 'idle', facing: 1, alpha: 0 }, { at: 50, x: 0.06, state: 'idle', facing: 1, alpha: 0 }, { at: 110, x: 0.06, state: 'idle', facing: 1, alpha: 0.20 }] },
          { color: '#8877aa', pos: [{ at: 0, x: 0.11, state: 'idle', facing: 1, alpha: 0 }, { at: 56, x: 0.11, state: 'idle', facing: 1, alpha: 0 }, { at: 116, x: 0.11, state: 'idle', facing: 1, alpha: 0.22 }] },
          { color: '#6699aa', pos: [{ at: 0, x: 0.16, state: 'idle', facing: 1, alpha: 0 }, { at: 62, x: 0.16, state: 'idle', facing: 1, alpha: 0 }, { at: 122, x: 0.16, state: 'idle', facing: 1, alpha: 0.24 }] },
          { color: '#99889a', pos: [{ at: 0, x: 0.21, state: 'idle', facing: 1, alpha: 0 }, { at: 68, x: 0.21, state: 'idle', facing: 1, alpha: 0 }, { at: 128, x: 0.21, state: 'idle', facing: 1, alpha: 0.26 }] },
          { color: '#66ccff', pos: [{ at: 0, x: 0.26, state: 'idle', facing: 1, alpha: 0 }, { at: 74, x: 0.26, state: 'idle', facing: 1, alpha: 0 }, { at: 134, x: 0.26, state: 'idle', facing: 1, alpha: 0.30 }] },
        ],
        bubbleX: 0.34,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,   zoom: 1.15, cx: 0.30, cy: 0.50 },
          { at: 200, zoom: 1.22, cx: 0.26, cy: 0.52 },
          { at: 290, zoom: 1.50, cx: 0.34, cy: 0.64 },
          { at: 520, zoom: 1.42, cx: 0.36, cy: 0.62 },
          { at: 800, zoom: 1.30, cx: 0.40, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,   x: 0.34, state: 'listen', facing: 1 },
          { at: 280, x: 0.34, state: 'stance', facing: 1 },
          { at: 520, x: 0.34, state: 'hands',  facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.69, state: 'look',   facing: -1 },
          { at: 300, x: 0.69, state: 'listen', facing: -1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6688aa', alpha: 0.60 },
          { type: 'static_noise', alpha: 0.12 },
        ],
        extraFigures: [
          { color: '#7788aa', pos: [{ at: 0, x: 0.06, state: 'idle', facing: 1, alpha: 0.20 }, { at: 30,  x: 0.06, state: 'kneel', facing: 1, alpha: 0.20 }, { at: 70,  x: 0.06, state: 'fall', facing: 1, alpha: 0.20 }, { at: 110, x: 0.06, state: 'fall', facing: 1, alpha: 0 }] },
          { color: '#8877aa', pos: [{ at: 0, x: 0.11, state: 'idle', facing: 1, alpha: 0.22 }, { at: 70,  x: 0.11, state: 'kneel', facing: 1, alpha: 0.22 }, { at: 110, x: 0.11, state: 'fall', facing: 1, alpha: 0.22 }, { at: 150, x: 0.11, state: 'fall', facing: 1, alpha: 0 }] },
          { color: '#6699aa', pos: [{ at: 0, x: 0.16, state: 'idle', facing: 1, alpha: 0.24 }, { at: 110, x: 0.16, state: 'kneel', facing: 1, alpha: 0.24 }, { at: 150, x: 0.16, state: 'fall', facing: 1, alpha: 0.24 }, { at: 190, x: 0.16, state: 'fall', facing: 1, alpha: 0 }] },
          { color: '#99889a', pos: [{ at: 0, x: 0.21, state: 'idle', facing: 1, alpha: 0.26 }, { at: 150, x: 0.21, state: 'kneel', facing: 1, alpha: 0.26 }, { at: 190, x: 0.21, state: 'fall', facing: 1, alpha: 0.26 }, { at: 230, x: 0.21, state: 'fall', facing: 1, alpha: 0 }] },
          { color: '#66ccff', pos: [
            { at: 0,   x: 0.26, state: 'idle',   facing: 1, alpha: 0.30 },
            { at: 230, x: 0.26, state: 'walk',   facing: 1, alpha: 0.30, ease: 'linear' },
            { at: 274, x: 0.34, state: 'stance', facing: 1, alpha: 0.34 },
            { at: 320, x: 0.34, state: 'stance', facing: 1, alpha: 0.34 },
            { at: 400, x: 0.34, state: 'stance', facing: 1, alpha: 0 },
          ] },
        ],
        bubbleX: 0.34,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.42, cx: 0.68, cy: 0.62 },
          { at: 90, zoom: 1.50, cx: 0.69, cy: 0.64 },
        ],
        playerPos: [{ at: 0, x: 0.34, state: 'hands', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.69, state: 'look', facing: -1 },
          { at: 20, x: 0.69, state: 'idle', facing: -1 },
        ],
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.50, cx: 0.69, cy: 0.64 },
          { at: 90, zoom: 1.30, cx: 0.58, cy: 0.58 },
        ],
        playerPos: [
          { at: 0,  x: 0.34, state: 'hands', facing: 1 },
          { at: 30, x: 0.34, state: 'look',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.69, state: 'talk', facing: -1 },
          { at: 50, x: 0.69, state: 'idle', facing: -1 },
        ],
        bubbleX: 0.69,
      },
      {
        letterbox: true,
        transition: 'none',
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.58, cy: 0.58 },
          { at: 80, zoom: 1.00, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.34, state: 'look', facing: 1 },
          { at: 20, x: 0.34, state: 'idle', facing: -1 },
        ],
        npcPos: [{ at: 0, x: 0.69, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#6688aa', alpha: 0.20 }],
        extraFigures: [
          { color: '#66ccff', pos: [{ at: 0, x: 0.22, state: 'idle', facing: 1, alpha: 0 }, { at: 30, x: 0.22, state: 'idle', facing: 1, alpha: 0 }, { at: 80, x: 0.22, state: 'idle', facing: 1, alpha: 0.16 }] },
        ],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
