'use strict';
// "Can my AI beat my game?" Ep 13 = Chapter 22 (registry id 21, "The Approach": stealth walk past Collector sentinels;
// being seen trips the alarm and the foes pile in). Nov 20 c1, first try: alarm at 430 (foes 2 -> 5), takes down 4 of
// the 5 over three lives (kills 1898, 2433, 2620, 2926), last life gone at 3513 with one foe left. LOSS.
// Footage: story-21-c1 (brain pilot, Evolution, CAMZ=1.25).
//
//   node story-kael-ep13.js  → out/short-58-ai-ep13-kael-1080x1920.mp4
const { episode } = require('./lib/ai-episode');

const SHOT = 'story-21-c1', LEDGE = 514;
const wins = [
  { at: 250, to: 500 },     // 0-250: sneaking, seen, alarm (430 = out 180)
  { at: 560, to: 720 },     // 250-410: five of them
  { at: 850, to: 935 },     // 410-495: 1 HP, life 1 gone (932 = out 492)
  { at: 1700, to: 1960 },   // 495-755: life 2, first kill (1898 = out 693)
  { at: 2050, to: 2130 },   // 755-835: 1 HP, life 2 gone (2124 = out 829)
  { at: 2400, to: 2640 },   // 835-1075: last life, kills 2 and 3 (2433 = 868, 2620 = 1055)
  { at: 2880, to: 2940 },   // 1075-1135: kill 4 (2926 = 1121)
  { at: 3330, to: 3520 },   // 1135-1325: one left; gone (3513 = 1318)
];

episode({
  name: 'short-58-ai-ep13-kael',
  shot: SHOT,
  wins,
  zoom: { z: 1.0, cx: 0.5, cy: 0.5 },
  voice: 'audio/kael/ep13',
  vo: [6, 184, 697, 835, 1123, 'C+18'],
  music: { file: 'audio/music/arena-neon.mp3', from: 20.0, gain: 0.35 },
  captions: [
    { from: -4, to: 180, text: "MY AI'S ONE JOB: STAY HIDDEN.", size: 52 },
    { from: 180, to: 250, text: 'ALARM.', size: 120, fill: '#ff5a5a' },
    { from: 250, to: 410, text: 'FIVE OF THEM.', size: 96, fill: '#ff8a3d' },
    { from: 410, to: 492, text: '1 HP.', size: 110, fill: '#ff5a5a' },
    { from: 492, to: 560, text: 'LIFE 1. GONE.', size: 84, fill: '#ff5a5a' },
    { from: 560, to: 693, text: 'HANGING ON.', size: 96, fill: '#ffd34d' },
    { from: 693, to: 755, text: 'ONE DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 755, to: 829, text: '1 HP. AGAIN.', size: 90, fill: '#ff5a5a' },
    { from: 829, to: 868, text: 'LAST LIFE.', size: 96, fill: '#ff5a5a' },
    { from: 868, to: 1055, text: 'TWO DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 1055, to: 1121, text: 'THREE DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 1121, to: 1200, text: 'FOUR DOWN.', size: 96, fill: '#7ff3ff' },
    { from: 1200, to: 1318, text: 'ONE LEFT.', size: 104, fill: '#ffd34d' },
    { from: 1318, to: 'C', text: 'NO.', size: 120, fill: '#ff5a5a' },
  ],
  end: { len: 240, lines: [
    { at: 2, text: 'SO CLOSE.', y: 0.36, size: 104, fill: '#ffd34d' },
    { at: 30, text: ['4 OUT OF 5', 'TAKEN DOWN.'], y: 0.48, size: 80, fill: '#7ff3ff' },
    { at: 100, text: ['CHAPTER 22,', 'FIRST TRY.'], y: 0.63, size: 66, fill: '#7ff3ff' },
  ] },
  track: [
    { t: 0, x: 300, y: LEDGE, face: 1, clip: 'tell' },
    { t: 180, go: 150, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'hit', expr: 'intense' },
    { t: 250, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 492, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 560, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },
    { t: 693, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cheer' },                      // "One down."
    { t: 755, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'cross', expr: 'intense' },
    { t: 835, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'aim', expr: 'intense' },       // "Last life."
    { t: 1121, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'lean', expr: 'intense' },     // "One left!"
    { t: 1318, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'hit', expr: 'intense' },
    { t: 'C', move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'tell' },
  ],
}).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
