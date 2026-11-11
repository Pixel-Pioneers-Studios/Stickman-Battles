'use strict';
// "Can my AI beat my game?" Episode 1, narrated by mini Kael (lib/mini-kael.js, voice audio/kael from kael-voice.py).
// Footage: work/vert/story-4-v1 (story-run.js 4 v1 5400 vert): the brain clears Chapter 5 (registry id 4) on
// Evolution with its last life (lost one at 33 s), ends on 56/163 HP. Nothing is staged; HP is read from the log.
// Count: level-tester 2 of 3 + captured takes a, b, c, v1 all wins = 6 of 7. Chapter 7 (id 6): 1 of 3.
//
//   node story-kael-cut.js  → out/short-42-ai-ep1-kael-1080x1920.mp4
const path = require('path');
const { render, shotLog } = require('./lib/engine');
const { mouthEnvelope } = require('./lib/voice-env');
const { mixVoice } = require('./lib/voice-mix');

const ROOT = path.resolve(__dirname, '..'), SHOT = 'story-4-v1', PROFILE = 'vert';
const L = shotLog(PROFILE, SHOT).log;
const Z = { z: 1.12, cx: 0.5, cy: 0.9 };
// Source windows: first contact, respawn + first kill, the last enemy (hit 63 -> 45 at 3188), the finisher.
const wins = [{ at: 555, to: 795 }, { at: 2075, to: 2339 }, { at: 3110, to: 3310 }, { at: 3410, to: 3550 }];
let T = 0; const segs = [], map = [];
for (const w of wins) { segs.push({ shot: SHOT, at: w.at, len: w.to - w.at, zoom: Z }); map.push({ t: T, ...w }); T += w.to - w.at; }
const END = 366, TOTAL = T + END;

// Voice: line N starts at VO[N-1] (output frames).
const VO = [30, 246, 510, T + 16];
const mouth = new Array(TOTAL).fill(0);
VO.forEach((at, i) => mouthEnvelope(path.join(__dirname, 'audio/kael', `paced-line${i + 1}.wav`)).forEach((v, k) => { if (at + k < TOTAL) mouth[at + k] = v; }));

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size, bar: false, band: false }, extra || {});
const runs = key => { const out = []; for (const m of map) for (let f = m.at; f < m.to; f++) { const v = L[f][key], t = m.t + f - m.at, l = out[out.length - 1]; if (l && l.v === v) l.to = t + 1; else out.push({ v, from: t, to: t + 1 }); } return out; };

const LEDGE = 514, C = T;   // caption tops at y 0.285; C = end card start
const track = [
  { t: 0, x: -120, y: 760, face: 1, clip: 'run' },
  { t: 28, go: 4, x: 300, y: LEDGE, move: 'jump', h: 220, flip: 1, trail: true, fx: 'burst', clip: 'tell' },
  { t: 150, move: 'stay', x: 300, y: LEDGE, face: 1, clip: 'aim' },                 // "And it's not you."
  { t: 262, go: 238, x: 790, y: LEDGE, face: -1, move: 'jump', h: 170, flip: -1, trail: true, clip: 'tell' },
  { t: 424, move: 'stay', x: 790, y: LEDGE, face: -1, clip: 'lean' },               // "hardest mode."
  { t: 508, go: 488, x: 330, y: LEDGE, face: 1, move: 'jump', h: 140, clip: 'lean' }, // "One left."
  { t: 583, move: 'stay', x: 330, y: LEDGE, face: 1, clip: 'hit', expr: 'intense' },  // the AI takes the hit
  { t: 619, move: 'stay', x: 330, y: LEDGE, face: 1, clip: 'cross', expr: 'cool' },   // "I would've dodged that."
  { t: 704, move: 'stay', x: 330, y: LEDGE, face: 1, clip: 'lean' },
  { t: 800, move: 'stay', x: 330, y: LEDGE, face: 1, clip: 'cheer' },
  { t: C + 22, go: C, x: 790, y: 655, face: -1, move: 'jump', h: 200, flip: 1, trail: true, fx: 'burst', clip: 'cheer' },
  { t: C + 134, move: 'stay', x: 790, y: 655, face: -1, clip: 'tell' },              // "Chapter seven's next."
  { t: C + 244, move: 'stay', x: 790, y: 655, face: -1, clip: 'aim' },               // "It's one for three there."
];

(async () => {
  const hp = runs('h');
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(20, 246, "SOMEONE'S PLAYING ME.", 0.285, 64),
    slam(246, 345, "IT'S AN AI.", 0.285, 72, { fill: '#7ff3ff' }),
    slam(345, 504, 'CHAPTER 5 · HARDEST MODE', 0.285, 60),
    slam(504, C, 'ONE LEFT.', 0.285, 96, { fill: '#7ff3ff' }),
    ...hp.map((r, k) => slam(k ? r.from : -4, r.to, 'AI HP: ' + r.v, 0.8, 80, { steady: true, fill: r.v < 50 ? '#ff5a5a' : '#ffffff' })),
    { type: 'scrim', from: C, to: TOTAL, a: 0.86, fade: 8 },
    slam(C + 2, TOTAL, 'IT CLEARED IT.', 0.36, 92, { fill: '#ffffff' }),
    slam(C + 18, TOTAL, ['6 OUT OF 7', 'TRIES.'], 0.47, 88, { fill: '#7ff3ff' }),
    slam(C + 118, TOTAL, ['CHAPTER 7:', '1 OUT OF 3.'], 0.62, 80, { fill: '#ff5a5a' }),
    slam(C + 230, TOTAL, 'NEXT: CHAPTER 7.', 0.75, 76, { fill: '#ffffff' }),
    { type: 'kael', from: 0, to: TOTAL, S: 3.8, track, mouth },
    { type: 'fade', from: TOTAL - 12, to: TOTAL, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-42-ai-ep1-kael-1080x1920-bed', profile: PROFILE, segs: segs.concat([{ len: END }]), overlays,
    pageScripts: ['js/smb-palette.js', 'js/smb-figure-rig.js', 'js/smb-figure-skin.js', 'js/smb-anim-core.js', 'js/smb-cin-figure.js'].map(f => path.join(ROOT, f)).concat([ path.join(__dirname, 'lib/mini-kael.js')]),
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 45.0, gain: 0.35, fadeIn: 0.1, fadeOut: 0.8 }, stingers: [],
  });
  const out = path.join(__dirname, 'out', 'short-42-ai-ep1-kael-1080x1920.mp4');
  mixVoice(r.out, out, VO.map((at, i) => ({ file: path.join(__dirname, 'audio/kael', `paced-line${i + 1}.wav`), at: at / 60 })));
  console.log(out, TOTAL, 'frames', (TOTAL / 60).toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
