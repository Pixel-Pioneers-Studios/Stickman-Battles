'use strict';
// "Can my AI beat my game?" Chapter 10 remake (registry id 9), a new run, not a re-cut of Ep 5 (story-9-v2, which never
// entered the Shorts feed). Built to Ep 8's bar (story-kael-ep8.js).
// Footage: story-9-c3 only (Nov 14, brain pilot, Evolution, CAMZ=1.25 closer capture camera): on life 1 its finishers
// take two foes (853-971, 2147-2279), then it loses all three lives (finishers on it start 3160, 5165, 6418; LOSS 6564).
// Its third kill (3589-3705, life 2) is not shown.
// Count since the Nov 10 retune: c2 LOSS (59 s), c3 LOSS = 0 of 2 (c1 ran out of frames unfinished, not counted).
// "It used to win this one" = Ep 5: 2 of 5 before the retune.
//
//   node story-kael-ch10b.js  → out/short-53-ai-ch10b-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-9-c3', LEDGE = 514;
const wins = [
  { at: 690, to: 975 },     // 0-285: 74 -> 33, its finisher takes one foe (853 = out 163)
  { at: 2060, to: 2285 },   // 285-510: 78 -> 12, its finisher takes another (2147 = out 372)
  { at: 3000, to: 3163 },   // 510-673: 35 -> 1, cut as the finisher on it starts (3160)
  { at: 4960, to: 5168 },   // 673-881: life 2, 89 -> 1, cut at 5165
  { at: 6280, to: 6421 },   // 881-1022: last life, 52 -> 1, cut at 6418
];

episode({
  name: 'short-53-ai-ch10b-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ch10b',
  vo: [6, 374, 884, 'C+24'],
  music: { file: 'audio/music/battle-royale.mp3', from: 24.0, gain: 0.35 },
  captions: [
    { from: -4, to: 163, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 163, to: 372, text: 'ONE DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 372, to: 510, text: 'TWO DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 510, to: 673, text: 'LIFE 1.', size: 96 },
    { from: 673, to: 881, text: 'LIFE 2.', size: 96, fill: '#ffd34d' },
    { from: 881, to: 'C', text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
  ],
  end: { len: 320, lines: [
    { at: 2, text: 'NOPE.', y: 0.36, size: 110, fill: '#ff5a5a' },
    { at: 34, text: ['CHAPTER 10:', '0 OUT OF 2.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 160, text: ['MAKE IT', 'EASIER?'], y: 0.63, size: 72, fill: '#ffd34d' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 165, go: 160, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 215, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim' },
    { t: 372, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cheer' },                    // "Two down."
    { t: 510, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 673, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 760, go: 800, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'lean' },
    { t: 881, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cross', expr: 'intense' },   // "Last life."
    { t: 'C', move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
