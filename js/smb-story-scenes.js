'use strict';
// smb-story-scenes.js — Cinematic per-chapter scene specs.
// Uses camAnim, playerPos, npcPos, camShake, letterbox, and all new effect types.
// Loaded before smb-story-narrative-scene.js.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ── Chapter 0 — Fracture Point ───────────────────────────────────────────────
  // Beat 0 (narrator): "You were crossing the street when the air ripped…"
  // Beat 1 (NPC):      "You. Of course it's you."
  // Beat 2 (narrator): "You'd never seen them before in your life."
  S[0] = {
    bg: 'city',
    npcColor: '#88aacc',
    beats: [
      {
        // Wide shot. Player walks across quiet street. Portal RIPS open — shockwave, flash.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 60,  zoom: 1.10, cx: 0.55, cy: 0.52 }, // slow push
          { at: 110, zoom: 1.35, cx: 0.68, cy: 0.50 }, // snap toward portal
        ],
        camShake: [{ at: 105, strength: 14, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.22, state: 'walk',  facing: 1 },
          { at: 80, x: 0.34, state: 'walk',  facing: 1 },
          { at: 110, x: 0.30, state: 'hit',  facing: 1 }, // knocked back by portal shockwave
          { at: 130, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.72, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'portal', xf: 0.70, yf: 0.46, height: 0.46, color: '#cc88ff', alpha: 0.0, fadeIn: 80 },
          { type: 'speedlines', cx: 0.70, cy: 0.50, count: 22, color: '#cc88ff', alpha: 0.0, startFrame: 95, fadeIn: 15 },
        ],
        effects: [
          { type: 'shockwave',   cx: 0.70, cy: 0.65, color: '#cc88ff', startFrame: 105, duration: 35 },
          { type: 'screen_flash', color: '#9944ff', startFrame: 105, duration: 14, alpha: 0.65 },
        ],
      },
      {
        // NPC steps through — camera pulls to medium two-shot. Impact flash as they fully materialize.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.68, cy: 0.50 },
          { at: 25, zoom: 1.20, cx: 0.56, cy: 0.50 }, // pull back to show both
        ],
        camShake: [{ at: 28, strength: 6, dur: 12 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 28, x: 0.26, state: 'hit',  facing: 1 }, // stumble back as NPC fully arrives
          { at: 45, x: 0.27, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.65, state: 'walk',  facing: -1, alpha: 0.3 },
          { at: 20, x: 0.64, state: 'reach', facing: -1, alpha: 0.8 },
          { at: 35, x: 0.63, state: 'talk',  facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.72, yf: 0.46, height: 0.46, color: '#cc88ff', alpha: 0.55 },
          { type: 'speedlines', cx: 0.65, cy: 0.48, count: 18, color: '#aaccff', alpha: 0.55, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ffffff', startFrame: 28, duration: 10, alpha: 0.80 },
          { type: 'impact_sparks', cx: 0.64, cy: 0.58, count: 10, color: '#aaccff', startFrame: 28, duration: 25 },
        ],
        bubbleX: 0.63,
      },
      {
        // Camera slow push into player's face. NPC is an unreadable silhouette at the edge.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.56, cy: 0.50 },
          { at: 80, zoom: 1.55, cx: 0.32, cy: 0.48 }, // push into player
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'idle',  facing: -1, alpha: 0.40 }],
        effectsBehind: [
          { type: 'portal', xf: 0.72, yf: 0.46, height: 0.40, color: '#cc88ff', alpha: 0.25 },
        ],
      },
    ],
  };

  // ── Chapter 2 — The Seams ────────────────────────────────────────────────────
  // Beat 0: "Veran was still a voice…"
  // Beat 1: "Within an hour, there were hundreds…"
  // Beat 2: "And through each one: fighters…"
  // Beat 3: "'Secure the fracture point…'"
  S[2] = {
    bg: 'city',
    npcColor: '#cc4444',
    beats: [
      {
        // Quiet city. ONE portal appears in the distance with an ominous glow.
        letterbox: true,
        cam: { zoom: 1.05, cx: 0.52, cy: 0.50, lerpSpeed: 0.04 },
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.70, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'portal', xf: 0.68, yf: 0.36, height: 0.30, color: '#aa55ff', alpha: 0.55, fadeIn: 60 },
        ],
      },
      {
        // SKY ERUPTS. Dozens of portals tear open simultaneously — camera snaps wide.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 15, zoom: 0.92, cx: 0.50, cy: 0.42 }, // snap wide to show whole sky
          { at: 80, zoom: 0.96, cx: 0.50, cy: 0.44 },
        ],
        camShake: [{ at: 15, strength: 18, dur: 28 }],
        playerPos: [
          { at: 0,  x: 0.22, state: 'look', facing: 1 },
          { at: 15, x: 0.20, state: 'hit',  facing: 1 }, // hit by shockwave
          { at: 32, x: 0.21, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#0f0520', skyMid: '#180a30', skyBot: '#0a0618' },
        effectsBehind: [
          { type: 'sky_bleed', alpha: 0.90 },
          { type: 'multi_portals', alpha: 0.80, fadeIn: 20, portals: [
            { xf: 0.08, yf: 0.22, height: 0.30, color: '#cc44ff', a: 0.85 },
            { xf: 0.22, yf: 0.12, height: 0.42, color: '#dd66ff', a: 0.90 },
            { xf: 0.40, yf: 0.18, height: 0.35, color: '#aa44ee', a: 0.80 },
            { xf: 0.58, yf: 0.10, height: 0.48, color: '#ee88ff', a: 0.90 },
            { xf: 0.74, yf: 0.20, height: 0.32, color: '#bb55ff', a: 0.80 },
            { xf: 0.88, yf: 0.14, height: 0.40, color: '#cc66ff', a: 0.85 },
          ]},
        ],
        effects: [
          { type: 'speedlines', cx: 0.50, cy: 0.30, count: 28, color: '#cc44ff', alpha: 0.55, startFrame: 10, duration: 30, fadeIn: 8 },
          { type: 'screen_flash', color: '#cc44ff', startFrame: 14, duration: 18, alpha: 0.50 },
        ],
      },
      {
        // Ground-level shot. Fighters pour through each portal, marching in formation.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.55 }, // low angle, street level
          { at: 60, zoom: 1.05, cx: 0.50, cy: 0.55 },
        ],
        playerPos: [{ at: 0, x: 0.16, state: 'crouch', facing: 1 }], // crouching, watching
        npcPos:    [{ at: 0, x: 0.60, state: 'idle',   facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#0f0520', skyMid: '#180a30', skyBot: '#0a0618' },
        effectsBehind: [
          { type: 'sky_bleed', alpha: 0.75 },
          { type: 'multi_portals', alpha: 0.55, portals: [
            { xf: 0.35, yf: 0.20, height: 0.38, color: '#cc66ff', a: 0.80 },
            { xf: 0.65, yf: 0.15, height: 0.44, color: '#aa44ee', a: 0.75 },
          ]},
        ],
        extraFigures: [
          { xf: 0.42, color: '#cc3333', facing: -1, state: 'walk',  alpha: 0.80 },
          { xf: 0.54, color: '#aa2222', facing: -1, state: 'walk',  alpha: 0.70 },
          { xf: 0.64, color: '#bb3333', facing: -1, state: 'run',   alpha: 0.65 },
          { xf: 0.76, color: '#993322', facing: -1, state: 'walk',  alpha: 0.60 },
          { xf: 0.84, color: '#cc4433', facing: -1, state: 'walk',  alpha: 0.50 },
        ],
      },
      {
        // Commander steps forward and gives the order. Close two-shot.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.55 },
          { at: 30, zoom: 1.30, cx: 0.58, cy: 0.50 }, // push in on commander
        ],
        playerPos: [{ at: 0, x: 0.18, state: 'crouch', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.60, state: 'walk',  facing: -1, alpha: 0.70 },
          { at: 25, x: 0.58, state: 'talk',  facing: -1, alpha: 1.00 },
        ],
        cityOpts: { skyTop: '#0f0520', skyMid: '#180a30', skyBot: '#0a0618' },
        effectsBehind: [
          { type: 'sky_bleed', alpha: 0.60 },
        ],
        extraFigures: [
          { xf: 0.74, color: '#aa2222', facing: -1, state: 'idle', alpha: 0.60 },
          { xf: 0.86, color: '#993322', facing: -1, state: 'idle', alpha: 0.50 },
        ],
        bubbleX: 0.58,
      },
    ],
  };

  // ── Chapter 3 — Disorientation (hidden) ──────────────────────────────────────
  // Beat 0: "Half a block had… shifted."
  // Beat 1: "People were wandering through it…"
  // Beat 2: "Veran's message: 'The fragment inside you is reacting…'"
  // Beat 3: "'Have you?'"
  // Beat 4: "[ You haven't. Or you don't remember. ]"
  // Beat 5: "You didn't answer. You kept moving."
  S[3] = {
    bg: 'city',
    npcColor: '#88ccff',
    beats: [
      {
        // Reality shears sideways. Camera warps. The world is wrong.
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
        // Wanderers drift through the gap in reality. World still warped but stabilising.
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
        // Player stares at phone. Fragment pulse glows. Veran's words visible on screen.
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
        // "Have you?" — Close on player face. Phone glow is the only light.
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
        // Silence. Camera pulls back to normal. Player just stands.
        camAnim: [
          { at: 0,  zoom: 1.60, cx: 0.34, cy: 0.47 },
          { at: 50, zoom: 1.05, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [{ at: 0, x: 0.32, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
      {
        // Player walks away. Camera holds wide.
        cam: { zoom: 1.05, cx: 0.50, cy: 0.50 },
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
          { at: 15, x: 0.50, state: 'walk', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
      },
    ],
  };

  // ── Chapter 4 — Bleeding Sky ─────────────────────────────────────────────────
  // Beat 0: "You climbed. The rooftops gave you altitude…"
  // Beat 1: "From up here you could see the fracture lines in the sky…"
  // Beat 2: "'You really don't know what you are, do you?'"
  S[4] = {
    bg: 'city',
    npcColor: '#8855cc',
    beats: [
      {
        // Camera PANS UP as player climbs. Cracks spread across the sky above.
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.38, cy: 0.65 }, // ground level
          { at: 70,  zoom: 1.10, cx: 0.42, cy: 0.42 }, // pan up toward sky
          { at: 110, zoom: 1.05, cx: 0.45, cy: 0.40 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'run',  facing: 1 },
          { at: 70, x: 0.32, state: 'walk', facing: 1 },
          { at: 100, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#04081a', skyMid: '#080f28', skyBot: '#060a18' },
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.25, fadeIn: 50 },
        ],
      },
      {
        // Rooftop. Camera holds wide-ish. Cracks fill sky — a beautiful, terrible sight.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.45, cy: 0.40 },
          { at: 60, zoom: 0.95, cx: 0.50, cy: 0.38 }, // pull slightly wider to show sky scope
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#04081a', skyMid: '#080f28', skyBot: '#060a18' },
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.92 },
        ],
      },
      {
        // The watcher emerges from behind — suddenly visible. Camera snaps to two-shot.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.95, cx: 0.50, cy: 0.40 },
          { at: 20, zoom: 1.25, cx: 0.50, cy: 0.48 }, // snap to two-shot
        ],
        camShake: [{ at: 8, strength: 5, dur: 10 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'look',  facing: 1 },
          { at: 10, x: 0.24, state: 'hit',   facing: 1 }, // startled
          { at: 25, x: 0.25, state: 'idle',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.80, state: 'idle',  facing: -1, alpha: 0.0 },
          { at: 8,  x: 0.70, state: 'reach', facing: -1, alpha: 0.8 },
          { at: 22, x: 0.68, state: 'talk',  facing: -1, alpha: 1.0 },
        ],
        cityOpts: { skyTop: '#04081a', skyMid: '#080f28', skyBot: '#060a18' },
        effectsBehind: [
          { type: 'sky_cracks', progress: 0.92 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.70, cy: 0.50, count: 16, color: '#8855cc', alpha: 0.40, startFrame: 8, duration: 18, fadeIn: 6 },
        ],
        bubbleX: 0.68,
      },
    ],
  };

  // ── Chapter 6 — Ground Zero ──────────────────────────────────────────────────
  // Beat 0: "'You're not the first.'" (echo)
  // Beat 1: "That phrase echoed as you descended…"
  // Beat 2: "…portal fighters are burning everything…"
  // Beat 3: "They won't let you pass."
  S[6] = {
    bg: 'city',
    npcColor: '#885500',
    beats: [
      {
        // Black + echo text fades in. A single silhouette in the fire.
        playerShow: false,
        npcPos: [{ at: 0, x: 0.50, state: 'idle', facing: -1, alpha: 0, show: false }],
        cam: { zoom: 1.0, cx: 0.50, cy: 0.50 },
        cityOpts: { skyTop: '#100200', skyMid: '#1a0400', skyBot: '#100200' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.40, alpha: 0.60, fadeIn: 40 },
        ],
        effects: [
          { type: 'echo_text', text: '"You\'re not the first."', color: '#aaccff', alpha: 0.85 },
        ],
        bubbleX: 0.50,
      },
      {
        // Player descends from above. Camera starts high, pans down into burning city.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.42, cy: 0.30 }, // high angle
          { at: 70, zoom: 1.10, cx: 0.40, cy: 0.52 }, // pan down to street
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'fall',  facing: 1 }, // dropping in
          { at: 35, x: 0.30, state: 'walk',  facing: 1 }, // lands, walks
          { at: 80, x: 0.34, state: 'look',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#14040a', skyMid: '#1e0808', skyBot: '#120606' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.65, alpha: 0.80, fadeIn: 30 },
          { type: 'smoke', alpha: 0.55 },
        ],
      },
      {
        // Full inferno. Camera low angle — buildings burn above. Two enemies silhouetted.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.60 }, // low angle
          { at: 80, zoom: 1.05, cx: 0.50, cy: 0.58 },
        ],
        playerPos: [{ at: 0, x: 0.20, state: 'crouch', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle',   facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#1e0600', skyMid: '#2a0c00', skyBot: '#180600' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 1.0, alpha: 0.95 },
          { type: 'smoke', alpha: 0.85 },
          { type: 'sky_bleed', alpha: 0.40 },
        ],
        extraFigures: [
          { xf: 0.56, color: '#885500', facing: -1, state: 'idle', alpha: 0.70 },
          { xf: 0.70, color: '#664400', facing: -1, state: 'idle', alpha: 0.60 },
        ],
      },
      {
        // Close two-shot confrontation. Fire roars behind both figures.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.55 },
          { at: 30, zoom: 1.28, cx: 0.50, cy: 0.52 },
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'guard', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.62, state: 'walk', facing: -1 },
          { at: 22, x: 0.60, state: 'idle', facing: -1 },
        ],
        cityOpts: { skyTop: '#1e0600', skyMid: '#2a0c00', skyBot: '#180600' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.90, alpha: 0.90 },
        ],
        extraFigures: [
          { xf: 0.76, color: '#664400', facing: -1, state: 'idle', alpha: 0.65 },
        ],
      },
    ],
  };

  // ── Chapter 7 — The Long Walk ────────────────────────────────────────────────
  // Beat 0: "The relay station signal…"
  // Beat 1: "Not a direct path…"
  // Beat 2: "'Walk east,' Veran said through static…"
  // Beat 3: "You started walking."
  S[7] = {
    bg: 'city',
    npcColor: '#4488dd',
    beats: [
      {
        // Establishing wide shot. Ruins. Beacon glows distantly.
        camAnim: [
          { at: 0,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.08, cx: 0.54, cy: 0.50 }, // slow push toward beacon
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#06101e', skyMid: '#0c1830', skyBot: '#081220' },
        effectsBehind: [
          { type: 'objective_marker', xf: 0.84, yf: 0.38, color: '#44ffaa', alpha: 0.85, fadeIn: 40 },
        ],
      },
      {
        // Ground-level tracking shot. Dimensional tears gape open at street level.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.08, cx: 0.54, cy: 0.50 },
          { at: 80, zoom: 1.12, cx: 0.58, cy: 0.52 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'walk', facing: 1 },
          { at: 60, x: 0.34, state: 'walk', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#06101e', skyMid: '#0c1830', skyBot: '#081220' },
        effectsBehind: [
          { type: 'multi_portals', alpha: 0.55, portals: [
            { xf: 0.44, yf: 0.66, height: 0.20, color: '#aa55ff', a: 0.65 },
            { xf: 0.62, yf: 0.62, height: 0.18, color: '#8833dd', a: 0.55 },
            { xf: 0.76, yf: 0.64, height: 0.22, color: '#bb66ff', a: 0.60 },
          ]},
          { type: 'objective_marker', xf: 0.90, yf: 0.36, color: '#44ffaa', alpha: 0.65 },
        ],
        extraFigures: [
          { xf: 0.50, color: '#665544', facing:  1, state: 'walk', alpha: 0.32 },
          { xf: 0.64, color: '#554433', facing: -1, state: 'idle', alpha: 0.25 },
        ],
      },
      {
        // Player pauses — holds ear (phone). Veran's comms crackle through.
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.40, cy: 0.52 },
          { at: 40, zoom: 1.45, cx: 0.34, cy: 0.50 }, // zoom to player face
        ],
        playerPos: [
          { at: 0,  x: 0.34, state: 'walk', facing: 1 },
          { at: 20, x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#06101e', skyMid: '#0c1830', skyBot: '#081220' },
        effects: [
          { type: 'static_noise', alpha: 0.45 },
          { type: 'phone', xf: 0.38, yf: 0.54, alpha: 0.85 },
        ],
        effectsBehind: [
          { type: 'objective_marker', xf: 0.90, yf: 0.36, color: '#44ffaa', alpha: 0.55 },
        ],
        bubbleX: 0.42,
      },
      {
        // Camera pulls wide. Player sets off into the distance.
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.34, cy: 0.50 },
          { at: 60, zoom: 1.00, cx: 0.50, cy: 0.50 }, // pull back as they walk away
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
          { at: 20, x: 0.50, state: 'walk', facing: 1 },
          { at: 80, x: 0.65, state: 'run',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.90, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#06101e', skyMid: '#0c1830', skyBot: '#081220' },
        effectsBehind: [
          { type: 'objective_marker', xf: 0.90, yf: 0.36, color: '#44ffaa', alpha: 0.50 },
        ],
      },
    ],
  };

  // ── Chapter 8 — Cache Discovery ──────────────────────────────────────────────
  // Beat 0: "Under a collapsed overpass: a door."
  // Beat 1: "…fragment resonated… the door opened."
  // Beat 2: "Inside: a cache. Equipment. Data. Weapons."
  // Beat 3: "'That lock was fragment-gated…'"
  S[8] = {
    bg: 'cave',
    npcColor: '#446688',
    beats: [
      {
        // Player discovers the door. Camera slowly pans to reveal it.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.40, cy: 0.52 },
          { at: 60, zoom: 1.20, cx: 0.52, cy: 0.52 }, // pan toward the door
        ],
        playerPos: [
          { at: 0,  x: 0.24, state: 'walk',  facing: 1 },
          { at: 45, x: 0.26, state: 'idle',  facing: 1 },
          { at: 65, x: 0.26, state: 'look',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'door', xf: 0.62, yf: 0.74, w2: 0.09, h2: 0.40, crack: 0 },
        ],
      },
      {
        // Fragment PULSES. Energy builds. Door blasts open — flash, shockwave, sparks.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.52, cy: 0.52 },
          { at: 40, zoom: 1.50, cx: 0.54, cy: 0.50 }, // push toward door
          { at: 65, zoom: 1.25, cx: 0.50, cy: 0.52 }, // pull back after blast
        ],
        camShake: [{ at: 62, strength: 16, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.26, state: 'reach', facing: 1 }, // reaching toward door
          { at: 60, x: 0.24, state: 'hit',   facing: 1 }, // knocked by blast
          { at: 80, x: 0.26, state: 'idle',  facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.80, fadeIn: 15 },
          { type: 'door_opening', xf: 0.62, yf: 0.74, w2: 0.09, h2: 0.40, openFrames: 30, startFrame: 55 },
          { type: 'speedlines', cx: 0.62, cy: 0.55, count: 20, color: '#4488ff', alpha: 0.60, startFrame: 55, fadeIn: 8 },
        ],
        effects: [
          { type: 'shockwave',    cx: 0.62, cy: 0.65, color: '#88ccff', startFrame: 62, duration: 30 },
          { type: 'impact_sparks', cx: 0.62, cy: 0.58, count: 14, color: '#88ccff', startFrame: 62, duration: 28 },
          { type: 'screen_flash', color: '#aaddff', startFrame: 62, duration: 12, alpha: 0.80 },
        ],
      },
      {
        // Camera pushes inside. Cache items glow in the darkness.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.25, cx: 0.50, cy: 0.52 },
          { at: 50, zoom: 1.10, cx: 0.52, cy: 0.55 }, // pull to wider interior view
        ],
        playerPos: [{ at: 0, x: 0.24, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effects: [
          { type: 'cache_items', alpha: 0.92, fadeIn: 35 },
        ],
        effectsBehind: [
          { type: 'door', xf: 0.62, yf: 0.74, w2: 0.09, h2: 0.40, crack: 1 },
        ],
      },
      {
        // Guard steps out of the shadow — close confrontation.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.52, cy: 0.55 },
          { at: 25, zoom: 1.30, cx: 0.50, cy: 0.52 },
        ],
        camShake: [{ at: 5, strength: 7, dur: 14 }],
        playerPos: [
          { at: 0,  x: 0.22, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.76, state: 'idle',  facing: -1, alpha: 0.0 },
          { at: 5,  x: 0.64, state: 'walk',  facing: -1, alpha: 0.7 },
          { at: 22, x: 0.62, state: 'talk',  facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.35 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.64, cy: 0.50, count: 14, color: '#446688', alpha: 0.40, startFrame: 4, duration: 16, fadeIn: 5 },
        ],
        bubbleX: 0.62,
      },
    ],
  };

  // ── Chapter 10 — The Lava Crossing ───────────────────────────────────────────
  // Beat 0: "The industrial quarter had been swallowed…"
  // Beat 1: "And on the other side: a direct line…"
  // Beat 2: "All you had to do was cross."
  S[10] = {
    bg: 'city',
    npcColor: '#cc4400',
    beats: [
      {
        // Wide establishing shot. Camera tilts down to reveal lava below.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.35 }, // high angle
          { at: 70, zoom: 1.10, cx: 0.50, cy: 0.55 }, // tilt down to reveal the lava
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#200400', skyMid: '#300800', skyBot: '#200400' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 1.0, alpha: 0.92 },
          { type: 'smoke', alpha: 0.80 },
        ],
      },
      {
        // Player looks across. The relay station beacon pulses in the distance.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.55 },
          { at: 50, zoom: 1.18, cx: 0.60, cy: 0.50 }, // look toward destination
        ],
        playerPos: [{ at: 0, x: 0.22, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#200400', skyMid: '#300800', skyBot: '#200400' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.85, alpha: 0.85 },
          { type: 'objective_marker', xf: 0.86, yf: 0.33, color: '#ff8844', alpha: 0.85, fadeIn: 30 },
        ],
      },
      {
        // Player commits — runs into the crossing. Camera tracks.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.60, cy: 0.50 },
          { at: 40, zoom: 1.22, cx: 0.65, cy: 0.52 }, // track the run
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'idle',  facing: 1 },
          { at: 18, x: 0.50, state: 'run',   facing: 1 },
        ],
        npcPos: [{ at: 0, x: 0.90, state: 'idle', facing: -1, alpha: 0, show: false }],
        cityOpts: { skyTop: '#200400', skyMid: '#300800', skyBot: '#200400' },
        effectsBehind: [
          { type: 'fire_glow', intensity: 0.80, alpha: 0.85 },
          { type: 'smoke', alpha: 0.55 },
        ],
      },
    ],
  };

  // ── Chapter 11 — The Relay Station ──────────────────────────────────────────
  // Beat 0: "The relay station hummed like a living thing…"
  // Beat 1: "'You made it further than any of the others.'"
  // Beat 2: "A woman stepped out… 'My name is Veran.'"
  S[11] = {
    bg: 'fracture',
    npcColor: '#4488dd',
    beats: [
      {
        // Sweeping wide shot of the relay station. Portals everywhere. Awe-inspiring.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.90, cx: 0.50, cy: 0.50 }, // wide
          { at: 80, zoom: 1.05, cx: 0.52, cy: 0.50 }, // slow push
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'walk', facing: 1 },
          { at: 60, x: 0.26, state: 'look', facing: 1 },
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
        // Voice comes from the largest portal. Camera drifts toward the light.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.52, cy: 0.50 },
          { at: 60, zoom: 1.30, cx: 0.64, cy: 0.46 }, // push toward portal
        ],
        playerPos: [{ at: 0, x: 0.24, state: 'look', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.80, state: 'idle', facing: -1, alpha: 0, show: false }],
        effectsBehind: [
          { type: 'portal', xf: 0.72, yf: 0.32, height: 0.60, color: '#44aaff', alpha: 0.90 },
          { type: 'speedlines', cx: 0.72, cy: 0.42, count: 16, color: '#88ccff', alpha: 0.35, fadeIn: 40 },
        ],
        bubbleX: 0.72,
      },
      {
        // Veran steps out. Camera pulls back to two-shot — a meeting of weight.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.30, cx: 0.64, cy: 0.46 },
          { at: 30, zoom: 1.20, cx: 0.52, cy: 0.50 }, // pull back to show both
        ],
        camShake: [{ at: 8, strength: 6, dur: 12 }],
        playerPos: [
          { at: 0,  x: 0.24, state: 'guard',  facing: 1 },
          { at: 30, x: 0.25, state: 'idle',   facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.78, state: 'idle',  facing: -1, alpha: 0.0 },
          { at: 8,  x: 0.70, state: 'reach', facing: -1, alpha: 0.7 },
          { at: 28, x: 0.67, state: 'talk',  facing: -1, alpha: 1.0 },
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.74, yf: 0.34, height: 0.50, color: '#44aaff', alpha: 0.60 },
        ],
        effects: [
          { type: 'speedlines', cx: 0.70, cy: 0.48, count: 14, color: '#4488dd', alpha: 0.45, startFrame: 7, duration: 20, fadeIn: 6 },
          { type: 'screen_flash', color: '#aaddff', startFrame: 8, duration: 10, alpha: 0.55 },
        ],
        bubbleX: 0.67,
      },
    ],
  };

  // ── Chapter 12 — What Veran Knew ─────────────────────────────────────────────
  // Beat 0: "'There's a rift entity'…"
  // Beat 1: "'The fragment inside you is the largest piece…'"
  // Beat 2: "'Which means it wants it.'"
  // Beat 3: "As if on cue, a portal opened behind you."
  S[12] = {
    bg: 'fracture',
    npcColor: '#4488dd',
    beats: [
      {
        // Slow push-in two-shot. Veran explains. Gravity builds.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.50, cy: 0.50 },
          { at: 90, zoom: 1.32, cx: 0.52, cy: 0.50 }, // slow push
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
      },
      {
        // Fragment pulse builds visibly on the player. Camera shifts to show it.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.32, cx: 0.52, cy: 0.50 },
          { at: 40, zoom: 1.45, cx: 0.35, cy: 0.50 }, // shift left onto player
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'idle', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.68, state: 'talk', facing: -1 }],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#4488ff', alpha: 0.80, fadeIn: 20 },
        ],
      },
      {
        // Urgency. Veran steps closer. Camera cuts between both faces (zoom oscillates).
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.35, cy: 0.50 },
          { at: 35, zoom: 1.45, cx: 0.66, cy: 0.50 }, // cut to Veran
          { at: 70, zoom: 1.35, cx: 0.50, cy: 0.50 }, // pull back together
        ],
        playerPos: [{ at: 0, x: 0.28, state: 'look', facing: 1 }],
        npcPos: [
          { at: 0,  x: 0.68, state: 'talk',  facing: -1 },
          { at: 30, x: 0.64, state: 'reach', facing: -1 }, // steps closer for emphasis
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#6644ff', alpha: 0.60 },
        ],
      },
      {
        // PORTAL RIPS OPEN BEHIND THE PLAYER. Everything changes.
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.50, cy: 0.50 },
          { at: 8,  zoom: 1.10, cx: 0.30, cy: 0.50 }, // SNAP left — portal is behind player
          { at: 50, zoom: 1.18, cx: 0.32, cy: 0.50 },
        ],
        camShake: [{ at: 8, strength: 20, dur: 30 }],
        playerPos: [
          { at: 0,  x: 0.42, state: 'idle',  facing:  1 },
          { at: 8,  x: 0.42, state: 'hit',   facing: -1 }, // spins to look behind
          { at: 22, x: 0.44, state: 'look',  facing: -1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'talk',  facing: -1 },
          { at: 8,  x: 0.66, state: 'look',  facing:  1 }, // Veran also reacts
        ],
        effectsBehind: [
          { type: 'portal', xf: 0.08, yf: 0.42, height: 0.56, color: '#ff00cc', alpha: 0.90, fadeIn: 15 },
          { type: 'sky_bleed', alpha: 0.50 },
          { type: 'speedlines', cx: 0.08, cy: 0.50, count: 24, color: '#ff00cc', alpha: 0.60, startFrame: 8, fadeIn: 8 },
        ],
        effects: [
          { type: 'shockwave',    cx: 0.12, cy: 0.65, color: '#ff44cc', startFrame: 8,  duration: 40 },
          { type: 'impact_sparks', cx: 0.10, cy: 0.55, count: 14, color: '#ff44cc', startFrame: 8, duration: 30 },
          { type: 'screen_flash', color: '#ff00cc', startFrame: 8, duration: 16, alpha: 0.70 },
        ],
      },
    ],
  };


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
    bg: 'fracture',
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

  // ─── Chapter 70 — The Weight of What's Coming ──────────────────────────
  S[70] = {
    bg: 'fracture',
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.85, cx: 0.50, cy: 0.50 },
          { at: 50,  zoom: 1.00, cx: 0.50, cy: 0.50 },
          { at: 120, zoom: 1.15, cx: 0.45, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.18, state: 'run',  facing: 1 },
          { at: 35, x: 0.28, state: 'idle', facing: 1 },
          { at: 70, x: 0.28, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'portal', cx: 0.10, cy: 0.50, alpha: 0.80, fadeIn: 10 },
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.30, fadeIn: 35 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.65, cy: 0.48 },
          { at: 50,  zoom: 0.92, cx: 0.60, cy: 0.50 },
          { at: 110, zoom: 0.85, cx: 0.58, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1 },
          { at: 50, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 0.0, scale: 1.45, show: false },
          { at: 15, x: 0.72, state: 'idle', facing: -1, alpha: 0.4, scale: 1.45, show: true },
          { at: 60, x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.65, fadeIn: 20 },
          { type: 'sky_cracks', alpha: 0.50, fadeIn: 30 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 24, color: '#cc44ff', alpha: 0.45, startFrame: 15, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc44ff', startFrame: 15, duration: 22, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.72, cy: 0.50, color: '#cc44ff', startFrame: 15, duration: 55 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.36, cy: 0.48 },
          { at: 60, zoom: 1.35, cx: 0.32, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1 },
          { at: 40, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.55, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.60, fadeIn: 12 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.90, cx: 0.58, cy: 0.50 },
          { at: 40, zoom: 1.05, cx: 0.62, cy: 0.50 },
          { at: 90, zoom: 1.18, cx: 0.65, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.45 },
          { at: 30, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 18 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 20, color: '#cc44ff', alpha: 0.40, startFrame: 25, fadeIn: 10 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 25, zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 55, zoom: 1.45, cx: 0.50, cy: 0.50 },
          { at: 85, zoom: 1.30, cx: 0.54, cy: 0.50 },
        ],
        camShake: [{ at: 20, strength: 5, dur: 18 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 18, x: 0.32, state: 'attack', facing: 1 },
          { at: 40, x: 0.30, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.45 },
          { at: 25, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.45 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.80, fadeIn: 12 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 30, color: '#cc44ff', alpha: 0.65, startFrame: 18, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.75, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc44ff', startFrame: 20, duration: 18, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#cc44ff', startFrame: 20, duration: 50 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 24, color: '#ffaaff', startFrame: 20, duration: 35 },
        ],
        bubbleX: 0.72,
      },
    ],
  };

  // ─── Chapter 72 — What Axiom Wants ───────────────────────────────────────
  S[72] = {
    bg: 'fracture',
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.15, cx: 0.50, cy: 0.50 },
          { at: 60, zoom: 1.30, cx: 0.48, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'walk', facing: 1 },
          { at: 18, x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.50, fadeIn: 20 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.28, cx: 0.68, cy: 0.48 },
          { at: 50, zoom: 1.40, cx: 0.70, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.40 },
          { at: 20, x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.55, fadeIn: 15 },
          { type: 'sky_cracks', alpha: 0.40, fadeIn: 25 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.35, cx: 0.70, cy: 0.48 },
          { at: 40, zoom: 1.50, cx: 0.68, cy: 0.48 },
          { at: 90, zoom: 1.35, cx: 0.68, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.32, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.70, fadeIn: 12 },
          { type: 'speedlines', cx: 0.70, cy: 0.45, count: 20, color: '#cc44ff', alpha: 0.45, startFrame: 20, fadeIn: 10 },
        ],
        effects: [
          { type: 'screen_flash', color: '#cc44ff', startFrame: 25, duration: 16, alpha: 0.40 },
          { type: 'shockwave',    cx: 0.70, cy: 0.55, color: '#cc44ff', startFrame: 25, duration: 45 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 45,  zoom: 1.20, cx: 0.52, cy: 0.50 },
          { at: 100, zoom: 1.35, cx: 0.54, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'idle', facing: 1 },
          { at: 50, x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.40 },
          { at: 60, x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 15 },
          { type: 'static_noise', alpha: 0.30, fadeIn: 20 },
        ],
        bubbleX: 0.70,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.38, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.55, cx: 0.50, cy: 0.48 },
          { at: 80, zoom: 1.42, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 30, strength: 4, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.70, state: 'idle', facing: -1, alpha: 1.0, scale: 1.40 },
          { at: 22, x: 0.70, state: 'talk', facing: -1, alpha: 1.0, scale: 1.40 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.80, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 26, color: '#cc44ff', alpha: 0.60, startFrame: 22, fadeIn: 8 },
          { type: 'sky_cracks', alpha: 0.65, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc44ff', startFrame: 30, duration: 18, alpha: 0.50 },
          { type: 'shockwave',     cx: 0.50, cy: 0.55, color: '#cc44ff', startFrame: 30, duration: 48 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 20, color: '#ffaaff', startFrame: 30, duration: 30 },
        ],
        bubbleX: 0.70,
      },
    ],
  };


  // ─── Chapter 76 — The First Gate ─────────────────────────────────────────
  S[76] = {
    bg: 'space',
    npcColor: '#ccaa44',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 0.90, cx: 0.35, cy: 0.50 },
          { at: 60, zoom: 1.08, cx: 0.38, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.22, state: 'walk', facing: 1 },
          { at: 45, x: 0.30, state: 'idle', facing: 1 },
          { at: 80, x: 0.30, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.30, fadeIn: 30 },
          { type: 'static_noise', alpha: 0.20, fadeIn: 20 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.55, cy: 0.50 },
          { at: 55,  zoom: 0.88, cx: 0.60, cy: 0.50 },
          { at: 110, zoom: 0.82, cx: 0.62, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.30, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'energy_burst', cx: 0.80, cy: 0.40, color: '#ccaa44', alpha: 0.60, fadeIn: 20 },
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.45, fadeIn: 25 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ffdd88', startFrame: 20, duration: 20, alpha: 0.30 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.20, cx: 0.70, cy: 0.48 },
          { at: 50, zoom: 1.38, cx: 0.72, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.60, fadeIn: 18 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 18, color: '#ccaa44', alpha: 0.40, startFrame: 20, fadeIn: 10 },
        ],
        bubbleX: 0.80,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.22, cx: 0.52, cy: 0.50 },
          { at: 90, zoom: 1.35, cx: 0.54, cy: 0.48 },
        ],
        camShake: [{ at: 55, strength: 4, dur: 22 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',  facing: 1 },
          { at: 45, x: 0.28, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.68, state: 'idle', facing: -1, alpha: 0.0, scale: 1.10, show: false },
          { at: 25, x: 0.68, state: 'idle', facing: -1, alpha: 0.5, scale: 1.10, show: true },
          { at: 55, x: 0.68, state: 'idle', facing: -1, alpha: 1.0, scale: 1.10 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.70, fadeIn: 14 },
          { type: 'speedlines', cx: 0.68, cy: 0.50, count: 22, color: '#ccaa44', alpha: 0.55, startFrame: 25, fadeIn: 8 },
          { type: 'energy_burst', cx: 0.80, cy: 0.40, color: '#ccaa44', alpha: 0.50, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ffdd88', startFrame: 55, duration: 16, alpha: 0.40 },
          { type: 'shockwave',     cx: 0.68, cy: 0.58, color: '#ccaa44', startFrame: 55, duration: 45 },
          { type: 'impact_sparks', cx: 0.68, cy: 0.50, count: 18, color: '#ffeeaa', startFrame: 55, duration: 28 },
        ],
        bubbleX: 0.80,
      },
    ],
  };

  // ─── Chapter 80 — Proof of Understanding ─────────────────────────────────
  S[80] = {
    bg: 'space',
    npcColor: '#ccaa44',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.88, cx: 0.55, cy: 0.50 },
          { at: 50,  zoom: 1.05, cx: 0.60, cy: 0.50 },
          { at: 110, zoom: 1.20, cx: 0.62, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.26, state: 'idle',  facing: 1 },
          { at: 40, x: 0.28, state: 'guard', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.38 },
          { at: 35, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.38 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.65, fadeIn: 20 },
          { type: 'energy_burst', cx: 0.72, cy: 0.40, color: '#ccaa44', alpha: 0.55, fadeIn: 22 },
        ],
        effects: [
          { type: 'screen_flash', color: '#ffdd88', startFrame: 25, duration: 18, alpha: 0.35 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.22, cx: 0.50, cy: 0.50 },
          { at: 50,  zoom: 1.38, cx: 0.50, cy: 0.48 },
          { at: 100, zoom: 1.25, cx: 0.52, cy: 0.50 },
        ],
        camShake: [{ at: 40, strength: 3, dur: 20 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 35, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.38 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.75, fadeIn: 14 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 22, color: '#ffdd88', alpha: 0.50, startFrame: 20, fadeIn: 10 },
          { type: 'sky_cracks', alpha: 0.45, fadeIn: 22 },
        ],
        effects: [
          { type: 'shockwave',     cx: 0.72, cy: 0.55, color: '#ccaa44', startFrame: 40, duration: 50 },
          { type: 'impact_sparks', cx: 0.72, cy: 0.50, count: 20, color: '#ffeeaa', startFrame: 40, duration: 32 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.50, cy: 0.50 },
          { at: 30,  zoom: 1.30, cx: 0.50, cy: 0.50 },
          { at: 65,  zoom: 1.45, cx: 0.50, cy: 0.48 },
          { at: 100, zoom: 1.30, cx: 0.50, cy: 0.50 },
        ],
        camShake: [{ at: 28, strength: 6, dur: 25 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 22, x: 0.32, state: 'attack', facing: 1 },
          { at: 50, x: 0.30, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.38 },
          { at: 22, x: 0.72, state: 'attack', facing: -1, alpha: 1.0, scale: 1.38 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#ccaa44', alpha: 0.85, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 30, color: '#ffdd88', alpha: 0.70, startFrame: 22, fadeIn: 6 },
          { type: 'sky_cracks', alpha: 0.75, fadeIn: 12 },
          { type: 'energy_burst', cx: 0.72, cy: 0.40, color: '#ffcc44', alpha: 0.65, fadeIn: 15 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#ffdd88', startFrame: 28, duration: 20, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.58, color: '#ccaa44', startFrame: 28, duration: 55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 26, color: '#ffeeaa', startFrame: 28, duration: 38 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#aa8822', startFrame: 28, duration: 55 },
        ],
        bubbleX: 0.72,
      },
    ],
  };


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

  // ─── Chapter 148 — Before the End ────────────────────────────────────────
  S[148] = {
    bg: 'fracture',
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.88, cx: 0.50, cy: 0.50 },
          { at: 60,  zoom: 1.05, cx: 0.50, cy: 0.50 },
          { at: 130, zoom: 1.18, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 60, x: 0.28, state: 'look', facing: 1 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.45, fadeIn: 28 },
          { type: 'static_noise', alpha: 0.25, fadeIn: 20 },
          { type: 'sky_cracks', alpha: 0.40, fadeIn: 35 },
        ],
        bubbleX: 0.82,
      },
      {
        // TrueForm lists what it's done. Player just... stands there.
        // The stillness is the statement. Everything this being says just makes them more certain.
        letterbox: true,
        playerExpr: 'cool',
        camAnim: [
          { at: 0,  zoom: 1.18, cx: 0.50, cy: 0.50 },
          { at: 35, zoom: 1.40, cx: 0.30, cy: 0.48 }, // drift to player — let the camera say what they won't
          { at: 80, zoom: 1.32, cx: 0.50, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1, expr: 'cool' },
          { at: 40, x: 0.28, state: 'idle', facing: 1, expr: 'cool' }, // settles. Not affected.
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 20 },
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 22 },
          { type: 'static_noise', alpha: 0.30, fadeIn: 18 },
        ],
        effects: [
          { type: 'screen_flash', color: '#550088', startFrame: 20, duration: 20, alpha: 0.35 },
        ],
        bubbleX: 0.82,
      },
      {
        // "I am telling you this so it is not a secret. Walk in with the truth."
        // Player absorbs it. Serene. They already knew.
        letterbox: true,
        playerExpr: 'serene',
        camAnim: [
          { at: 0,   zoom: 1.32, cx: 0.50, cy: 0.50 },
          { at: 35,  zoom: 1.55, cx: 0.28, cy: 0.46 }, // tight on player — hold there
          { at: 100, zoom: 1.45, cx: 0.30, cy: 0.48 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1, expr: 'serene' },
          { at: 40, x: 0.28, state: 'look', facing: 1, expr: 'serene' },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.75, fadeIn: 14 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 22, color: '#cc44ff', alpha: 0.58, startFrame: 22, fadeIn: 10 },
          { type: 'sky_cracks', alpha: 0.65, fadeIn: 16 },
        ],
        effects: [
          { type: 'screen_flash', color: '#660099', startFrame: 25, duration: 18, alpha: 0.45 },
          { type: 'shockwave',    cx: 0.50, cy: 0.55, color: '#cc44ff', startFrame: 25, duration: 50 },
        ],
        bubbleX: 0.82,
      },
      {
        // The choice is at hand. Player carries ninety-four bearers plus the truth.
        // Camera holds close. The expression says everything.
        letterbox: true,
        playerExpr: 'serene',
        camAnim: [
          { at: 0,  zoom: 1.45, cx: 0.50, cy: 0.50 },
          { at: 40, zoom: 1.62, cx: 0.28, cy: 0.46 }, // final close — face only
          { at: 90, zoom: 1.48, cx: 0.30, cy: 0.48 },
        ],
        camShake: [{ at: 38, strength: 5, dur: 24 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1, expr: 'serene' },
          { at: 35, x: 0.28, state: 'idle', facing: 1, expr: 'serene' }, // perfectly still. Decided.
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.85, fadeIn: 10 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 28, color: '#cc44ff', alpha: 0.70, startFrame: 18, fadeIn: 7 },
          { type: 'sky_cracks', alpha: 0.80, fadeIn: 12 },
          { type: 'static_noise', alpha: 0.45, fadeIn: 14 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#aa00cc', startFrame: 38, duration: 22, alpha: 0.55 },
          { type: 'shockwave',     cx: 0.50, cy: 0.55, color: '#cc44ff', startFrame: 38, duration: 55 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.50, count: 22, color: '#ffaaff', startFrame: 38, duration: 35 },
        ],
        bubbleX: 0.82,
      },
    ],
  };

  // ─── Chapter 150 — True Form ──────────────────────────────────────────────
  S[150] = {
    bg: 'fracture',
    npcColor: '#cc44ff',
    beats: [
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 0.78, cx: 0.50, cy: 0.50 },
          { at: 65,  zoom: 0.95, cx: 0.52, cy: 0.50 },
          { at: 140, zoom: 1.10, cx: 0.54, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle', facing: 1 },
          { at: 65, x: 0.28, state: 'look', facing: 1 },
        ],
        npcPos: [
          { at: 0,   x: 0.72, state: 'idle', facing: -1, alpha: 0.0, scale: 1.52, show: false },
          { at: 25,  x: 0.72, state: 'idle', facing: -1, alpha: 0.3, scale: 1.52, show: true },
          { at: 80,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.52 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.60, fadeIn: 25 },
          { type: 'sky_cracks', alpha: 0.55, fadeIn: 30 },
          { type: 'speedlines', cx: 0.72, cy: 0.45, count: 22, color: '#cc44ff', alpha: 0.45, startFrame: 25, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash', color: '#660099', startFrame: 25, duration: 28, alpha: 0.50 },
          { type: 'shockwave',    cx: 0.72, cy: 0.55, color: '#cc44ff', startFrame: 25, duration: 60 },
        ],
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,   zoom: 1.10, cx: 0.66, cy: 0.48 },
          { at: 50,  zoom: 0.88, cx: 0.62, cy: 0.50 },
          { at: 110, zoom: 0.78, cx: 0.60, cy: 0.50 },
        ],
        playerPos: [
          { at: 0,  x: 0.28, state: 'look', facing: 1 },
          { at: 55, x: 0.28, state: 'idle', facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle', facing: -1, alpha: 1.0, scale: 1.52 },
          { at: 30, x: 0.72, state: 'talk', facing: -1, alpha: 1.0, scale: 1.52 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.75, fadeIn: 18 },
          { type: 'sky_cracks', alpha: 0.65, fadeIn: 20 },
          { type: 'energy_burst', cx: 0.72, cy: 0.38, color: '#ff88ff', alpha: 0.60, fadeIn: 22 },
        ],
        effects: [
          { type: 'screen_flash', color: '#880099', startFrame: 22, duration: 22, alpha: 0.50 },
          { type: 'shockwave',    cx: 0.72, cy: 0.55, color: '#cc44ff', startFrame: 22, duration: 60 },
        ],
        bubbleX: 0.72,
      },
      {
        letterbox: true,
        camAnim: [
          { at: 0,  zoom: 1.12, cx: 0.36, cy: 0.50 },
          { at: 35, zoom: 1.30, cx: 0.35, cy: 0.50 },
          { at: 80, zoom: 1.45, cx: 0.34, cy: 0.48 },
          { at: 120, zoom: 1.30, cx: 0.35, cy: 0.50 },
        ],
        camShake: [{ at: 32, strength: 8, dur: 35 }],
        playerPos: [
          { at: 0,  x: 0.28, state: 'idle',   facing: 1 },
          { at: 25, x: 0.28, state: 'attack', facing: 1 },
          { at: 55, x: 0.28, state: 'guard',  facing: 1 },
        ],
        npcPos: [
          { at: 0,  x: 0.72, state: 'idle',   facing: -1, alpha: 1.0, scale: 1.52 },
          { at: 28, x: 0.72, state: 'attack', facing: -1, alpha: 1.0, scale: 1.52 },
        ],
        effectsBehind: [
          { type: 'fragment_pulse', color: '#cc44ff', alpha: 0.95, fadeIn: 8 },
          { type: 'speedlines', cx: 0.50, cy: 0.50, count: 36, color: '#cc44ff', alpha: 0.90, startFrame: 15, fadeIn: 4 },
          { type: 'sky_cracks', alpha: 0.90, fadeIn: 8 },
          { type: 'energy_burst', cx: 0.72, cy: 0.38, color: '#ff44ff', alpha: 0.80, fadeIn: 12 },
        ],
        effects: [
          { type: 'screen_flash',  color: '#cc00ff', startFrame: 32, duration: 28, alpha: 0.75 },
          { type: 'shockwave',     cx: 0.50, cy: 0.60, color: '#aa00cc', startFrame: 32, duration: 65 },
          { type: 'impact_sparks', cx: 0.50, cy: 0.55, count: 34, color: '#ff88ff', startFrame: 32, duration: 50 },
          { type: 'ground_crack',  cx: 0.50, cy: 0.68, color: '#660099', startFrame: 32, duration: 70 },
        ],
      },
    ],
  };

  // ── Chapter 125: The Architecture of the Lie ─────────────────────────────────
  S[125] = {
    bg: 'fracture',
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

})(window.STORY_SCENE_SPECS);

