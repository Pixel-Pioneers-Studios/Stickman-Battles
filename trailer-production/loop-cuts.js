'use strict';
// Loop test (Nov 20 2026): every AI-series Short stalls at the ~1.1K feed test even at 50-57% stayed, while avg %
// viewed sits ~48% on 20 s cuts. These are 5-8 s single-moment cuts with no end card and no fade (episode loop mode),
// the closing line answering the opening question so the cut back to frame 0 reads as a rewatch.
//
//   node loop-cuts.js boss|hp15|hp6   → out/short-59..61-loop-*-1080x1920.mp4
const { episode } = require('./lib/ai-episode');
const LEDGE = 514, Z = { z: 1.0, cx: 0.5, cy: 0.5 };
const stay = (t, clip, expr) => ({ t, move: 'stay', x: 790, y: LEDGE, face: -1, clip, expr });

const CUTS = {
  // Cosmic Axiom (registry id 150), story-150-v1: 149 HP at 2600, the AI's last HP 3210 (finisher on it), 10.2 s later.
  boss: {
    name: 'short-59-loop-boss', shot: 'story-150-v1',
    wins: [{ at: 2600, to: 2990 }, { at: 3150, to: 3250 }],   // 0-390 (149 -> 55), 390-490 (33 -> 1, finisher at out 450)
    voice: 'audio/kael/loop-boss', vo: [6, 434],
    music: { file: 'audio/music/boss-threshold.mp3', from: 10.0, gain: 0.35 },
    captions: [
      { from: -4, to: 240, text: 'HOW LONG DOES MY AI LAST?', size: 56 },
      { from: 240, to: 390, text: 'STILL STANDING.', size: 92, fill: '#ffd34d' },
      { from: 390, to: 450, text: '9 SECONDS...', size: 96, fill: '#ff8a3d' },
      { from: 450, to: 490, text: '10.', size: 140, fill: '#ff5a5a' },
    ],
    track: [{ t: 0, x: 790, y: LEDGE, face: -1, clip: 'tell' }, stay(170, 'aim', 'intense'), stay(390, 'lean', 'intense'), stay(450, 'hit', 'intense')],
  },
  // Chapter 18 (id 17), story-17-c7 last life: 42 -> 15 at 3755, its finishers take foe 1 (3765-3883) and foe 2 (4043-4162).
  hp15: {
    name: 'short-60-loop-15hp', shot: 'story-17-c7',
    wins: [{ at: 3700, to: 3890 }, { at: 3985, to: 4170 }],   // 0-190 (15 HP at out 55, foe 1 gone 183), 190-375 (foe 2 gone 367)
    voice: 'audio/kael/loop-15hp', vo: [6, 312],
    music: { file: 'audio/music/arena-neon.mp3', from: 8.0, gain: 0.35 },
    captions: [
      { from: -4, to: 55, text: 'MY AI VS TWO.', size: 84 },
      { from: 55, to: 183, text: '15 HP.', size: 120, fill: '#ff5a5a' },
      { from: 183, to: 300, text: 'ONE.', size: 130, fill: '#ffd34d' },
      { from: 300, to: 375, text: 'BOTH.', size: 130, fill: '#7ff3ff' },
    ],
    track: [{ t: 0, x: 790, y: LEDGE, face: -1, clip: 'tell' }, stay(55, 'cross', 'intense'), stay(183, 'aim', 'intense'), stay(300, 'lean')],
  },
  // Chapter 13 (id 12), story-12-v4, the win Ep 8 ended on: 26 at 4387, 6 HP at 4463, its finisher 4584-4712.
  hp6: {
    name: 'short-61-loop-6hp', shot: 'story-12-v4',
    wins: [{ at: 4380, to: 4716 }],                           // 0-336: 6 HP at out 83, finisher at out 204
    voice: 'audio/kael/loop-6hp', vo: [86, 262],
    music: { file: 'audio/music/battle-royale.mp3', from: 0, gain: 0.35 },
    captions: [
      { from: -4, to: 83, text: 'MY AI IS ABOUT TO LOSE.', size: 60 },
      { from: 83, to: 204, text: '6 HP.', size: 130, fill: '#ff5a5a' },
      { from: 204, to: 262, text: 'ONE HIT LEFT.', size: 96, fill: '#ff8a3d' },
      { from: 262, to: 336, text: 'NOT ONE HIT.', size: 100, fill: '#7ff3ff' },
    ],
    track: [{ t: 0, x: 790, y: LEDGE, face: -1, clip: 'tell' }, stay(83, 'cross', 'intense'), stay(204, 'aim', 'intense'), stay(262, 'lean')],
  },
};

const c = CUTS[process.argv[2]];
if (!c) { console.error('usage: node loop-cuts.js ' + Object.keys(CUTS).join('|')); process.exit(1); }
episode(Object.assign({ zoom: Z, loop: true }, c)).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
