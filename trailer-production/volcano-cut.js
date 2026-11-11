'use strict';
// Volcano Short: work/vert/volcano.mov (volcano.js) → out/short-21-volcano-1080x1920.mp4
//
//   node volcano-cut.js [profile] [--plan]
//
// Story form: the stake in frame 1 (the loot is in the crater; ten kills in the pit and it blows, and the counter
// already reads six), the turn (his kills take it to ten, and he's the one standing in it), the payoff (out over
// the rim as it goes). Windows and the counter come from the marks volcano.js logged.
const path = require('path');
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'volcano';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 96;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});

function timeline(wins) {
  const segs = []; let T = 0; const placed = [];
  for (const w of wins) {
    const speed = w.speed || 1, len = Math.round((w.to - w.at) / speed);
    segs.push({ shot: NAME, at: w.at, len, speed });
    placed.push({ at: w.at, to: w.to, speed, t0: T });
    T += len;
  }
  const out = src => { for (const p of placed) if (src >= p.at && src < p.to) return Math.round(p.t0 + (src - p.at) / p.speed); return src < placed[0].at ? 0 : T; };
  return { segs, T, out };
}

(async () => {
  const drop = fr(M.drop), kills = fr(M.kills), climb = fr(M.climb), run = fr(M.run), after = fr(M.after);
  const heat = (n) => { const h = M.heat.find(h => h[1] === n); return h ? fr(h[0]) : null; };
  const erupt = fr((M.heat.find(h => h[2] === 'erupt') || [M.after])[0]);
  const L = timeline([
    { at: 4, to: drop },                              // on the rim: the crater, the counter at six
    { at: drop, to: kills },                          // down into the pit
    { at: kills, to: climb, speed: 1.35 },            // four kills: 7, 8, 9, 10
    { at: climb, to: run },                           // it rumbles; up the ledges
    { at: run, to: Math.min(J.frames - 1, after + 110) },   // over the rim, down the slope, it blows
  ]);
  const P = { drop, kills, climb, run, erupt, after, heat: [7, 8, 9, 10].map(heat), T: L.T, secs: ((L.T + END) / 60).toFixed(1) };
  console.log(JSON.stringify(P));
  if (process.argv.includes('--plan')) return;
  const counter = [];
  [7, 8, 9].forEach(n => {
    const a = heat(n), b = heat(n + 1);
    if (a !== null) counter.push(slam(L.out(a), b !== null ? L.out(b) : L.out(climb), n + ' / 10', 0.30, 150, { bar: false, fill: '#ffb040' }));
  });
  const ten = heat(10);
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(0, L.out(drop) + 6, ['THE BEST LOOT', 'IS IN THE', 'VOLCANO.'], 0.13, 96, { bar: false }),
    slam(L.out(drop) + 6, L.out(kills) + 10, ['10 KILLS IN THE PIT', 'AND IT ERUPTS.'], 0.14, 88, { bar: false }),
    slam(L.out(kills) + 10, L.out(heat(7)), 'IT WAS AT 6.', 0.14, 104, { bar: false }),
    ...counter,
    slam(L.out(ten), L.out(run), '10 / 10', 0.30, 170, { bar: false, fill: '#ff5a1a' }),
    slam(L.out(ten) + 30, L.out(run), 'OH NO.', 0.14, 120, { bar: false }),
    slam(L.out(run), L.out(erupt) + 20, 'RUN.', 0.14, 140, { bar: false, fill: '#ff8a1a' }),
    slam(L.out(after), L.T, 'HE MADE IT OUT.', 0.14, 104, { bar: false, fill: '#7ff3ff' }),
    { type: 'scrim', from: L.T, to: L.T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: L.T, to: L.T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
    { type: 'fade', from: L.T + END - 10, to: L.T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-21-volcano-1080x1920', profile: PROFILE, segs: L.segs.concat([{ len: END }]), overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
