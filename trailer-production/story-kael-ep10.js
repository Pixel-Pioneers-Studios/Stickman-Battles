'use strict';
// "Can my AI beat my game?" Ep 10 = Chapter 18 (registry id 17, "Between Worlds"; ids 14-16 are story scenes with no
// fight). Built to Ep 8/9's bar, shorter on purpose (~15 s of footage) to test whether completion breaks the ~1.1K feed test.
// Footage: story-17-c7 only (Nov 17 night, brain pilot, Evolution, CAMZ=1.25, LT_REV=3bdd3c2): a 2 on 1 at the lock wall.
// Life 1 lost 1876, life 2 lost 2821. Last life at 15 HP: its finisher takes foe 1 (3765-3883), its finisher takes foe 2
// (4043-4162, "Fracture Wanderer cleared"). The walker then takes it to a cache guard on a ledge over a gap; it falls
// in at 65 HP, no hit taken (death 4541).
// Count: c5 LOSS, c6 LOSS, c7 LOSS = 0 of 3 (c1/c2/c4 died to capture problems, not counted).
//
//   node story-kael-ep10.js  → out/short-55-ai-ep10-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-17-c7', LEDGE = 514;
const wins = [
  { at: 490, to: 640 },     // 0-150: the 2 on 1 starts
  { at: 1730, to: 1880 },   // 150-300: life 1 gone (1876 = out 296)
  { at: 2660, to: 2826 },   // 300-466: life 2 gone (2821 = out 461)
  { at: 3700, to: 3890 },   // 466-656: last life, 15 HP; its finisher takes foe 1 (gone 3883 = out 649)
  { at: 4030, to: 4200 },   // 656-826: its finisher takes foe 2 (gone 4162 = out 788), hold on the win
  { at: 4440, to: 4560 },   // 826-946: the cache guard; falls in at full HP (4541 = out 927)
];

episode({
  name: 'short-55-ai-ep10-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ep10',
  vo: [6, 470, 792, 930, 'C+24'],
  music: { file: 'audio/music/arena-neon.mp3', from: 8.0, gain: 0.35 },
  captions: [
    { from: -4, to: 120, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 120, to: 296, text: '2 ON 1. 3 LIVES.', size: 84, fill: '#ff5a5a' },
    { from: 296, to: 461, text: 'LIFE 2.', size: 96, fill: '#ffd34d' },
    { from: 461, to: 649, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 649, to: 788, text: 'ONE DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 788, to: 870, text: 'BOTH DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 870, to: 927, text: 'ONE CHEST...', size: 84 },
    { from: 927, to: 'C', text: 'NO.', size: 110, fill: '#ff5a5a' },
  ],
  end: { len: 330, lines: [
    { at: 2, text: 'IT FELL IN.', y: 0.36, size: 104, fill: '#ff5a5a' },
    { at: 34, text: ['CHAPTER 18:', '0 OUT OF 3 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 150, text: ['SHOULD IT SKIP', 'THE CHESTS?'], y: 0.63, size: 72, fill: '#ffd34d' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 120, go: 160, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 170, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 296, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 466, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'intense' },     // "Last life."
    { t: 649, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cheer' },
    { t: 788, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cheer' },                      // "Both down!"
    { t: 927, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },       // "No."
    { t: 'C', move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
