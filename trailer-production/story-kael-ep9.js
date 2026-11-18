'use strict';
// "Can my AI beat my game?" Ep 9 = Chapter 14 (registry id 13), built to Ep 8's bar (story-kael-ep8.js).
// Footage: story-13-c1 only (Nov 14-15, brain pilot, Evolution, CAMZ=1.25): three foes one at a time. Its finisher takes
// foe 1 (1904-2033), foe 2 takes life 1 (finisher on it 2442), its finisher takes foe 2 (4258-4385), foe 3 takes life 2
// (5713), last life its finisher takes foe 3 (6624-6744), WIN 6776 at 83 HP.
// Count after the Nov 10 retune: c1 WIN, c2 LOSS, c3 LOSS = 1 of 3.
// Subscribe ask after the payoff, tied to the next chapter (Ep 6's test never reached the feed, so this is its real test).
//
//   node story-kael-ep9.js  → out/short-54-ai-ep9-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-13-c1', LEDGE = 514;
const wins = [
  { at: 440, to: 600 },     // 0-160: full HP 158 -> 135 -> 115, foe 1
  { at: 1880, to: 2036 },   // 160-316: its finisher takes foe 1 (1904 = out 184, gone 2033 = out 313)
  { at: 2200, to: 2444 },   // 316-560: foe 2, 74 -> 1, cut as the finisher on it starts (2442)
  { at: 4200, to: 4388 },   // 560-748: life 2, its finisher takes foe 2 (4258 = out 618, gone 4385 = out 745)
  { at: 5470, to: 5715 },   // 748-993: foe 3, 43 -> 1, cut at 5713
  { at: 6500, to: 6775 },   // 993-1268: last life, its finisher takes foe 3 (6624 = out 1117, gone 6744 = out 1237)
];

episode({
  name: 'short-54-ai-ep9-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ep9',
  vo: [6, 318, 998, 'C+24'],
  music: { file: 'audio/music/battle-royale.mp3', from: 12.0, gain: 0.35 },
  captions: [
    { from: -4, to: 120, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 120, to: 313, text: '3 FOES. 3 LIVES.', size: 84, fill: '#ff5a5a' },
    { from: 313, to: 440, text: 'ONE DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 440, to: 560, text: 'LIFE 1.', size: 96 },
    { from: 560, to: 745, text: 'LIFE 2.', size: 96, fill: '#ffd34d' },
    { from: 745, to: 802, text: 'TWO DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 802, to: 993, text: 'ONE LEFT.', size: 96 },
    { from: 993, to: 1237, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 1237, to: 'C', text: 'THREE DOWN.', size: 96, fill: '#7ff3ff' },
  ],
  end: { len: 360, lines: [
    { at: 2, text: 'IT WON.', y: 0.36, size: 110, fill: '#7ff3ff' },
    { at: 34, text: ['CHAPTER 14:', '1 OUT OF 3 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 120, text: ['CHAPTER 15 NEXT.', 'SUBSCRIBE TO SEE IT.'], y: 0.63, size: 68, fill: '#ffd34d' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 120, go: 160, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 170, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 316, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cheer' },                     // "One down."
    { t: 440, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 560, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 850, go: 890, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'lean' },
    { t: 900, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim', expr: 'intense' },
    { t: 993, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cross', expr: 'intense' },   // "Last life. Last one."
    { t: 'C', move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cheer' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
