'use strict';
// js/story/scenes/act1.js — cinematic scene specs for act1.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 8 specs — chapter ids: 17, 19, 22, 24, 26, 29, 30, 31

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ── Chapter 17 — Between Worlds ──────────────────────────────────────────────
  // Beat 0: "The primary fracture swallowed you whole." (narrator)
  // Beat 1: "There was no up. No down. Just space folding…" (narrator)
  // Beat 2: "Veran: 'Fracture space has laws…'" (NPC comms)
  S[17] = {
    bg: 'fracture',
    npcColor: '#4488dd',
    beats: [
      {
        // Player tumbles into fracture space. Camera spins. Reality shears.
        letterbox: true,
        warp: 0.60,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.48 },
          { at: 80, zoom: 0.95, cx: 0.50, cy: 0.50 }, // pull wide as space opens
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
        // Fracture space unfolds. No orientation. Player drifts and looks around.
        letterbox: true,
        warp: 0.38,
        camAnim: [
          { at: 0,  zoom: 0.95, cx: 0.50, cy: 0.50 },
          { at: 70, zoom: 1.05, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.46, state: 'float', facing:  1 },
          { at: 50, x: 0.50, state: 'look',  facing: -1 }, // spins to look other way
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
        // Veran's voice crackles through — comms barely reaching into fracture space.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.48, cy: 0.50 },
          { at: 45, zoom: 1.35, cx: 0.40, cy: 0.50 }, // push to player face for comms
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

  // ── Chapter 19 — Mirror Fracture ─────────────────────────────────────────────
  // Beat 0: "The compass led you into a mirror pocket…" (narrator)
  // Beat 1: "And in this mirror world: a version of you. Or something wearing your shape." (narrator)
  // Beat 2: "'You shouldn't be here… This is where the fragment leads you.'" (NPC — the echo)
  S[19] = {
    bg: 'city',
    npcColor: '#cc66cc',
    beats: [
      {
        // Enter the mirror world. City is wrong. Colors are off. Camera pushes slowly.
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
        // The echo STEPS OUT — same silhouette, mirrored stance. Camera snaps to two-shot.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.50, cy: 0.50 },
          { at: 18, zoom: 1.30, cx: 0.50, cy: 0.50 }, // snap to both
        ],
        camShake: [{ at: 8, strength: 10, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look',  facing: 1 },
          { at: 8,  x: 0.26, state: 'hit',   facing: 1 }, // startled
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
        // Echo speaks. Camera drifts slowly between the two identical silhouettes.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.42, cx: 0.62, cy: 0.50 }, // drift toward echo
          { at: 80, zoom: 1.35, cx: 0.48, cy: 0.50 }, // drift back to player
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

  // ── Chapter 22 — The Void Arena ──────────────────────────────────────────────
  // Beat 0: "A collapsed dimension. No sky. No ground…" (narrator)
  // Beat 1: "Here, something had set up camp. A collector — much larger…" (narrator)
  // Beat 2: "'The fragment… Give it to me and your universe survives.'" (NPC)
  // Beat 3: "You don't negotiate with things that threaten your world." (narrator)
  S[22] = {
    bg: 'fracture',
    npcColor: '#7700cc',
    beats: [
      {
        // Wide establishing shot. Impossible silence of a dead universe.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.88, cx: 0.50, cy: 0.50 }, // very wide — scope of emptiness
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
        // The Void Collector looms. Camera creeps toward it. Something is wrong with its scale.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.95, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.25, cx: 0.65, cy: 0.50 }, // push toward the Collector
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
        // It speaks. Its voice carries weight. Player holds their ground.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.65, cy: 0.50 },
          { at: 30, zoom: 1.38, cx: 0.58, cy: 0.50 }, // two-shot, tight
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1, scale: 1.4 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#7700cc', alpha: 0.60 },
        ],
        bubbleX: 0.68,
      },
      {
        // Player steps forward. No words. Camera tracks them moving in.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.58, cy: 0.50 },
          { at: 35, zoom: 1.20, cx: 0.50, cy: 0.50 }, // pull back as player advances
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

  // ── Chapter 24 — Army of Echoes ──────────────────────────────────────────────
  // Beat 0: "Veran wasn't exaggerating. The echo corridor… All of them had the same hollow eyes." (narrator)
  // Beat 1: "All of them were pointed at you." (narrator)
  // Beat 2: "'Fragment detected. Engage.'" (NPC)
  S[24] = {
    bg: 'fracture',
    npcColor: '#9955cc',
    beats: [
      {
        // Camera sweeps down the corridor — endless ranks of echo fighters.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.88, cx: 0.50, cy: 0.50 }, // wide: show the full corridor
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
        // They all turn at once — hollow, synchronized. Camera slow push.
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
        // One steps forward and issues the kill order. Close on it and player.
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

  // ── Chapter 26 — The Gate ────────────────────────────────────────────────────
  // Beat 0: "The rift entity felt you coming." (narrator)
  // Beat 1: "It sent its best." (narrator)
  // Beat 2: "A fragment guardian… barely recognizable as a fighter." (narrator)
  // Beat 3: "'Veran cannot help you here… You walk in alone.'" (NPC)
  S[26] = {
    bg: 'fracture',
    npcColor: '#6600aa',
    beats: [
      {
        // Player and Veran approach together. Something is wrong ahead.
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
          { at: 0,  x: 0.34, state: 'walk', facing: 1 }, // Veran walking beside player
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
        // The atmosphere shifts — something huge is out there. Fragment reacts.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.52, cy: 0.50 },
          { at: 60, zoom: 1.25, cx: 0.60, cy: 0.50 },
        ],
        camShake: [{ at: 50, strength: 10, dur: 20 }],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.36, state: 'look', facing: 1, alpha: 0.70 }], // Veran also looking
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6600aa', alpha: 0.60, fadeIn: 25 },
          { type: 'speedlines', cx: 0.75, cy: 0.50, count: 20, color: '#6600aa', alpha: 0.40, startFrame: 45, fadeIn: 12 },
        ],
      },
      {
        // The Fragment Guardian materializes. It is wrong in every proportion.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.60, cy: 0.50 },
          { at: 20, zoom: 1.10, cx: 0.52, cy: 0.50 }, // pull back to show scale
        ],
        camShake: [{ at: 8, strength: 18, dur: 25 }],
        playerPos: [
          { at: 0,  x: 0.20, state: 'look',  facing: 1 },
          { at: 8,  x: 0.18, state: 'hit',   facing: 1 }, // knocked by sheer presence
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
        // It speaks. Veran is no longer visible — she stayed behind.
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

  // ── Chapter 29 — Deep Fragment ───────────────────────────────────────────────
  // Beat 0: "The Crucible." (narrator — title card moment)
  // Beat 1: "Where the rift entity tested… The last forty-seven had failed here." (narrator)
  // Beat 2: "The Crucible's champion had absorbed… Each one a memory…" (narrator)
  // Beat 3: "It looked at you. 'Forty-eight,' it said." (NPC)
  S[29] = {
    bg: 'fracture',
    npcColor: '#880044',
    beats: [
      {
        // Title card: "The Crucible." Pure darkness. Slow emergence.
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
        // Ghost silhouettes of the 47 failed bearers flicker in the darkness.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 0.92, cx: 0.50, cy: 0.50 }, // pull wide to show the arena scope
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
        // Champion materializes — absorbing the signatures of the fallen.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.92, cx: 0.50, cy: 0.50 },
          { at: 25, zoom: 1.20, cx: 0.60, cy: 0.50 }, // snap toward the champion
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
        // It looks at the player. The most terrifying word: "Forty-eight."
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.60, cy: 0.50 },
          { at: 40, zoom: 1.50, cx: 0.58, cy: 0.48 }, // push to maximum close two-shot
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

  // ── Chapter 30 — The Weight of It (branch) ───────────────────────────────────
  // Beat 0: "Before the Core's Eye: a chamber of silence." (narrator)
  // Beat 1: "Just you and Veran." (narrator)
  // Beat 2: "'I need to tell you something I've been putting off.'" (Veran — NPC)
  // Beat 3: "'The closure protocol requires a fragment anchor…'" (Veran)
  // Beat 4: "'If you do this — the fragment will be consumed… I don't know what that means for you.'" (Veran)
  // Beat 5: "'I'm not telling you it's certain death… you deserve to know.'" (Veran)
  // Beat 6: "A long silence." (narrator)
  // Beat 7: "'Death can have me when it earns me,' you said. 'Let's go.'" (PLAYER — bubble from player)
  S[30] = {
    // The Eye Antechamber's stone benches, at the start of chapter 31's map
    bg: 'level', level: { ch: 31, x: 480 },
    npcColor: '#4488dd',
    beats: [
      {
        // Quiet establishing shot. The most important room. Silence before the storm.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.92, cx: 0.50, cy: 0.50 }, // wide
          { at: 80, zoom: 1.00, cx: 0.50, cy: 0.50 }, // slow push in
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
      {
        // Veran is there. Two figures alone. Camera frames them in the emptiness.
        letterbox: true,
        cam: { zoom: 1.10, cx: 0.46, cy: 0.50, lerpSpeed: 0.04 },
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.62, state: 'idle', facing: -1 }],
      },
      {
        // Veran turns to the player. Something shifts in her posture.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.46, cy: 0.50 },
          { at: 35, zoom: 1.25, cx: 0.50, cy: 0.50 }, // push in as she speaks
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.62, state: 'idle', facing: -1 },
          { at: 20, x: 0.60, state: 'talk', facing: -1 },
        ],
        bubbleX: 0.60,
      },
      {
        // The explanation. Fragment pulse builds as she describes what must be done.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.35, cx: 0.36, cy: 0.50 }, // drift toward player as the weight lands
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.60, fadeIn: 25 },
        ],
        bubbleX: 0.60,
      },
      {
        // The stakes land. Camera holds close on the player — absorbing the cost.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.36, cy: 0.50 },
          { at: 50, zoom: 1.50, cx: 0.33, cy: 0.48 }, // push into player face
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.75 },
        ],
        bubbleX: 0.60,
      },
      {
        // Veran finishes. Camera cuts to her face — she means every word.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.50, cx: 0.33, cy: 0.48 },
          { at: 40, zoom: 1.50, cx: 0.60, cy: 0.48 }, // cut to Veran's face
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.55 },
        ],
        bubbleX: 0.60,
      },
      {
        // Silence. Camera pulls back to wide two-shot. Neither speaks.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.50, cx: 0.60, cy: 0.48 },
          { at: 70, zoom: 1.05, cx: 0.46, cy: 0.50 }, // pull back slowly
        ],
        playerPos: [{ at: 0, x: 0.30, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.60, state: 'idle', facing: -1 }],
      },
      {
        // The player speaks. For the first time — a player bubble.
        // "Death can have me when it earns me." Half-lid, smirk, zero hesitation.
        letterbox: true,
        playerExpr: 'serene',
        npcExpr: 'focused',
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.46, cy: 0.50 },
          { at: 35, zoom: 1.42, cx: 0.32, cy: 0.48 }, // tight push into player face
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle',  facing: 1 },
          { at: 20, x: 0.32, state: 'reach', facing: 1, expr: 'serene' }, // steps forward — no hesitation
        ],
        npcPos: [
          { at: 0,  x: 0.60, state: 'idle', facing: -1 },
          { at: 22, x: 0.58, state: 'look', facing: -1 }, // Veran stares. Doesn't speak.
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

  // ── Chapter 31 — Core Entry ──────────────────────────────────────────────────
  // Beat 0: "The Eye of the Core." (narrator)
  // Beat 1: "Not the rift entity itself… to engage you on terms you'd understand." (narrator)
  // Beat 2: "'I am not your enemy… Every fragment bearer who came here wanted something.'" (NPC — The Eye)
  // Beat 3: "'Power. Safety. Revenge.'" (NPC)
  // Beat 4: "'What do you want?'" (NPC)
  // Beat 5: "You didn't answer. You fought." (narrator)
  S[31] = {
    bg: 'fracture',
    npcColor: '#6633cc',
    beats: [
      {
        // The Eye opens. The most alien thing the player has seen. Camera holds wide.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.88, cx: 0.50, cy: 0.50 }, // very wide — scope of the Core
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
        // It takes the shape of a fighter. Camera pushes toward it — dread and awe.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 80, zoom: 1.28, cx: 0.64, cy: 0.50 }, // push toward The Eye
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
        // It speaks. Its voice is something between memory and gravity.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.64, cy: 0.50 },
          { at: 35, zoom: 1.35, cx: 0.58, cy: 0.50 }, // pull slightly to two-shot
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1, scale: 1.15 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6633cc', alpha: 0.50 },
        ],
        bubbleX: 0.68,
      },
      {
        // "Power. Safety. Revenge." — it lists them like it's seen them all.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.58, cy: 0.50 },
          { at: 40, zoom: 1.48, cx: 0.66, cy: 0.48 }, // push to The Eye's face
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk',  facing: -1, scale: 1.15 }],
        bubbleX: 0.68,
      },
      {
        // "What do you want?" Camera snaps back to player. The question lands on them.
        // Player doesn't answer. Cool, unhurried. The silence is the answer.
        letterbox: true,
        playerExpr: 'cool',
        camAnim: [
          { at: 0,  zoom: 1.48, cx: 0.66, cy: 0.48 },
          { at: 15, zoom: 1.52, cx: 0.26, cy: 0.47 }, // tight snap CUT to player face
          { at: 70, zoom: 1.40, cx: 0.28, cy: 0.48 }, // hold on their expression
        ],
        playerPos: [{ at: 0, x: 0.24, state: 'idle', facing: 1, expr: 'cool' }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle', facing: -1, scale: 1.15 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.70, fadeIn: 15 },
        ],
        bubbleX: 0.68,
      },
      {
        // No answer. Player charges. Camera slams wide and tracks the movement.
        letterbox: true,
        playerExpr: 'intense',
        camAnim: [
          { at: 0,  zoom: 1.40, cx: 0.28, cy: 0.48 },
          { at: 8,  zoom: 1.05, cx: 0.50, cy: 0.50 }, // slam wide — the decision made
          { at: 50, zoom: 1.22, cx: 0.56, cy: 0.50 }, // track the charge
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
