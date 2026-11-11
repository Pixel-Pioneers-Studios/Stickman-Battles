'use strict';
// "Can my AI beat my game?" Episode 1: Chapter 5 (registry id 4, Bleeding Sky) on Evolution.
// work/<profile>/story-4-a.mov (story-run.js) → out/short-41-story-ch5-1080x1920.mp4
//
//   node story-cut.js [draft|vert]
//
// Counts: level-tester 3 tries (2 wins) + 3 captured takes (3 wins) on ch5; level-tester ch7 (id 6) 1 of 3.
// The AI HP counter and enemy count are read from the footage's log, nothing is staged.
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv[2] || 'draft', SHOT = 'story-4-a', J = shotLog(PROFILE, SHOT), L = J.log;
const END = 170;
const wins = [{ at: 1000, to: 1290 }, { at: 1500, to: 1542 }, { at: 1725, to: 1790 }, { at: 2105, to: 2165 }, { at: 2240, to: 2290 }];
let T = 0; const segs = [], map = [];
for (const w of wins) { segs.push({ shot: SHOT, at: w.at, len: w.to - w.at }); map.push({ t: T, ...w }); T += w.to - w.at; }
const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size, bar: false }, extra || {});

// One steady caption per run of equal values in the kept footage.
const runs = (key) => { const out = []; for (const m of map) for (let f = m.at; f < m.to; f++) { const v = L[f][key], t = m.t + f - m.at, l = out[out.length - 1]; if (l && l.v === v) l.to = t + 1; else out.push({ v, from: t, to: t + 1 }); } return out; };

(async () => {
  const hp = runs('h'), foes = runs('foes');
  console.log({ T, hp: hp.map(r => r.v), foes: foes.map(r => r.v) });
  const t2 = map[1].t, t3 = map[3].t;
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, t2, ["I CAN'T BEAT", 'CHAPTER 5 OF', 'MY OWN GAME.'], 0.1, 84, { fill: '#ffffff' }),
    slam(30, t2, 'CAN MY AI?', 0.25, 96, { fill: '#7ff3ff' }),
    slam(t2, t3, 'HARDEST DIFFICULTY.', 0.12, 78, { fill: '#ffffff' }),
    slam(t3, T, 'ONE LEFT.', 0.12, 96, { fill: '#7ff3ff' }),
    ...hp.map((r, k) => slam(k ? r.from : -4, r.to, 'AI HP: ' + r.v, 0.82, 92, { steady: true, band: false, fill: r.v < 40 ? '#ff5a5a' : '#ffffff' })),
    { type: 'scrim', from: T, to: T + END, a: 0.86, fade: 8 },
    slam(T + 4, T + END, ['IT CLEARED IT.', '5 TRIES OUT OF 6.'], 0.27, 92, { fill: '#7ff3ff' }),
    slam(T + 26, T + END, ['CHAPTER 7:', '1 OUT OF 3.'], 0.46, 92, { fill: '#ff5a5a' }),
    slam(T + 52, T + END, ['NEXT: CHAPTER 7.'], 0.64, 92, { fill: '#ffffff' }),
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-41-story-ch5-1080x1920' + (PROFILE === 'draft' ? '-draft' : ''), profile: PROFILE, segs: segs.concat([{ len: END }]), overlays,
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 45.0, gain: 0.6, fadeIn: 0.1, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
