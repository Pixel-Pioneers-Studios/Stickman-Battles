'use strict';
// "Can my AI beat my game?" Episode 4: Chapter 9 (registry id 8), narrated by mini Kael, under AI-SERIES.md's rules.
// Footage: story-8-v3 only (story-run.js 8 v3 15000 vert, Nov 9, brain pilot, Evolution, clean start after the
// pre-roll fix): two Cache Guardians at once (439), HP 178 -> 76, finisher on the first (1276), HP down to 44,
// finisher on the second (2249), no lives lost, WIN 2789.
// Count: level-tester 3 of 3 + takes v1, v2, v3 won (v1/v2 started late on camera but finished the chapter) = 6 of 6.
//
//   node story-kael-ep4.js  → out/short-45-ai-ep4-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');
const { shotLog } = require('./lib/engine');

const SHOT = 'story-8-v3', LEDGE = 514;
const wins = [
  { at: 510, to: 590 },     // A 0-80: two on one, full HP, first hits land (178 -> 157)
  { at: 1010, to: 1290 },   // B 80-360: HP 151 -> 76, finisher on guard 1
  { at: 1670, to: 1720 },   // C 360-410: HP 101 -> 62
  { at: 2100, to: 2300 },   // D 410-610: HP 44, finisher on guard 2, hold on 0 LEFT
];
// Top counter in segment D: "N LEFT", N read from the log.
const L = shotLog('vert', SHOT).log;
const caps = [];
let t = 0;
for (const [i, w] of wins.entries()) {
  for (let f = w.at; f < w.to; f++, t++) {
    if (i < 3) continue;
    const text = L[f].foes + ' LEFT', c = caps[caps.length - 1];
    if (c && c.text === text) c.to = t + 1; else caps.push({ from: t, to: t + 1, text, size: 72, fill: L[f].foes ? '#ff5a5a' : '#7ff3ff' });
  }
}
caps[caps.length - 1].to = 'C';

episode({
  name: 'short-45-ai-ep4-kael',
  shot: SHOT,
  wins,
  voice: 'audio/kael/ep4',
  vo: [6, 236, 548, 'C+16'],
  captions: [
    { from: 0, to: 120, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 120, to: 236, text: "IT'S NEVER LOST HERE.", size: 68, fill: '#7ff3ff' },
    { from: 236, to: 410, text: 'MAYBE TODAY.', size: 88, fill: '#ff5a5a' },
    ...caps,
  ],
  end: { len: 240, lines: [
    { at: 2, text: 'IT CLEARED IT.', y: 0.36, size: 92 },
    { at: 40, text: ['CHAPTER 9:', '6 OUT OF 6 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 110, text: ['NEXT: CHAPTER 10.', 'IT LOST THERE 3 TIMES.'], y: 0.62, size: 64 },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 120, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cross', expr: 'cool' },     // "It's never lost here."
    { t: 200, go: 170, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 300, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },   // HP sliding
    { t: 420, go: 392, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'lean' },
    { t: 560, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'hit', expr: 'intense' },     // the second finisher
    { t: 590, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cheer' },                    // "Never mind."
    { t: 'C+22', go: 'C', x: 790, y: 655, face: -1, move: 'jump', h: 200, flip: 1, trail: true, fx: 'burst', clip: 'cheer' },
    { t: 'C+130', move: 'stay', x: 790, y: 655, face: -1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
