'use strict';
// js/story/scenes/actvoidmind.js — cinematic scene specs for actvoidmind.
// Split out of the former single-file js/smb-story-scenes.js; content unchanged.
// Every file here merges into the shared window.STORY_SCENE_SPECS, so load order
// AMONG these files does not matter — only that they all load BEFORE
// js/smb-story-narrative-scene.js, which reads the table.
//
// 13 specs — chapter ids: 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 185

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};

(function (S) {

  // ── Chapter 172 — Into the Substrate (13 beats) ─────────────────────────────
  // Below all dimensions. No figure to face — the Substrate is not a character,
  // it is an attention. Staged almost entirely as stillness and scale.
  S[172] = {
    bg: 'space',
    npcColor: '#220033',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.46, cy: 0.50 }, { at: 90, zoom: 0.96, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
      },
      {
        // The quiet underneath.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.96, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.80, cx: 0.50, cy: 0.44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.34, fadeIn: 50 }],
      },
      {
        // The fragment still for the first time in the story.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.80, cx: 0.50, cy: 0.44 }, { at: 80, zoom: 1.30, cx: 0.42, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#334455', alpha: 0.18 }],
      },
      {
        // You became aware of something.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.42, cy: 0.49 }, { at: 60, zoom: 1.14, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'look', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.14 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
      },
      {
        // An attention.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.76, cx: 0.50, cy: 0.42 }],
        camShake: [{ at: 40, strength: 3, dur: 50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.40 },
          { type: 'echo_text', color: '#553377', alpha: 0.20 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.76, cx: 0.50, cy: 0.42 }, { at: 90, zoom: 0.90, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.36 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.12 }],
      },
      {
        // "Not against you."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.50, cy: 0.50 }, { at: 70, zoom: 1.20, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#553377', alpha: 0.26 }],
      },
      {
        // The Substrate does not speak.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.84, cx: 0.50, cy: 0.46 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        // Something begins.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.84, cx: 0.50, cy: 0.46 }, { at: 90, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 60, strength: 4, dur: 30 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effects: [{ type: 'screen_flash', color: '#553377', startFrame: 60, duration: 22, alpha: 0.24 }],
      },
    ],
  };

  // ── Chapter 173 — What You Know (Reckoning) ─────────────────────────────────
  // One of the eight reckonings. They share a deliberate visual language —
  // no opposing figure, a slowly tightening frame and a rising accent — so the
  // sequence reads as one continuous interrogation rather than eight scenes.
  S[173] = {
    bg: 'space',
    npcColor: '#332244',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.02, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.16, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }, { at: 50, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'echo_text', color: '#332244', alpha: 0.24 },
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
        ],
      },
      {
        // The question lands and the frame gives him nowhere to stand.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 40, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.02, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#332244', alpha: 0.28 }],
      },
    ],
  };

  // ── Chapter 174 — The Work They Left (Reckoning) ─────────────────────────────────
  // One of the eight reckonings. They share a deliberate visual language —
  // no opposing figure, a slowly tightening frame and a rising accent — so the
  // sequence reads as one continuous interrogation rather than eight scenes.
  S[174] = {
    bg: 'space',
    npcColor: '#33254a',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.04, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.18, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }, { at: 50, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'echo_text', color: '#33254a', alpha: 0.24 },
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
        ],
      },
      {
        // The question lands and the frame gives him nowhere to stand.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 40, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.04, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#33254a', alpha: 0.28 }],
      },
    ],
  };

  // ── Chapter 175 — What Was Left (Reckoning) ─────────────────────────────────
  // One of the eight reckonings. They share a deliberate visual language —
  // no opposing figure, a slowly tightening frame and a rising accent — so the
  // sequence reads as one continuous interrogation rather than eight scenes.
  S[175] = {
    bg: 'space',
    npcColor: '#2e2246',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.20, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }, { at: 50, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'echo_text', color: '#2e2246', alpha: 0.24 },
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
        ],
      },
      {
        // The question lands and the frame gives him nowhere to stand.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 40, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.06, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#2e2246', alpha: 0.28 }],
      },
    ],
  };

  // ── Chapter 176 — Their Names (Reckoning) ─────────────────────────────────
  // One of the eight reckonings. They share a deliberate visual language —
  // no opposing figure, a slowly tightening frame and a rising accent — so the
  // sequence reads as one continuous interrogation rather than eight scenes.
  S[176] = {
    bg: 'space',
    npcColor: '#3a2850',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.08, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.24, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }, { at: 50, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'echo_text', color: '#3a2850', alpha: 0.24 },
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
        ],
      },
      {
        // The question lands and the frame gives him nowhere to stand.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.24, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 40, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.08, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#3a2850', alpha: 0.28 }],
      },
    ],
  };

  // ── Chapter 177 — The Line You Drew (Reckoning) ─────────────────────────────────
  // One of the eight reckonings. They share a deliberate visual language —
  // no opposing figure, a slowly tightening frame and a rising accent — so the
  // sequence reads as one continuous interrogation rather than eight scenes.
  S[177] = {
    bg: 'space',
    npcColor: '#402a58',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.26, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }, { at: 50, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.26, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'echo_text', color: '#402a58', alpha: 0.24 },
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
        ],
      },
      {
        // The question lands and the frame gives him nowhere to stand.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.26, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 40, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.10, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#402a58', alpha: 0.28 }],
      },
    ],
  };

  // ── Chapter 178 — What God Built (Reckoning) ─────────────────────────────────
  // One of the eight reckonings. They share a deliberate visual language —
  // no opposing figure, a slowly tightening frame and a rising accent — so the
  // sequence reads as one continuous interrogation rather than eight scenes.
  S[178] = {
    bg: 'space',
    npcColor: '#452c5e',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.30, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }, { at: 50, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'echo_text', color: '#452c5e', alpha: 0.24 },
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
        ],
      },
      {
        // The question lands and the frame gives him nowhere to stand.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 40, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.12, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#452c5e', alpha: 0.28 }],
      },
    ],
  };

  // ── Chapter 179 — What You Carried (Reckoning) ─────────────────────────────────
  // One of the eight reckonings. They share a deliberate visual language —
  // no opposing figure, a slowly tightening frame and a rising accent — so the
  // sequence reads as one continuous interrogation rather than eight scenes.
  S[179] = {
    bg: 'space',
    npcColor: '#4a2e64',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.14, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.32, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }, { at: 50, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'echo_text', color: '#4a2e64', alpha: 0.24 },
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
        ],
      },
      {
        // The question lands and the frame gives him nowhere to stand.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.32, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 40, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.14, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#4a2e64', alpha: 0.28 }],
      },
    ],
  };

  // ── Chapter 180 — What Remains (Reckoning) ─────────────────────────────────
  // One of the eight reckonings. They share a deliberate visual language —
  // no opposing figure, a slowly tightening frame and a rising accent — so the
  // sequence reads as one continuous interrogation rather than eight scenes.
  S[180] = {
    bg: 'space',
    npcColor: '#50306a',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.36, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }, { at: 50, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
          { type: 'static_noise', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.36, cx: 0.44, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [
          { type: 'echo_text', color: '#50306a', alpha: 0.24 },
          { type: 'sky_bleed', color: '#220033', alpha: 0.34 },
        ],
      },
      {
        // The question lands and the frame gives him nowhere to stand.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.36, cx: 0.44, cy: 0.49 }, { at: 90, zoom: 0.82, cx: 0.50, cy: 0.44 }],
        camShake: [{ at: 40, strength: 3, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.42 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.82, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.16, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#50306a', alpha: 0.28 }],
      },
    ],
  };

  // ── Chapter 181 — What Is Yours (Trial, 54 lines) ───────────────────────────
  // The Void Vessel: the trial made a body to argue with.
  S[181] = {
    bg: 'space',
    npcColor: '#553377',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.46 }, { at: 90, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.38, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.40 }],
      },
      {
        // The vessel forms.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.56, cy: 0.50 }, { at: 70, zoom: 1.22, cx: 0.62, cy: 0.49 }],
        camShake: [{ at: 26, strength: 8, dur: 34 }],
        playerPos: [{ at: 0, x: 0.38, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'float', facing: -1, alpha: 0.0 }, { at: 60, x: 0.66, state: 'float', facing: -1, alpha: 0.95 }],
        effects: [
          { type: 'energy_burst', cx: 0.66, cy: 0.52, color: '#553377', startFrame: 24, duration: 44 },
          { type: 'screen_flash', color: '#7744aa', startFrame: 24, duration: 18, alpha: 0.34 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.62, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.38, state: 'listen', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'talk',   facing: -1 }],
        effectsBehind: [{ type: 'echo_text', color: '#553377', alpha: 0.26 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.22, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 1.02, cx: 0.50, cy: 0.50 }],
        camShake: [{ at: 60, strength: 6, dur: 26 }],
        playerPos: [{ at: 0, x: 0.38, state: 'guard', facing: 1 }],
        npcPos:    [{ at: 0, x: 0.66, state: 'guard', facing: -1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.44 }],
        effects: [{ type: 'impact_sparks', cx: 0.52, cy: 0.52, count: 16, color: '#7744aa', startFrame: 58, duration: 28 }],
      },
    ],
  };

  // ── Chapter 182 — After (50 lines) ──────────────────────────────────────────
  S[182] = {
    bg: 'space',
    npcColor: '#553377',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.46, cy: 0.50 }, { at: 90, zoom: 0.90, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.36 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.90, cx: 0.50, cy: 0.48 }, { at: 90, zoom: 1.18, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.18, cx: 0.44, cy: 0.50 }, { at: 90, zoom: 0.86, cx: 0.50, cy: 0.46 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
    ],
  };

  // ── Chapter 183 — The Verdict (20 beats) ────────────────────────────────────
  // Eight reckonings assembled into a judgement, and the fragment answering it.
  S[183] = {
    bg: 'space',
    npcColor: '#553377',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 1.06, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.40 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.12 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.46, cy: 0.50 }, { at: 80, zoom: 0.84, cx: 0.50, cy: 0.44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.44 }],
      },
      {
        // Eight reckonings' worth of record.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.84, cx: 0.50, cy: 0.44 }, { at: 90, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#553377', alpha: 0.28 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
      },
      {
        // The Substrate shifts.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 60, zoom: 0.80, cx: 0.50, cy: 0.42 }],
        camShake: [{ at: 20, strength: 6, dur: 50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_cracks', color: '#553377', alpha: 0.30, fadeIn: 30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.80, cx: 0.50, cy: 0.42 }, { at: 90, zoom: 1.12, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
      },
      {
        // "I have the complete record."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#553377', alpha: 0.32 }],
      },
      {
        // "The dimensions were not worth protecting."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.12, cx: 0.46, cy: 0.50 }, { at: 70, zoom: 1.34, cx: 0.42, cy: 0.49 }],
        camShake: [{ at: 30, strength: 4, dur: 40 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#220033', alpha: 0.48 },
          { type: 'static_noise', alpha: 0.16 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.42, cy: 0.49 }, { at: 80, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#553377', alpha: 0.26 }],
      },
      {
        // "You won. The system is gone."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.50, cy: 0.50 }, { at: 80, zoom: 0.88, cx: 0.50, cy: 0.46 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.44 }],
      },
      {
        // "This is not an accusation."
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.88, cx: 0.50, cy: 0.46 }, { at: 90, zoom: 1.20, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
      },
      {
        // The Substrate stilled.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.06 }],
      },
      {
        // The fragment burned. In answer.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.20, cx: 0.44, cy: 0.50 }, { at: 60, zoom: 1.40, cx: 0.42, cy: 0.48 }],
        camShake: [{ at: 30, strength: 7, dur: 44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'guard', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.70, fadeIn: 20 }],
        effects: [
          { type: 'screen_flash', color: '#88ddff', startFrame: 30, duration: 22, alpha: 0.40 },
          { type: 'energy_burst', cx: 0.44, cy: 0.52, color: '#88ddff', startFrame: 30, duration: 50 },
        ],
      },
    ],
  };

  // ── Chapter 185 — What Cannot Be Erased (18 beats) ──────────────────────────
  // The last chapter in the game. The attention withdraws; the fragment goes
  // still — not against a threat, but in answer to him. Ends on open sky.
  S[185] = {
    bg: 'space',
    npcColor: '#553377',
    beats: [
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.50, cy: 0.50 }, { at: 90, zoom: 0.92, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.40 }],
      },
      {
        // The attention withdraws.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.92, cx: 0.50, cy: 0.48 }, { at: 90, zoom: 0.80, cx: 0.50, cy: 0.42 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.30 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.80, cx: 0.50, cy: 0.42 }, { at: 90, zoom: 1.00, cx: 0.48, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.08 }],
      },
      {
        // The hypothesis, stated plainly.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.00, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 1.16, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#553377', alpha: 0.24 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.44, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'sky_bleed', color: '#220033', alpha: 0.34 }],
      },
      {
        // The fragment found Kael because his identity resists dissolution.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.16, cx: 0.44, cy: 0.50 }, { at: 90, zoom: 1.34, cx: 0.42, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.44 }],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.34, cx: 0.42, cy: 0.49 }, { at: 90, zoom: 0.94, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
      },
      {
        // The Preserved.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.48 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        extraFigures: [
          { xf: 0.62, color: '#445577', facing: -1, state: 'idle', alpha: 0.18 },
          { xf: 0.72, color: '#3d4a68', facing: -1, state: 'idle', alpha: 0.14 },
          { xf: 0.82, color: '#36405a', facing: -1, state: 'idle', alpha: 0.10 },
        ],
      },
      {
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.94, cx: 0.50, cy: 0.48 }, { at: 90, zoom: 1.10, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'static_noise', alpha: 0.10 }],
      },
      {
        // The record said:
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.46, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'listen', facing: 1 }],
        effectsBehind: [{ type: 'echo_text', color: '#553377', alpha: 0.26 }],
      },
      {
        // The fragment was still.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.10, cx: 0.44, cy: 0.50 }, { at: 90, zoom: 1.30, cx: 0.42, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.36 }],
      },
      {
        // Not responding to a threat. Still.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.42, cy: 0.49 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#66ccff', alpha: 0.42 }],
      },
      {
        // For the first time since the first alley — it was responding to you.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.30, cx: 0.42, cy: 0.49 }, { at: 90, zoom: 1.06, cx: 0.48, cy: 0.50 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#88ddff', alpha: 0.55, fadeIn: 30 }],
      },
      {
        // Something that had been travelling a very long time.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 1.06, cx: 0.48, cy: 0.50 }, { at: 90, zoom: 0.86, cx: 0.50, cy: 0.44 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [{ type: 'fragment_pulse', color: '#88ddff', alpha: 0.40 }],
      },
      {
        // Not because the journey was over. Open out and end.
        letterbox: true,
        camAnim: [{ at: 0, zoom: 0.86, cx: 0.50, cy: 0.44 }, { at: 120, zoom: 0.74, cx: 0.50, cy: 0.38 }],
        playerPos: [{ at: 0, x: 0.42, state: 'idle', facing: 1 }],
        effectsBehind: [
          { type: 'sky_bleed', color: '#112244', alpha: 0.26 },
          { type: 'fragment_pulse', color: '#88ddff', alpha: 0.30 },
        ],
        effects: [{ type: 'screen_flash', color: '#aaddff', startFrame: 90, duration: 40, alpha: 0.18 }],
      },
    ],
  };

})(window.STORY_SCENE_SPECS);
