'use strict';
// "Can my AI beat my game?" Episode 6: Chapter 11 (registry id 10), narrated by mini Kael, under AI-SERIES.md's rules.
// Footage: story-10-v1 only (Nov 9, brain pilot, Evolution): two enemies take it from 178 to 12 without a death; a
// finisher kills one (heal to 37); the second takes it to 3 and a second finisher kills it at 2097. Never died.
// The scripted walker then reaches the exit with two later foes alive: not shown, not narrated.
// Count: level-tester 3 of 3 + v1 = 4 of 4.
// First episode with a spoken subscribe ask, after the payoff, inside the end card (test vs Ep 1/3/4 subs gained).
//
//   node story-kael-ep6.js  → out/short-48-ai-ep6-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-10-v1', LEDGE = 514;
const wins = [
  { at: 785, to: 905 },     // 0-120: full HP, 2 on 1, 178 -> 100 (660-785 goes dark: jump into the sky)
  { at: 985, to: 1200 },    // 120-335: 100 -> 12
  { at: 1370, to: 1530 },   // 335-495: finisher kills one, heal to 37 (483)
  { at: 1860, to: 2130 },   // 495-765: 37 -> 3 (570), finisher, kill (732), hold
];

episode({
  name: 'short-48-ai-ep6-kael',
  shot: SHOT,
  wins,
  voice: 'audio/kael/ep6',
  vo: [6, 335, 485, 573, 'C+16'],
  captions: [
    { from: 0, to: 110, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 110, to: 330, text: '2 ON 1.', size: 96, fill: '#ff5a5a' },
    { from: 330, to: 483, text: '12 HP.', size: 96, fill: '#ff5a5a' },
    { from: 483, to: 570, text: 'ONE DOWN.', size: 88 },
    { from: 570, to: 732, text: '3 HP.', size: 96, fill: '#ff5a5a' },
    { from: 732, to: 'C', text: 'STILL ALIVE.', size: 96, fill: '#7ff3ff' },
  ],
  end: { len: 264, lines: [
    { at: 2, text: 'IT SURVIVED.', y: 0.36, size: 92 },
    { at: 30, text: ['CHAPTER 11:', '4 OUT OF 4 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 70, text: 'NEXT: CHAPTER 12.', y: 0.61, size: 72 },
    { at: 130, text: ['SUBSCRIBE TO SEE', 'IF IT SURVIVES.'], y: 0.70, size: 60, fill: '#ffd34d' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 110, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim' },                     // "Two on one."
    { t: 230, go: 150, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 280, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'tell' },
    { t: 325, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },    // "Twelve HP."
    { t: 355, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },    // the finisher
    { t: 485, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'cool' },     // "One down."
    { t: 555, go: 505, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'lean' },
    { t: 575, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim', expr: 'intense' },     // "Three HP."
    { t: 730, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cheer' },                    // the kill
    { t: 'C+22', go: 'C', x: 790, y: 655, face: -1, move: 'jump', h: 200, flip: 1, trail: true, fx: 'burst', clip: 'cheer' },
    { t: 'C+130', move: 'stay', x: 790, y: 655, face: -1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
