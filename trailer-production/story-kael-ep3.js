'use strict';
// "Can my AI beat my game?" Episode 3: Chapter 8 (registry id 7), narrated by mini Kael. Built under AI-SERIES.md's
// rules after Ep 2 (spliced runs, context-only hook) fell to 17% stayed: ONE run, stand-alone premise with "AI" in
// the first line, short end card.
// Footage: story-7-v2 only (story-run.js 7 v2 15000 vert, Nov 8, brain pilot, Evolution): four foes spawn at once
// (5680), it dies to them (6464), then on its last life kills all four (7695, 8563, 8722, 9319) and clears it (WIN 9671).
// Count: level-tester 2 of 3 + takes v2, v3 won (v1 hit the 9000-frame cap, not counted) = 4 of 5.
//
//   node story-kael-ep3.js  → out/short-44-ai-ep3-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');
const { shotLog } = require('./lib/engine');

const SHOT = 'story-7-v2', LEDGE = 514;
const wins = [
  { at: 5860, to: 6020 },   // A 0-160: four on one, HP 101 -> 35
  { at: 6270, to: 6466 },   // B 160-356: HP 26 -> 1, finisher, 0 (cut before the respawn)
  { at: 7560, to: 7730 },   // C 356-526: last life, first kill (4 -> 3)
  { at: 8430, to: 8725 },   // D 526-821: two kills (3 -> 1)
  { at: 9180, to: 9370 },   // E 821-1011: last kill (1 -> 0), hold on 0 LEFT
];
// Top counter from segment C on: "LAST LIFE · N LEFT", N read from the log.
const L = shotLog('vert', SHOT).log;
const caps = [];
let t = 0;
for (const [i, w] of wins.entries()) {
  for (let f = w.at; f < w.to; f++, t++) {
    if (i < 2) continue;
    const text = 'LAST LIFE · ' + L[f].foes + ' LEFT', c = caps[caps.length - 1];
    if (c && c.text === text) c.to = t + 1; else caps.push({ from: t, to: t + 1, text, size: 60, fill: L[f].foes ? '#ff5a5a' : '#7ff3ff' });
  }
}
caps[caps.length - 1].to = 'C';

episode({
  name: 'short-44-ai-ep3-kael',
  shot: SHOT,
  wins,
  voice: 'audio/kael/ep3',
  vo: [6, 250, 366, 'C+14'],
  captions: [
    { from: 0, to: 112, text: 'AN AI IS PLAYING ME.', size: 64 },
    { from: 112, to: 300, text: "AND IT'S LOSING.", size: 72, fill: '#ff5a5a' },
    { from: 300, to: 356, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    ...caps,
  ],
  end: { len: 240, lines: [
    { at: 2, text: 'IT CLEARED IT.', y: 0.36, size: 92 },
    { at: 40, text: ['CHAPTER 8:', '4 OUT OF 5 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 110, text: 'NEXT: CHAPTER 9.', y: 0.62, size: 72 },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },                                  // on the caption from frame 0
    { t: 112, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim' },                    // "And it's losing."
    { t: 200, go: 170, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 300, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' }, // the finisher lands
    { t: 340, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'cool' },   // "Last life."
    { t: 400, go: 372, x: 300, y: LEDGE, face: 1, move: 'jump', h: 150, flip: 1, trail: true, clip: 'tell' }, // "Now watch."
    { t: 470, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'lean' },
    { t: 700, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim', expr: 'intense' },
    { t: 880, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'cheer' },
    { t: 'C+22', go: 'C', x: 790, y: 655, face: -1, move: 'jump', h: 200, flip: 1, trail: true, fx: 'burst', clip: 'cheer' },
    { t: 'C+130', move: 'stay', x: 790, y: 655, face: -1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
