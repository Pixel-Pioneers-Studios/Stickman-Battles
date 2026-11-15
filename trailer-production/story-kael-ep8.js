'use strict';
// "Can my AI beat my game?" Episode 8: Chapter 13 (registry id 12, What Veran Knew: two foes, 3 lives),
// narrated by mini Kael, template varied again (battle-royale music, counter captions, no subscribe ask).
// Footage: story-12-v4 only (Nov 14, brain pilot, Evolution, CAMZ=1.25 closer capture camera): 2 on 1, first life lost
// (finisher on the AI starts 1727), second life lost (finisher starts 2764), last life: the AI's finisher takes one foe
// (3278-3391), then it wins the 1 on 1 at 6 HP with its own finisher (4584-4712). Result WIN at frame 5282.
// Count after the Nov 10 Evolution retune: v1 LOSS, v2 WIN, v3 LOSS, v4 WIN = 2 of 4.
//
//   node story-kael-ep8.js  → out/short-51-ai-ep8-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-12-v4', LEDGE = 514;
const wins = [
  { at: 575, to: 755 },     // 0-180: 2 on 1 from full HP 158 -> 131 (from 575: at 540 it stood by the entry portal)
  { at: 1480, to: 1730 },   // 180-430: 67 -> 1, cut as the finisher on the AI starts (1727)
  { at: 2540, to: 2768 },   // 430-658: life 2, 42 -> 1, cut as the second finisher starts (2764)
  { at: 3200, to: 3395 },   // 658-853: last life at 131, the AI's finisher takes one foe (3278-3391)
  { at: 4370, to: 4716 },   // 853-1199: 1 on 1, 46 -> 6 (4463 = out 946), the AI's finisher wins it (4584-4712)
];

episode({
  name: 'short-51-ai-ep8-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ep8',
  vo: [6, 436, 662, 950, 'C+24'],
  music: { file: 'audio/music/battle-royale.mp3', from: 0, gain: 0.35 },
  captions: [
    { from: -4, to: 110, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 110, to: 180, text: '2 ON 1.', size: 96, fill: '#ff5a5a' },
    { from: 180, to: 430, text: 'LIFE 1.', size: 96 },
    { from: 430, to: 658, text: 'LIFE 2.', size: 96, fill: '#ffd34d' },
    { from: 658, to: 736, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 736, to: 946, text: 'ONE DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 946, to: 'C', text: '6 HP.', size: 110, fill: '#ff5a5a' },
  ],
  end: { len: 290, lines: [
    { at: 2, text: 'IT WON.', y: 0.36, size: 110, fill: '#7ff3ff' },
    { at: 34, text: ['CHAPTER 13:', '2 OUT OF 4 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 120, text: ['CHAPTER 14', 'NEXT?'], y: 0.63, size: 72, fill: '#ffd34d' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 120, go: 160, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 170, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 430, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },    // "That's one."
    { t: 480, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 655, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'intense' },  // "Last life."
    { t: 740, go: 780, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'lean' },
    { t: 790, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim', expr: 'intense' },
    { t: 946, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'tell', expr: 'intense' },    // "Six HP. Come on."
    { t: 'C', move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cheer' },                     // "It did it."
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
