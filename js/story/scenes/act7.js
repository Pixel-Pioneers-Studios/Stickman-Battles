'use strict';
// Cinematic scene specs for act7.
// Merged into window.STORY_SCENE_SPECS. Must load before js/smb-story-narrative-scene.js.
// Chapter ids: 155, 157, 159, 161, 163, 165, 166, 170, 171

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // Chapter 155: The Figure on the Ridge
  // Sparring on the descent, and the admission: he was the figure on the ridge.
  S[155] = {
    bg: 'level', level: { ch: 156, x: 3600 },
    npcColor: '#bb99cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.62, state: 'guard', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.56, cy: 0.50 }, { at: 60, zoom: 1.16, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.62, state: 'talk',   facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.60, cy: 0.50 }, { at: 70, zoom: 1.28, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.62, state: 'talk', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.38 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.50, cy: 0.50 }, { at: 40, zoom: 1.02, cx: 0.50, cy: 0.52 }],
        camShake: [{ at: 20, strength: 9, dur: 26 }],
        playerPos: [{ at: 0, x: 0.40, state: 'hit',   facing: 1 }, { at: 40, x: 0.38, state: 'kneel', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'attack', facing: -1 }, { at: 40, x: 0.60, state: 'idle', facing: -1 }],
        effects: [{ type: 'impact_sparks', cx: 0.46, cy: 0.52, count: 16, color: '#cc99ee', startFrame: 18, duration: 28 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.50, cy: 0.52 }, { at: 60, zoom: 1.22, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'kneel', facing: 1 }, { at: 45, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'reach', facing: -1 }, { at: 45, x: 0.58, state: 'talk', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.50, cy: 0.50 }, { at: 40, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 26, strength: 7, dur: 20 }],
        playerPos: [{ at: 0, x: 0.40, state: 'attack', facing: 1 }, { at: 40, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'hit',    facing: -1 }, { at: 40, x: 0.60, state: 'idle', facing: -1 }],
        effects: [{ type: 'impact_sparks', cx: 0.52, cy: 0.52, count: 14, color: '#88ddff', startFrame: 24, duration: 26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.90, cx: 0.52, cy: 0.58 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.20 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.52, cy: 0.58 }, { at: 60, zoom: 1.34, cx: 0.60, cy: 0.48 }],
        camShake: [{ at: 30, strength: 4, dur: 30 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#8866aa', alpha: 0.28 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.60, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.44, cy: 0.48 }, { at: 70, zoom: 1.46, cx: 0.40, cy: 0.47 }],
        camShake: [{ at: 10, strength: 6, dur: 30 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.18 }],
        effects: [{ type: 'screen_flash', color: '#cc99ee', startFrame: 8, duration: 14, alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.46, cx: 0.40, cy: 0.47 }, { at: 90, zoom: 0.94, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: 1 }],
      },
    ],
  };

  // Chapter 157: God's Threshold
  // The domain acknowledges Kael and refuses to see Axiom.
  S[157] = {
    bg: 'level', level: { ch: 158, x: 450 },
    npcColor: '#ffe8bb',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.46 }, { at: 90, zoom: 0.98, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'walk', facing: 1 }, { at: 70, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.56, state: 'walk', facing: 1 }, { at: 70, x: 0.58, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.98, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.98, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.38 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.20, fadeIn: 40 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.38 }, { at: 80, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle',   facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#ddaa44', alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 30, zoom: 1.18, cx: 0.44, cy: 0.48 }],
        camShake: [{ at: 24, strength: 7, dur: 26 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'look', facing: 1 }],
        effects: [{ type: 'screen_flash', color: '#ffdd99', startFrame: 24, duration: 16, alpha: 0.34 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.40, cy: 0.48 }, { at: 70, zoom: 1.34, cx: 0.38, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.75 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffcc88', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.52, cy: 0.48 }, { at: 70, zoom: 1.20, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.45 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.58, cy: 0.50 }, { at: 60, zoom: 1.38, cx: 0.60, cy: 0.49 }],
        camShake: [{ at: 30, strength: 5, dur: 30 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'guard', facing: 1, alpha: 0.85 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.38, cx: 0.60, cy: 0.49 }, { at: 90, zoom: 0.86, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 20, strength: 6, dur: 50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'guard', facing: 1 }],
        effectsBehind: [
          { type: 'sky_cracks', color: '#ffcc88', alpha: 0.30, fadeIn: 30 },
          { type: 'multi_portals', color: '#ffddaa', alpha: 0.22, count: 5 },
        ],
      },
    ],
  };

  // Chapter 159: What You Are
  // God speaks through structure, not words.
  S[159] = {
    bg: 'level', level: { ch: 158, x: 3000 },
    npcColor: '#ffe8bb',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.86, cx: 0.50, cy: 0.42 }, { at: 90, zoom: 0.94, cx: 0.50, cy: 0.48 }],
        camShake: [{ at: 0, strength: 3, dur: 90 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.22 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.48 }, { at: 80, zoom: 0.88, cx: 0.50, cy: 0.60 }],
        camShake: [{ at: 20, strength: 5, dur: 60 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'ground_crack', color: '#ffcc88', alpha: 0.30, fadeIn: 30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.60 }, { at: 80, zoom: 1.20, cx: 0.40, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.7 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffcc88', alpha: 0.36 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.40, cy: 0.49 }, { at: 80, zoom: 1.34, cx: 0.38, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.55 }],
        effectsBehind: [{ type: 'echo_text', color: '#ddaa44', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.52, cy: 0.48 }, { at: 70, zoom: 1.16, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.5 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.14 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.58, cy: 0.50 }, { at: 80, zoom: 1.30, cx: 0.60, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.8 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.49 }, { at: 90, zoom: 0.92, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.84, cx: 0.50, cy: 0.40 }],
        playerPos: [{ at: 0, x: 0.38, state: 'walk', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'walk', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.26 }],
      },
    ],
  };

  // Chapter 161: God
  // God places itself between Axiom and the far side. Kael stands with him.
  S[161] = {
    bg: 'level', level: { ch: 160, x: 3300 },
    npcColor: '#ffe8bb',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.42 }, { at: 90, zoom: 0.92, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.48 }, { at: 80, zoom: 1.00, cx: 0.72, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.34, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'objective_marker', cx: 0.84, cy: 0.56, color: '#8888ff', startFrame: 30, duration: 90 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.72, cy: 0.52 }, { at: 24, zoom: 0.86, cx: 0.56, cy: 0.44 }],
        camShake: [{ at: 18, strength: 14, dur: 40 }],
        playerPos: [{ at: 0, x: 0.34, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'guard', facing: 1 }],
        effects: [
          { type: 'screen_flash', color: '#ffdd99', startFrame: 18, duration: 20, alpha: 0.50 },
          { type: 'shockwave',    cx: 0.62, cy: 0.56, color: '#ffcc88', startFrame: 18, duration: 50 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.86, cx: 0.56, cy: 0.44 }, { at: 80, zoom: 0.94, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#ffcc88', alpha: 0.28 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.58, cy: 0.50 }, { at: 60, zoom: 1.10, cx: 0.62, cy: 0.50 }],
        camShake: [{ at: 10, strength: 6, dur: 30 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#ddaa44', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.28, cx: 0.50, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'talk',   facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.50, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.50, cy: 0.49 }, { at: 80, zoom: 0.90, cx: 0.54, cy: 0.46 }],
        camShake: [{ at: 20, strength: 7, dur: 50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1, alpha: 0.7 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.20 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.54, cy: 0.46 }, { at: 80, zoom: 1.04, cx: 0.70, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'look', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.56, cy: 0.50 }, { at: 70, zoom: 1.32, cx: 0.52, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'talk',   facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#bb99cc', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.52, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.52, cy: 0.49 }, { at: 90, zoom: 0.86, cx: 0.52, cy: 0.44 }],
        camShake: [{ at: 30, strength: 4, dur: 60 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#ffcc88', alpha: 0.32 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.86, cx: 0.52, cy: 0.44 }, { at: 70, zoom: 1.10, cx: 0.46, cy: 0.50 }],
        playerPos: [
          { at: 0,  x: 0.34, state: 'idle', facing: 1 },
          { at: 30, x: 0.42, state: 'walk', facing: 1 },
          { at: 60, x: 0.44, state: 'guard', facing: 1 },
        ],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }, { at: 60, x: 0.52, state: 'guard', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.50, fadeIn: 30 }],
        effects: [{ type: 'screen_flash', color: '#88ddff', startFrame: 58, duration: 18, alpha: 0.26 }],
      },
    ],
  };

  // Chapter 163: The Lab
  // Three minutes too late. The fusion completes as he comes through the door.
  S[163] = {
    bg: 'level', level: { ch: 67, x: 1500 },
    npcColor: '#cc99ff',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 0.92, cx: 0.50, cy: 0.42 }],
        playerPos: [{ at: 0, x: 0.36, state: 'walk', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.12 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.42 }, { at: 80, zoom: 1.04, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'run', facing: 1 }],
        effectsBehind: [{ type: 'multi_portals', color: '#8888ff', alpha: 0.24, count: 4 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.56, cy: 0.50 }, { at: 60, zoom: 0.88, cx: 0.50, cy: 0.46 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'door', xf: 0.66, yf: 0.52, color: '#886699', alpha: 0.8 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.46 }, { at: 50, zoom: 1.22, cx: 0.40, cy: 0.49 }],
        camShake: [{ at: 30, strength: 5, dur: 26 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }, { at: 40, x: 0.36, state: 'hit', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.20 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.40, cy: 0.49 }, { at: 80, zoom: 0.86, cx: 0.56, cy: 0.46 }],
        playerPos: [{ at: 0, x: 0.36, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, alpha: 0.5, scale: 1.2 }],
        effectsBehind: [{ type: 'cache_items', color: '#886699', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.86, cx: 0.56, cy: 0.46 }, { at: 30, zoom: 1.14, cx: 0.64, cy: 0.48 }],
        camShake: [{ at: 22, strength: 16, dur: 44 }],
        playerPos: [{ at: 0, x: 0.36, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, alpha: 0.85, scale: 1.25 }],
        effects: [
          { type: 'screen_flash',  color: '#ddaaff', startFrame: 22, duration: 24, alpha: 0.65 },
          { type: 'energy_burst',  cx: 0.64, cy: 0.50, color: '#cc99ff', startFrame: 22, duration: 46 },
          { type: 'shockwave',     cx: 0.64, cy: 0.54, color: '#cc99ff', startFrame: 24, duration: 54 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.64, cy: 0.48 }, { at: 70, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, scale: 1.25 }],
        effectsBehind: [{ type: 'echo_text', color: '#cc44ff', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.44, cy: 0.50 }, { at: 60, zoom: 1.20, cx: 0.40, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float',  facing: -1, scale: 1.25 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.40, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, scale: 1.25 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.56, cy: 0.48 }, { at: 60, zoom: 0.84, cx: 0.62, cy: 0.42 }],
        camShake: [{ at: 10, strength: 10, dur: 44 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, scale: 1.35 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#cc99ff', alpha: 0.34 }],
        effects: [{ type: 'screen_flash', color: '#ddaaff', startFrame: 10, duration: 18, alpha: 0.34 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.84, cx: 0.62, cy: 0.42 }, { at: 80, zoom: 1.30, cx: 0.60, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, scale: 1.35 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#cc99ff', alpha: 0.44 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.48 }, { at: 90, zoom: 0.92, cx: 0.50, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: 1, scale: 1.35, alpha: 1.0 }, { at: 70, x: 0.86, state: 'float', facing: 1, scale: 1.35, alpha: 0.0 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.52 }, { at: 70, zoom: 1.10, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        extraFigures: [{ xf: 0.66, color: '#8888ff', facing: -1, state: 'idle', alpha: 0.75 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.60, cy: 0.50 }, { at: 80, zoom: 0.90, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        extraFigures: [{ xf: 0.66, color: '#8888ff', facing: -1, state: 'idle', alpha: 0.70 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.56, cy: 0.50 }, { at: 60, zoom: 1.36, cx: 0.40, cy: 0.48 }],
        camShake: [{ at: 50, strength: 5, dur: 24 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        extraFigures: [{ xf: 0.66, color: '#8888ff', facing: -1, state: 'point', alpha: 0.75 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.40 }],
      },
    ],
  };

  // Chapter 165: The Seam
  // Calix is a voice through the compass, so there is no figure.
  S[165] = {
    bg: 'level', level: { ch: 67, x: 2100 },
    npcColor: '#66ccaa',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.44, cy: 0.50 }, { at: 70, zoom: 1.24, cx: 0.42, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }, { at: 40, x: 0.40, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.22 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.42, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#66ccaa', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.42, cy: 0.50 }, { at: 70, zoom: 0.88, cx: 0.50, cy: 0.44 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.44 }, { at: 60, zoom: 1.18, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        effects: [{ type: 'objective_marker', cx: 0.62, cy: 0.48, color: '#66ccaa', startFrame: 24, duration: 80 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'guard', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.52, cy: 0.50 }, { at: 50, zoom: 1.30, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#446688', alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.49 }, { at: 70, zoom: 1.12, cx: 0.48, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.18 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.48, cy: 0.50 }, { at: 80, zoom: 0.94, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.40, state: 'guard', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.22 }],
      },
    ],
  };

  // Chapter 166: The Voice Inside
  // God's domain rewritten, with Axiom's cadence pressed out of it.
  S[166] = {
    bg: 'level', level: { ch: 168, x: 600 },
    npcColor: '#cc99ff',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.84, cx: 0.50, cy: 0.42 }, { at: 90, zoom: 0.94, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.36, state: 'walk', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#cc99ff', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.48 }, { at: 80, zoom: 0.86, cx: 0.50, cy: 0.40 }],
        playerPos: [{ at: 0, x: 0.36, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'multi_portals', color: '#cc99ff', alpha: 0.22, count: 5 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.86, cx: 0.50, cy: 0.40 }, { at: 90, zoom: 1.00, cx: 0.56, cy: 0.50 }],
        camShake: [{ at: 30, strength: 4, dur: 60 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#cc99ff', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.56, cy: 0.50 }, { at: 70, zoom: 1.16, cx: 0.62, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, scale: 1.3, alpha: 0.85 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#cc99ff', alpha: 0.40 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.62, cy: 0.49 }, { at: 60, zoom: 1.34, cx: 0.66, cy: 0.48 }],
        camShake: [{ at: 20, strength: 6, dur: 30 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, scale: 1.3 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.66, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.3 }],
        effectsBehind: [{ type: 'echo_text', color: '#cc99ff', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.66, cy: 0.48 }, { at: 80, zoom: 1.10, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, scale: 1.3 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.20 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.52, cy: 0.50 }, { at: 70, zoom: 1.40, cx: 0.64, cy: 0.48 }],
        camShake: [{ at: 20, strength: 8, dur: 40 }],
        playerPos: [{ at: 0, x: 0.36, state: 'look',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, scale: 1.3, alpha: 0.7 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#bb99cc', alpha: 0.44 },
          { type: 'static_noise', alpha: 0.26 },
        ],
        effects: [{ type: 'screen_flash', color: '#bb99cc', startFrame: 20, duration: 14, alpha: 0.28 }],
      },
    ],
  };

  // Chapter 170: Peak Form
  S[170] = {
    bg: 'level', level: { ch: 168, x: 3900 },
    npcColor: '#cc99ff',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.46, cy: 0.50 }, { at: 80, zoom: 1.24, cx: 0.42, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.46 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.42, cy: 0.49 }, { at: 80, zoom: 0.90, cx: 0.50, cy: 0.46 }],
        camShake: [{ at: 20, strength: 5, dur: 50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'guard', facing: 1 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#cc99ff', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.50, cy: 0.46 }, { at: 90, zoom: 1.14, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.52 }],
        effects: [{ type: 'energy_burst', cx: 0.44, cy: 0.52, color: '#88ddff', startFrame: 40, duration: 40 }],
      },
    ],
  };

  // Chapter 171: After Everything
  S[171] = {
    bg: 'level', level: { ch: 168, x: 3700 },
    npcColor: '#bb99cc',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.46 }, { at: 90, zoom: 0.98, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.08 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.98, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 1.18, cx: 0.54, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'talk',   facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'listen', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.88, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.26 }],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
