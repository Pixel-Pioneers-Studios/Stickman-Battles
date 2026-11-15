'use strict';
// "Can my AI beat my game?" Episode 7: Chapter 12 (registry id 11, The Relay Station: Veran + escort, 2 lives),
// narrated by mini Kael, under AI-SERIES.md's rules, with the template varied (music, captions, no subscribe ask):
// Ep 5 and Ep 6 never entered the Shorts feed while a non-episode Short (Nov 13) did.
// Footage: story-11-v8 only (Nov 14, brain pilot, Evolution, CAMZ=1.25 closer capture camera): 2 on 1 from full HP,
// first life lost at 2021 (finisher on the AI), last life lost at 2798 (cut as each finisher starts) with both foes alive.
// Count after the Nov 10 Evolution retune: takes v1-v8 all LOSS = 0 of 8 (the 1400-frame draft camtest is not counted).
// It won here once in the Oct 31 level-tester run, before the retune.
//
//   node story-kael-ep7.js  → out/short-50-ai-ep7-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-11-v8', LEDGE = 514;
const wins = [
  { at: 492, to: 700 },     // 0-208: full HP 158, 2 on 1, first hits both ways, 158 -> 131
  { at: 1035, to: 1215 },   // 208-388: 111 -> 60
  { at: 1650, to: 1935 },   // 388-673: 40 -> 1, the finisher on the AI starts (1881); cut before its 140-frame hold
  { at: 2280, to: 2420 },   // 673-813: last life, 118 -> 58
  { at: 2550, to: 2710 },   // 813-973: 38 -> 1, the second finisher starts (2657); it dies at 2798
];

episode({
  name: 'short-50-ai-ep7-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ep7',
  vo: [6, 250, 680, 830, 'C+24'],
  music: { file: 'audio/music/story-embers.mp3', from: 20.0, gain: 0.4 },
  captions: [
    { from: -4, to: 110, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 110, to: 208, text: 'IT LOST HERE 7 TIMES.', size: 64, fill: '#ff5a5a' },
    { from: 208, to: 388, text: '2 ON 1.', size: 96, fill: '#ff5a5a' },
    { from: 673, to: 813, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 813, to: 'C', text: 'TRY 8.', size: 96 },
  ],
  end: { len: 228, lines: [
    { at: 2, text: 'NOPE.', y: 0.36, size: 110, fill: '#ff5a5a' },
    { at: 34, text: ['CHAPTER 12:', '0 OUT OF 8 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 100, text: ['SHOULD IT', 'KEEP TRYING?'], y: 0.63, size: 72, fill: '#ffd34d' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 110, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim', expr: 'intense' },
    { t: 210, go: 165, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 250, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'tell' },                    // "Two on one."
    { t: 520, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 665, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'intense' },  // "Last life."
    { t: 790, go: 750, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'lean' },
    { t: 830, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim', expr: 'intense' },     // "Come on."
    { t: 'C', move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cross' },
    { t: 'C+22', go: 'C', x: 790, y: 655, face: -1, move: 'jump', h: 160, flip: -1, trail: true, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
