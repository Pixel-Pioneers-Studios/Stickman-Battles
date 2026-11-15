'use strict';
// "Can my AI beat my game?" Chapter 11 remake (registry id 10), a new run, not a re-cut of Ep 6 (story-10-v1, which never
// entered the Shorts feed, likely because its template repeated Ep 3/4). Template varied: arena-neon music, question
// title, no subscribe ask, end card links to Ep 7's Chapter 12 count.
// Footage: story-10-c1 only (Nov 14, brain pilot, Evolution, CAMZ=1.25 closer capture camera): 2 on 1, first life lost
// (finisher on the AI starts 1342), on life 2 its finishers take both foes (1632-1762, 2695-2825). A later wave and the
// scripted walk to the exit (WIN 4588) are not shown or narrated.
// "Chapter twelve is still zero for eight" = story-11 v1-v8 since the Nov 10 retune (Ep 7).
//
//   node story-kael-ch11b.js  → out/short-52-ai-ch11b-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-10-c1', LEDGE = 514;
const wins = [
  { at: 790, to: 1000 },    // 0-210: 2 on 1, 158 -> 98
  { at: 1180, to: 1345 },   // 210-375: 58 -> 1, cut as the finisher on the AI starts (1342)
  { at: 1600, to: 1770 },   // 375-545: life 2 at 158, its finisher takes one foe (1632 = out 407)
  { at: 2520, to: 2830 },   // 545-855: 125 -> 105, its finisher takes the other (2695 = out 720)
];

episode({
  name: 'short-52-ai-ch11b-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ch11b',
  vo: [6, 380, 724, 'C+24'],
  music: { file: 'audio/music/arena-neon.mp3', from: 0, gain: 0.35 },
  captions: [
    { from: -4, to: 110, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 110, to: 210, text: '2 ON 1.', size: 96, fill: '#ff5a5a' },
    { from: 210, to: 375, text: 'LIFE 1.', size: 96 },
    { from: 375, to: 407, text: 'LIFE 2.', size: 96, fill: '#ffd34d' },
    { from: 407, to: 545, text: 'ONE DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 545, to: 720, text: 'ONE LEFT.', size: 96, fill: '#ff5a5a' },
    { from: 720, to: 'C', text: 'BOTH DOWN.', size: 96, fill: '#7ff3ff' },
  ],
  end: { len: 320, lines: [
    { at: 2, text: 'CLEARED.', y: 0.36, size: 110, fill: '#7ff3ff' },
    { at: 34, text: 'CHAPTER 11.', y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 150, text: ['CHAPTER 12:', '0 OUT OF 8.'], y: 0.63, size: 72, fill: '#ff5a5a' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 110, go: 160, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 165, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 375, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },    // "Lost one."
    { t: 430, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 560, go: 600, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'lean' },
    { t: 610, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim', expr: 'intense' },
    { t: 720, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cheer' },                     // "Both down."
    { t: 'C', move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
