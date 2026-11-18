'use strict';
// "Can my AI beat my game?" Ep 11 = Chapter 19 (registry id 18, "Fragment Theory": an escape, the walls cave in from
// the left). After Ep 10's Chapter 18 went 0 of 3, this one went 3 of 3 (Nov 18 night: c1, c2, c3 all WIN).
// Footage: story-18-c1 (brain pilot, Evolution, CAMZ=1.25, LT_REV=3bdd3c2), the closest of the three: life 1 lost to a
// fall at 1003, life 2 lost to a fall inside the four-foe arena lock at 2088, last life clears the wave and runs out
// (WIN 2830 at 138 HP).
//
//   node story-kael-ep11.js  → out/short-56-ai-ep11-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-18-c1', LEDGE = 514;
const wins = [
  { at: 357, to: 520 },     // 0-163: two foes in the collapsing pocket, 158 -> 97
  { at: 880, to: 1005 },    // 163-288: the run; falls, life 1 gone (1003 = out 286)
  { at: 1720, to: 1840 },   // 288-408: life 2, the arena lock closes
  { at: 1990, to: 2105 },   // 408-523: the collapse wall in frame; falls, life 2 gone (2088 = out 506)
  { at: 2170, to: 2300 },   // 523-653: last life clears the wave
  { at: 2700, to: 2832 },   // 653-785: runs out (WIN 2830 = out 783)
];

episode({
  name: 'short-56-ai-ep11-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ep11',
  vo: [6, 412, 556, 784, 'C+24'],
  music: { file: 'audio/music/battle-royale.mp3', from: 30.0, gain: 0.35 },
  captions: [
    { from: -4, to: 110, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 110, to: 286, text: 'WALLS CLOSING IN.', size: 84, fill: '#ff8a3d' },
    { from: 286, to: 330, text: 'LIFE 1. GONE.', size: 84, fill: '#ff5a5a' },
    { from: 330, to: 408, text: 'LIFE 2.', size: 96, fill: '#ffd34d' },
    { from: 408, to: 506, text: 'THE WALL.', size: 110, fill: '#ff8a3d' },
    { from: 506, to: 556, text: 'LIFE 2. GONE.', size: 84, fill: '#ff5a5a' },
    { from: 556, to: 653, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 653, to: 783, text: 'RUN.', size: 110, fill: '#ffd34d' },
    { from: 783, to: 'C', text: 'OUT.', size: 110, fill: '#7ff3ff' },
  ],
  end: { len: 330, lines: [
    { at: 2, text: 'IT MADE IT.', y: 0.36, size: 104, fill: '#7ff3ff' },
    { at: 34, text: ['CHAPTER 19:', '3 OUT OF 3 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 150, text: ['CHAPTER 18 WAS', '0 OUT OF 3.'], y: 0.63, size: 72, fill: '#ffd34d' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 110, go: 150, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 160, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 286, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 330, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 408, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'lean', expr: 'intense' },       // "The wall!"
    { t: 506, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 556, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'intense' },      // "Last life. Run."
    { t: 783, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cheer' },                       // "It's out!"
    { t: 'C', move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
