'use strict';
// js/story/scenes/act7.js — cinematic scene specs for act7.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 9 specs — chapter ids: 155, 157, 159, 161, 163, 165, 166, 170, 171

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ── Chapter 155 — The Figure on the Ridge (12 beats) ────────────────────────
  // Sparring on the descent, and the admission: he was the figure on the ridge.
  S[155] = {
    // The descent, further down the substrate (ch156)
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
        // "It is a second nervous system."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.60, cy: 0.50 }, { at: 70, zoom: 1.28, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.62, state: 'talk', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.38 }],
      },
      {
        // Eleven losses in a row.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.50, cy: 0.50 }, { at: 40, zoom: 1.02, cx: 0.50, cy: 0.52 }],
        camShake: [{ at: 20, strength: 9, dur: 26 }],
        playerPos: [{ at: 0, x: 0.40, state: 'hit',   facing: 1 }, { at: 40, x: 0.38, state: 'kneel', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'attack', facing: -1 }, { at: 40, x: 0.60, state: 'idle', facing: -1 }],
        effects: [{ type: 'impact_sparks', cx: 0.46, cy: 0.52, count: 16, color: '#cc99ee', startFrame: 18, duration: 28 }],
      },
      {
        // "Perception first," pulling you up off the ground.
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
        // By the fourth day he takes a round.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.50, cy: 0.50 }, { at: 40, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 26, strength: 7, dur: 20 }],
        playerPos: [{ at: 0, x: 0.40, state: 'attack', facing: 1 }, { at: 40, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'hit',    facing: -1 }, { at: 40, x: 0.60, state: 'idle', facing: -1 }],
        effects: [{ type: 'impact_sparks', cx: 0.52, cy: 0.52, count: 14, color: '#88ddff', startFrame: 24, duration: 26 }],
      },
      {
        // That night, looking down the descent route.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.90, cx: 0.52, cy: 0.58 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.20 }],
      },
      {
        // "I was the figure on the ridge."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.52, cy: 0.58 }, { at: 60, zoom: 1.34, cx: 0.60, cy: 0.48 }],
        camShake: [{ at: 30, strength: 4, dur: 30 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#8866aa', alpha: 0.28 }],
      },
      {
        // No apology. No explanation.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.60, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: 1 }],
      },
      {
        // Veran.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.44, cy: 0.48 }, { at: 70, zoom: 1.46, cx: 0.40, cy: 0.47 }],
        camShake: [{ at: 10, strength: 6, dur: 30 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.18 }],
        effects: [{ type: 'screen_flash', color: '#cc99ee', startFrame: 8, duration: 14, alpha: 0.24 }],
      },
      {
        // The man teaching you.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.46, cx: 0.40, cy: 0.47 }, { at: 90, zoom: 0.94, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: 1 }],
      },
    ],
  };

  // ── Chapter 157 — God's Threshold (14 beats) ────────────────────────────────
  // The domain is BUILT, not void. It acknowledges Kael and refuses to see Axiom.
  S[157] = {
    // God's domain, the outer edge of the nave (ch158)
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
        // "It was built." Pull way out — the architecture is the point.
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
        // Something noticed you had arrived.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 30, zoom: 1.18, cx: 0.44, cy: 0.48 }],
        camShake: [{ at: 24, strength: 7, dur: 26 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'look', facing: 1 }],
        effects: [{ type: 'screen_flash', color: '#ffdd99', startFrame: 24, duration: 16, alpha: 0.34 }],
      },
      {
        // "You, it acknowledged. The watched variable."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.40, cy: 0.48 }, { at: 70, zoom: 1.34, cx: 0.38, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.75 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffcc88', alpha: 0.42 }],
      },
      {
        // Axiom, it did not acknowledge. He dims.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.52, cy: 0.48 }, { at: 70, zoom: 1.20, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.45 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        // It turned toward him.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.58, cy: 0.50 }, { at: 60, zoom: 1.38, cx: 0.60, cy: 0.49 }],
        camShake: [{ at: 30, strength: 5, dur: 30 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'guard', facing: 1, alpha: 0.85 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.30 }],
      },
      {
        // The architecture reorganises — not hostile, not yet.
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

  // ── Chapter 159 — What You Are (9 beats) ────────────────────────────────────
  // God speaks structurally, not in words. Wide and low — the domain is talking.
  S[159] = {
    // The deep interior, under the flexing arches (ch158)
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
        // Felt in the foundation rather than heard.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.48 }, { at: 80, zoom: 0.88, cx: 0.50, cy: 0.60 }],
        camShake: [{ at: 20, strength: 5, dur: 60 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'ground_crack', color: '#ffcc88', alpha: 0.30, fadeIn: 30 }],
      },
      {
        // Watching since before he had the fragment.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.60 }, { at: 80, zoom: 1.20, cx: 0.40, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.7 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#ffcc88', alpha: 0.36 }],
      },
      {
        // The variable nothing accounted for.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.40, cy: 0.49 }, { at: 80, zoom: 1.34, cx: 0.38, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.55 }],
        effectsBehind: [{ type: 'echo_text', color: '#ddaa44', alpha: 0.26 }],
      },
      {
        // It had not opened its door for him.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.52, cy: 0.48 }, { at: 70, zoom: 1.16, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.5 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.14 }],
      },
      {
        // Him, it had carried.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.58, cy: 0.50 }, { at: 80, zoom: 1.30, cx: 0.60, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: 1, alpha: 0.8 }],
      },
      {
        // Distance was the tolerance.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.49 }, { at: 90, zoom: 0.92, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'idle', facing: 1 }],
      },
      {
        // He was not on the roof anymore.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        // The foundations narrow toward the centre.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.84, cx: 0.50, cy: 0.40 }],
        playerPos: [{ at: 0, x: 0.38, state: 'walk', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'walk', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.26 }],
      },
    ],
  };

  // ── Chapter 161 — God (14 beats) ────────────────────────────────────────────
  // God places itself between Axiom and the far side. Kael steps forward and
  // stands with him — the beat the whole companion arc has been building to.
  S[161] = {
    // The centre, where the domain's decision formed (ch160)
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
        // Sovereign's trail runs past it.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.48 }, { at: 80, zoom: 1.00, cx: 0.72, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.34, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'objective_marker', cx: 0.84, cy: 0.56, color: '#8888ff', startFrame: 30, duration: 90 }],
      },
      {
        // God moves.
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
        // It places itself, precisely.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.86, cx: 0.56, cy: 0.44 }, { at: 80, zoom: 0.94, cx: 0.58, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#ffcc88', alpha: 0.28 }],
      },
      {
        // "No further."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.58, cy: 0.50 }, { at: 60, zoom: 1.10, cx: 0.62, cy: 0.50 }],
        camShake: [{ at: 10, strength: 6, dur: 30 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#ddaa44', alpha: 0.30 }],
      },
      {
        // "I am not what I was."
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
        // The domain does not process corrections.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.50, cy: 0.49 }, { at: 80, zoom: 0.90, cx: 0.54, cy: 0.46 }],
        camShake: [{ at: 20, strength: 7, dur: 50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1, alpha: 0.7 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.20 }],
      },
      {
        // He looks at the trail running out the far side.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.54, cy: 0.46 }, { at: 80, zoom: 1.04, cx: 0.70, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'look', facing: 1 }],
      },
      {
        // "I cannot turn around."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.56, cy: 0.50 }, { at: 70, zoom: 1.32, cx: 0.52, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'talk',   facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#bb99cc', alpha: 0.30 }],
      },
      {
        // To God. To you. To no one.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.52, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
      },
      {
        // Ten thousand years of neutrality.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.52, cy: 0.49 }, { at: 90, zoom: 0.86, cx: 0.52, cy: 0.44 }],
        camShake: [{ at: 30, strength: 4, dur: 60 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.50, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#ffcc88', alpha: 0.32 }],
      },
      {
        // You stepped forward, and stood with him.
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

  // ── Chapter 163 — The Lab (15 beats) ────────────────────────────────────────
  // Three minutes too late. The fusion completes as he comes through the door.
  S[163] = {
    // The lab: Axiom's original construction space, the sealed section (ch67)
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
        // Up and out, through Sovereign's prepared geometry.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.42 }, { at: 80, zoom: 1.04, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'run', facing: 1 }],
        effectsBehind: [{ type: 'multi_portals', color: '#8888ff', alpha: 0.24, count: 4 }],
      },
      {
        // "The lab."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.56, cy: 0.50 }, { at: 60, zoom: 0.88, cx: 0.50, cy: 0.46 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'door', xf: 0.66, yf: 0.52, color: '#886699', alpha: 0.8 }],
      },
      {
        // Three minutes too late.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.46 }, { at: 50, zoom: 1.22, cx: 0.40, cy: 0.49 }],
        camShake: [{ at: 30, strength: 5, dur: 26 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }, { at: 40, x: 0.36, state: 'hit', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.20 }],
      },
      {
        // The oldest workshop in existence.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.40, cy: 0.49 }, { at: 80, zoom: 0.86, cx: 0.56, cy: 0.46 }],
        playerPos: [{ at: 0, x: 0.36, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, alpha: 0.5, scale: 1.2 }],
        effectsBehind: [{ type: 'cache_items', color: '#886699', alpha: 0.30 }],
      },
      {
        // The fusion completes.
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
        // Paradox, from very far beneath.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.64, cy: 0.48 }, { at: 70, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, scale: 1.25 }],
        effectsBehind: [{ type: 'echo_text', color: '#cc44ff', alpha: 0.26 }],
      },
      {
        // "What do you see?"
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.44, cy: 0.50 }, { at: 60, zoom: 1.20, cx: 0.40, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float',  facing: -1, scale: 1.25 }],
      },
      {
        // "You had a name."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.40, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, scale: 1.25 }],
      },
      {
        // Absolute Axiom.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.56, cy: 0.48 }, { at: 60, zoom: 0.84, cx: 0.62, cy: 0.42 }],
        camShake: [{ at: 10, strength: 10, dur: 44 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, scale: 1.35 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#cc99ff', alpha: 0.34 }],
        effects: [{ type: 'screen_flash', color: '#ddaaff', startFrame: 10, duration: 18, alpha: 0.34 }],
      },
      {
        // It looks at him, through the fusion.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.84, cx: 0.62, cy: 0.42 }, { at: 80, zoom: 1.30, cx: 0.60, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, scale: 1.35 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#cc99ff', alpha: 0.44 }],
      },
      {
        // It turns and leaves, back down.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.60, cy: 0.48 }, { at: 90, zoom: 0.92, cx: 0.50, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: 1, scale: 1.35, alpha: 1.0 }, { at: 70, x: 0.86, state: 'float', facing: 1, scale: 1.35, alpha: 0.0 }],
      },
      {
        // Sovereign did not leave.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.52 }, { at: 70, zoom: 1.10, cx: 0.60, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        extraFigures: [{ xf: 0.66, color: '#8888ff', facing: -1, state: 'idle', alpha: 0.75 }],
      },
      {
        // Standing in the wreck of its own work.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.60, cy: 0.50 }, { at: 80, zoom: 0.90, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        extraFigures: [{ xf: 0.66, color: '#8888ff', facing: -1, state: 'idle', alpha: 0.70 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        // "Yours."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.56, cy: 0.50 }, { at: 60, zoom: 1.36, cx: 0.40, cy: 0.48 }],
        camShake: [{ at: 50, strength: 5, dur: 24 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        extraFigures: [{ xf: 0.66, color: '#8888ff', facing: -1, state: 'point', alpha: 0.75 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.40 }],
      },
    ],
  };

  // ── Chapter 165 — The Seam (9 beats) ────────────────────────────────────────
  // Calix through the compass: you cannot beat God's form — find the seam.
  // Calix is a voice at extreme range, so no figure; the compass carries it.
  S[165] = {
    // Still in the lab, Calix's voice through the compass (ch67)
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
        // "You cannot beat God's form."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.42, cy: 0.50 }, { at: 70, zoom: 0.88, cx: 0.50, cy: 0.44 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.26 }],
      },
      {
        // "Find the seam."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.44 }, { at: 60, zoom: 1.18, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        effects: [{ type: 'objective_marker', cx: 0.62, cy: 0.48, color: '#66ccaa', startFrame: 24, duration: 80 }],
      },
      {
        // Every hit deposits radiation — fight, and you are finding it.
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
        // The energy Paradox left has thinned.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.40, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#446688', alpha: 0.24 }],
      },
      {
        // Holding the projection will cost you.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.49 }, { at: 70, zoom: 1.12, cx: 0.48, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.40, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.18 }],
      },
      {
        // "I think it knows that."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.48, cy: 0.50 }, { at: 80, zoom: 0.94, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.40, state: 'guard', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#ffcc88', alpha: 0.22 }],
      },
    ],
  };

  // ── Chapter 166 — The Voice Inside (14 beats) ───────────────────────────────
  // The domain rewritten and improved. Axiom's cadence with everything alive
  // pressed out of it — and the real him breaking through underneath.
  S[166] = {
    // God's domain rewritten, lattice through every joint (ch168)
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
        // Not collapsed — improved.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.48 }, { at: 80, zoom: 0.86, cx: 0.50, cy: 0.40 }],
        playerPos: [{ at: 0, x: 0.36, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'multi_portals', color: '#cc99ff', alpha: 0.22, count: 5 }],
      },
      {
        // And it was building.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.86, cx: 0.50, cy: 0.40 }, { at: 90, zoom: 1.00, cx: 0.56, cy: 0.50 }],
        camShake: [{ at: 30, strength: 4, dur: 60 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#cc99ff', alpha: 0.30 }],
      },
      {
        // It had collapsed stars onto him before.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.56, cy: 0.50 }, { at: 70, zoom: 1.16, cx: 0.62, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, scale: 1.3, alpha: 0.85 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#cc99ff', alpha: 0.40 }],
      },
      {
        // It spoke, and the voice was wrong.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.62, cy: 0.49 }, { at: 60, zoom: 1.34, cx: 0.66, cy: 0.48 }],
        camShake: [{ at: 20, strength: 6, dur: 30 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, scale: 1.3 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.24 }],
      },
      {
        // "You should not have followed."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.66, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1, scale: 1.3 }],
        effectsBehind: [{ type: 'echo_text', color: '#cc99ff', alpha: 0.30 }],
      },
      {
        // Flat, even — his cadence with the life pressed out.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.66, cy: 0.48 }, { at: 80, zoom: 1.10, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, scale: 1.3 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.20 }],
      },
      {
        // Underneath, in fragments — the real voice breaking through.
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

  // ── Chapter 170 — Peak Form (22 lines) ──────────────────────────────────────
  S[170] = {
    // God's domain, fully rewritten, at the centre (ch168)
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

  // ── Chapter 171 — After Everything (39 lines) ───────────────────────────────
  S[171] = {
    // The domain settling, at the centre (ch168)
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
