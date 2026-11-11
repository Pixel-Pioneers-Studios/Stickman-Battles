'use strict';
// "Can my AI beat my game?" Episode 5: Chapter 10 (registry id 9, Veran's Field Notes), narrated by mini Kael,
// under AI-SERIES.md's rules.
// Footage: story-9-v2 only (story-run.js 9 v2 15000 vert, Nov 9, brain pilot, Evolution, clean start): one enemy at
// the mechanisms (5723) takes it from full HP to 0 on its second life (7237); on its last life it kills that enemy
// 375 frames (6.25 s) after respawning (7617), WIN 7621.
// Count before this run: level-tester 1 of 3 + take v1 LOSS (started late on camera, lost every life) = 1 of 4,
// so "this level's beaten it three times" is true. After v2: 2 of 5.
// The scripted walker activates the mechanisms; only the fight is shown, never narrated as the AI's puzzle solving.
//
//   node story-kael-ep5.js  → out/short-46-ai-ep5-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-9-v2', LEDGE = 514;
const wins = [
  { at: 5985, to: 6180 },   // A 0-195: full HP, one enemy, 178 -> 103
  { at: 6480, to: 6770 },   // B 195-485: 103 -> 28
  { at: 7040, to: 7238 },   // C 485-683: 28 -> 1, finisher on the AI, 0 (cut before the respawn)
  { at: 7242, to: 7670 },   // D 683-1111: last life, full HP, kills it at 1058 (6.25 s), hold
];

episode({
  name: 'short-46-ai-ep5-kael',
  shot: SHOT,
  wins,
  voice: 'audio/kael/ep5',
  vo: [6, 300, 690, 1064, 'C+30'],
  captions: [
    { from: 0, to: 120, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 120, to: 300, text: 'THIS LEVEL BEAT IT 3 TIMES.', size: 60, fill: '#ff5a5a' },
    { from: 300, to: 485, text: 'ONE ENEMY.', size: 88 },
    { from: 683, to: 1058, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 1058, to: 'C', text: '6 SECONDS.', size: 96, fill: '#7ff3ff' },
  ],
  end: { len: 240, lines: [
    { at: 2, text: 'IT CLEARED IT.', y: 0.36, size: 92 },
    { at: 40, text: ['CHAPTER 10:', '2 OUT OF 5 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 110, text: 'NEXT: CHAPTER 11.', y: 0.62, size: 72 },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 120, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim' },                     // "beaten it three times"
    { t: 260, go: 170, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 320, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'tell' },                    // "One enemy."
    { t: 560, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },    // HP 28 -> 1
    { t: 660, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },    // the finisher lands
    { t: 700, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'cool' },     // "Last life."
    { t: 820, go: 790, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'lean' },
    { t: 1050, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cheer' },                   // "Six seconds."
    { t: 'C+22', go: 'C', x: 790, y: 655, face: -1, move: 'jump', h: 200, flip: 1, trail: true, fx: 'burst', clip: 'cheer' },
    { t: 'C+130', move: 'stay', x: 790, y: 655, face: -1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
