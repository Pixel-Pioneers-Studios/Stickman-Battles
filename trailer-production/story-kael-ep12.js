'use strict';
// "Can my AI beat my game?" Ep 12 = Chapter 20 (registry id 19, "Mirror Fracture": a mirrored city street, then a
// 2-on-1 against the Fracture Echo and a spear Echo, 2 lives). 0 of 7: Nov 18 c1-c3 (memory: "0 of 3"; c1 was
// overwritten Nov 20) + Nov 20 c1, c4, c5, c6. Every logged take ends with both foes alive, the AI pinned at the arena-lock wall.
// Footage: story-19-c6 (brain pilot, Evolution, CAMZ=1.25) = the 7th try: life 1 lost at 1529, last life at 2747.
//
//   node story-kael-ep12.js  → out/short-57-ai-ep12-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-19-c6', LEDGE = 514;
const wins = [
  { at: 430, to: 600 },     // 0-170: both Echoes block the path, lightning, first clash
  { at: 600, to: 760 },     // 170-330: 158 -> 96
  { at: 990, to: 1180 },    // 330-520: cornered at the wall, 76 -> 16
  { at: 1420, to: 1535 },   // 520-635: 1 HP, life 1 gone (1529 = out 629)
  { at: 2200, to: 2310 },   // 635-745: last life
  { at: 2570, to: 2752 },   // 745-927: 29 -> 1 -> gone (2747 = out 922)
];

episode({
  name: 'short-57-ai-ep12-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ep12',
  vo: [6, 176, 575, 642, 790, 'C+18'],
  music: { file: 'audio/music/boss-threshold.mp3', from: 10.0, gain: 0.35 },
  captions: [
    { from: -4, to: 170, text: 'MY AI IS 0 FOR 6 HERE.', size: 62 },
    { from: 170, to: 330, text: 'TRY 7.', size: 110, fill: '#ffd34d' },
    { from: 330, to: 520, text: 'TWO OF THEM.', size: 96, fill: '#ff8a3d' },
    { from: 520, to: 629, text: 'CORNERED.', size: 96, fill: '#ff8a3d' },
    { from: 629, to: 690, text: 'LIFE 1. GONE.', size: 84, fill: '#ff5a5a' },
    { from: 690, to: 790, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 790, to: 922, text: 'HANG ON.', size: 104, fill: '#ffd34d' },
    { from: 922, to: 'C', text: 'NO.', size: 120, fill: '#ff5a5a' },
  ],
  end: { len: 240, lines: [
    { at: 2, text: 'NOPE.', y: 0.36, size: 110, fill: '#ff5a5a' },
    { at: 30, text: ['CHAPTER 20:', '0 OUT OF 7 TRIES.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 100, text: ['BOTH OF THEM', 'WALKED AWAY.'], y: 0.63, size: 66, fill: '#ffd34d' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 170, go: 150, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'lean' },
    { t: 220, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 570, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'intense' },     // "Not again."
    { t: 629, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 690, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },       // "Last life."
    { t: 790, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'lean', expr: 'intense' },      // "Come on!"
    { t: 922, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 'C', move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
