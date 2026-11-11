'use strict';
// "Can my AI beat my game?" Episode 2: Chapter 7, Ground Zero (registry id 6), narrated by mini Kael.
// Same layout as Episode 1 (story-kael-cut.js) through lib/ai-episode.js; voice in audio/kael/ep2 (lines.json).
// Footage (all story-run.js 6 <take> vert, brain pilot, Evolution):
//   story-6-v1 (Nov 7) LOSS: first death, one vs four, enemy finisher at 1201.
//   story-6-v2 (Nov 7) LOSS: last life, impaled by the ice-spike finisher (~7565), result LOSS at 7642.
//   story-6-v3 (Nov 4) WIN: spin-finisher kill 3836-3952. Filmed BEFORE the losses, so "but this run", never "next try".
// Count: level-tester 1 of 3 + takes b, c, d, v3 won, v1, v2 lost (a, fix, trace unfinished, not counted) = 5 of 9.
// The AI lost at least one life in every captured take. Chapter 8 (id 7): level-tester 2 of 3.
//
//   node story-kael-ep2.js  → out/short-43-ai-ep2-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const LEDGE = 514;
episode({
  name: 'short-43-ai-ep2-kael',
  shot: 'story-6-v1',
  wins: [
    { shot: 'story-6-v1', at: 1040, to: 1215 },   // 0-175: four on one, HP to 1 (cut before the finisher's long hold)
    { shot: 'story-6-v2', at: 7476, to: 7626 },   // 175-325: last life, impaled (~264)
    { shot: 'story-6-v3', at: 3740, to: 3960 },   // 325-545: the winning run's spin-finisher kill (~421)
  ],
  voice: 'audio/kael/ep2',
  vo: [10, 190, 331, 'C+16'],
  captions: [
    { from: 20, to: 175, text: 'IT KEEPS DYING HERE.', size: 64 },
    { from: 175, to: 325, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 325, to: 'C', text: 'BUT THIS RUN...', size: 80, fill: '#7ff3ff' },
  ],
  end: { len: 366, lines: [
    { at: 2, text: 'IT CLEARED IT.', y: 0.36, size: 92 },
    { at: 18, text: ['5 OUT OF 9', 'TRIES.'], y: 0.47, size: 88, fill: '#7ff3ff' },
    { at: 118, text: ['CHAPTER 8:', '2 OUT OF 3.'], y: 0.62, size: 80, fill: '#ff5a5a' },
    { at: 230, text: 'NEXT: CHAPTER 8.', y: 0.75, size: 76 },
  ] },
  track: [
    { t: 0, x: -120, y: 760, face: 1, clip: 'run' },
    { t: 28, go: 4, x: 300, y: LEDGE, move: 'jump', h: 220, flip: 1, trail: true, fx: 'burst', clip: 'tell' }, // "Chapter seven."
    { t: 104, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim' },                // "It keeps dying here."
    { t: 150, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'hit', expr: 'intense' }, // HP hits 1
    { t: 195, go: 175, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'tell' }, // "Last life."
    { t: 264, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' }, // impaled
    { t: 299, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'cool' },   // "Ouch."
    { t: 345, go: 325, x: 330, y: LEDGE, face: 1, move: 'jump', h: 140, clip: 'lean' },  // "But this run,"
    { t: 445, move: 'stay', x: 330, y: LEDGE, face: 1, clip: 'cross', expr: 'cool' },    // "okay. That was clean."
    { t: 505, move: 'stay', x: 330, y: LEDGE, face: 1, clip: 'cheer' },
    { t: 'C+22', go: 'C', x: 790, y: 655, face: -1, move: 'jump', h: 200, flip: 1, trail: true, fx: 'burst', clip: 'cheer' },
    { t: 'C+134', move: 'stay', x: 790, y: 655, face: -1, clip: 'tell' },             // "Chapter eight's next."
    { t: 'C+244', move: 'stay', x: 790, y: 655, face: -1, clip: 'aim' },              // "It's two for three there."
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
