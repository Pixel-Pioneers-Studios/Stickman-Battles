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

})(window.STORY_SCENE_SPECS);
