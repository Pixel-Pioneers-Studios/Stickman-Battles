'use strict';
// js/story/scenes/side.js — cinematic scene specs for side.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 4 specs — chapter ids: 66, 67, 68, 69

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ─── Chapter 66 — Laboratory Infiltration ────────────────────────────────
  S[66] = {
    bg: 'ruins',
    npcColor: '#336688',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.90, cx: 0.30, cy: 0.55 },
          { at: 60,  zoom: 1.10, cx: 0.40, cy: 0.52 },
          { at: 130, zoom: 1.18, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,   x: 0.18, state: 'walk', facing: 1 },
          { at: 50,  x: 0.30, state: 'look', facing: 1 },
          { at: 100, x: 0.32, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'smoke', alpha: 0.40, fadeIn: 20 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.45, cy: 0.50 },
          { at: 50, zoom: 1.32, cx: 0.38, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
          { at: 30, x: 0.32, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.25, fadeIn: 15 },
        ],
        bubbleX: 0.80,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.40, cx: 0.55, cy: 0.48 },
          { at: 90, zoom: 1.55, cx: 0.55, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.38, state: 'look', facing: 1 },
          { at: 60, x: 0.40, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'static_noise', alpha: 0.40, fadeIn: 10 },
          { type: 'fragment_pulse', color: '#336688', alpha: 0.45, fadeIn: 25 },
        ],
        effects: [
          { type: 'screen_flash', color: '#aaddff', startFrame: 30, duration: 18, alpha: 0.35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.60, cy: 0.50 },
          { at: 40, zoom: 1.30, cx: 0.65, cy: 0.50 },
          { at: 80, zoom: 1.22, cx: 0.60, cy: 0.52 },
        ],
        camShake: [{ at: 35, strength: 4, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle',  facing: 1 },
          { at: 25, x: 0.35, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.90, state: 'idle', facing: -1, alpha: 0.0, scale: 1.00, show: false },
          { at: 20, x: 0.75, state: 'walk', facing: -1, alpha: 0.0, scale: 1.00 },
          { at: 45, x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.00, show: true },
        ],
        effectsBehind: [
          { type: 'speedlines', cx: 0.68, cy: 0.50, count: 18, color: '#336688', alpha: 0.50, startFrame: 40, fadeIn: 8 },
          { type: 'smoke', alpha: 0.35, fadeIn: 20 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#336688', startFrame: 45, duration: 14, alpha: 0.40 },
          { type: 'shockwave',     cx: 0.68, cy: 0.60, color: '#88ccff', startFrame: 45, duration: 38 },
          { type: 'impact_sparks', cx: 0.68, cy: 0.50, count: 16, color: '#aaddff', startFrame: 45, duration: 28 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // ── Chapter 67 — The Sealed Section (6 beats) ───────────────────────────────
  // Nineteen listed subjects, seventeen cells. He goes through the back door.
  S[67] = {
    bg: 'cave',
    npcColor: '#446688',
    beats: [
      {
        // Empty cells. Wide and still.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.08, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.30, state: 'walk', facing: 1 }, { at: 60, x: 0.38, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        // The terminal. The count does not match the room.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.46, cy: 0.50 }, { at: 45, zoom: 1.30, cx: 0.42, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.38, state: 'reach', facing: 1 }, { at: 50, x: 0.38, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.18 }],
        effects: [{ type: 'echo_text', color: '#88bbcc', alpha: 0.30, startFrame: 30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.42, cy: 0.48 }, { at: 55, zoom: 1.10, cx: 0.54, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
      },
      {
        // The door at the back of the corridor.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.54, cy: 0.50 }, { at: 60, zoom: 1.22, cx: 0.66, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'walk', facing: 1 }, { at: 60, x: 0.46, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'door', xf: 0.72, yf: 0.52, color: '#446688', alpha: 0.85 }],
      },
      {
        // Axiom's sweep logs stop here. Nobody has been past this point.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.66, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.46, state: 'look', facing: 1 }],
        effectsBehind: [
          { type: 'door', xf: 0.72, yf: 0.52, color: '#446688', alpha: 0.85 },
          { type: 'static_noise', alpha: 0.14 },
        ],
      },
      {
        // "You go in anyway."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.66, cy: 0.50 }, { at: 70, zoom: 1.34, cx: 0.72, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.46, state: 'walk', facing: 1 }, { at: 70, x: 0.62, state: 'walk', facing: 1 }],
        effectsBehind: [{ type: 'door_opening', xf: 0.72, yf: 0.52, color: '#66aacc', alpha: 0.9, startFrame: 20 }],
        effects: [{ type: 'screen_flash', color: '#88ccee', startFrame: 62, duration: 18, alpha: 0.30 }],
      },
    ],
  };

  // ── Chapter 68 — Awakening (12 beats) ───────────────────────────────────────
  // Calix is decanted from the last intact column. Two voices arguing in one head.
  S[68] = {
    bg: 'cave',
    npcColor: '#446688',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }, { at: 50, zoom: 1.24, cx: 0.44, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.34, state: 'reach', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, alpha: 0.35 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.16 }],
      },
      {
        // The column drains.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.56, cy: 0.50 }, { at: 60, zoom: 1.30, cx: 0.62, cy: 0.50 }],
        camShake: [{ at: 20, strength: 5, dur: 26 }],
        playerPos: [{ at: 0, x: 0.34, state: 'look',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'float', facing: -1, alpha: 0.55 }],
        effects: [{ type: 'smoke', cx: 0.64, cy: 0.62, color: '#557788', startFrame: 15, duration: 60 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.62, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'kneel', facing: -1, alpha: 0.85 }],
      },
      {
        // They look up.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.62, cy: 0.50 }, { at: 30, zoom: 1.44, cx: 0.64, cy: 0.47 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'kneel', facing: -1, alpha: 1.0 }, { at: 30, x: 0.64, state: 'look', facing: -1, alpha: 1.0 }],
        effects: [{ type: 'screen_flash', color: '#88bbdd', startFrame: 28, duration: 10, alpha: 0.26 }],
      },
      {
        // "How long."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.44, cx: 0.64, cy: 0.47 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'talk',   facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.44, cx: 0.64, cy: 0.47 }, { at: 50, zoom: 1.26, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'idle', facing: -1 }],
      },
      {
        // The player answers.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.26, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'talk',   facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'listen', facing: -1 }],
      },
      {
        // They look at their hands.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.26, cx: 0.58, cy: 0.50 }, { at: 55, zoom: 1.40, cx: 0.64, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle',  facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'reach', facing: -1 }],
      },
      {
        // "Both of them are still arguing."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.64, cy: 0.52 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.13 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.64, cy: 0.52 }, { at: 60, zoom: 1.28, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'idle', facing: -1 }],
      },
      {
        // "It means neither won."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.28, cx: 0.56, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.34, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'talk',   facing: -1 }],
      },
      {
        // The alarm. Everything changes register.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.56, cy: 0.50 },
          { at: 12, zoom: 1.06, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 10, strength: 12, dur: 40 }],
        playerPos: [{ at: 0, x: 0.34, state: 'hit',   facing: 1 }, { at: 30, x: 0.34, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.64, state: 'look',  facing: -1 }, { at: 30, x: 0.62, state: 'guard', facing: -1 }],
        effects: [
          { type: 'screen_flash', color: '#ff5544', startFrame: 10, duration: 16, alpha: 0.50 },
          { type: 'static_noise', alpha: 0.22, startFrame: 10, duration: 70 },
        ],
      },
    ],
  };

  // ── Chapter 69 — What the Lab Taught (15 beats) ─────────────────────────────
  // Saga I's finale. Calix explains domain seams, then Kael turns back to burn
  // the facility rather than walk out of it.
  S[69] = {
    bg: 'cave',
    npcColor: '#334466',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 1.16, cx: 0.48, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'walk',   facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'walk',   facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: -1 }],
      },
      {
        // Eighteen months of structured trials — the reason the lab must go.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.52, cy: 0.50 }, { at: 70, zoom: 1.30, cx: 0.56, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.12 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.56, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.36, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#6699bb', alpha: 0.34 }],
      },
      {
        // "Then they stopped walking."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.56, cy: 0.49 }, { at: 40, zoom: 1.14, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.36, state: 'walk', facing: 1 }, { at: 30, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'walk', facing: 1 }, { at: 24, x: 0.58, state: 'idle', facing: -1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: -1 }],
      },
      {
        // They nod back down the corridor — the camera goes with the look.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.52, cy: 0.50 }, { at: 55, zoom: 1.04, cx: 0.30, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'look',  facing: -1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'point', facing: -1 }],
        effectsBehind: [{ type: 'door', xf: 0.16, yf: 0.52, color: '#334466', alpha: 0.7 }],
      },
      {
        // "This place still works."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.30, cy: 0.50 }, { at: 60, zoom: 1.18, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle',   facing: -1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.14 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.52, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'talk',   facing: -1 }],
      },
      {
        // "You thought about ninety-four people." The chapter's centre of gravity.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.44, cy: 0.50 }, { at: 90, zoom: 1.40, cx: 0.40, cy: 0.48 }],
        camShake: [{ at: 46, strength: 3, dur: 40 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6688aa', alpha: 0.55 },
          { type: 'echo_text', color: '#8899aa', alpha: 0.30 },
        ],
      },
      {
        // "That did not happen out there." — it happened in rooms.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.40, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.18 }],
      },
      {
        // Lockdown units arrive.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.40, cx: 0.40, cy: 0.48 }, { at: 14, zoom: 1.02, cx: 0.54, cy: 0.50 }],
        camShake: [{ at: 12, strength: 10, dur: 28 }],
        playerPos: [{ at: 0, x: 0.38, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.58, state: 'guard', facing: 1 }],
        extraFigures: [
          { xf: 0.86, color: '#334466', facing: -1, state: 'walk', alpha: 0.55 },
          { xf: 0.94, color: '#2b3a55', facing: -1, state: 'walk', alpha: 0.45 },
        ],
        effects: [{ type: 'screen_flash', color: '#ff5544', startFrame: 12, duration: 14, alpha: 0.40 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.54, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.56, state: 'talk',  facing: 1 }],
        extraFigures: [{ xf: 0.88, color: '#334466', facing: -1, state: 'guard', alpha: 0.55 }],
      },
      {
        // "And after," you said — the decision to go back for the facility.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.48, cy: 0.50 }, { at: 55, zoom: 1.24, cx: 0.42, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.38, state: 'talk',   facing: 1 }],
        npcPos:    [{ at: 0, x: 0.56, state: 'listen', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#88bbdd', alpha: 0.45, fadeIn: 20 }],
      },
      {
        // "Calix did not argue."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.42, cy: 0.49 }, { at: 60, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.56, state: 'idle', facing: -1 }],
        effectsBehind: [{ type: 'fire_glow', alpha: 0.20, fadeIn: 40 }],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
