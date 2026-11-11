'use strict';
// Pillar Short: work/vert/pillar.mov (pillar.js) → out/short-23-pillar-1080x1920.mp4
//
//   node pillar-cut.js [profile] [--plan]
//
// Story form: the stake (he's pinned against a pillar under a hammer), the turn (every blow is cracking the
// stone), the payoff (one hit back, and it comes down on the hammer). Windows from the marks pillar.js logged.
const path = require('path');
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'pillar';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;
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
  const b1 = fr(M.blows[0]), b2 = fr(M.blows[1]), hit = fr(M.hit), fall = fr(M.fall), ko = fr(M.ko);
  const L = timeline([
    { at: b1 + 6, to: b2 + 75 },                        // open on the first blow landing (no wind-up)
    { at: hit - 10, to: fall },                         // one hit back
    { at: fall, to: fall + 40, speed: 0.4 },            // it goes over: slow
    { at: fall + 40, to: Math.min(J.frames - 1, ko + 100) },
  ]);
  const P = { b1, b2, hit, fall, ko, T: L.T, secs: ((L.T + END) / 60).toFixed(1) };
  console.log(JSON.stringify(P));
  if (process.argv.includes('--plan')) return;
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, L.out(hit - 10), ['EVERY HIT', 'CRACKED IT.'], 0.14, 112, { bar: false, fill: '#ffd27a' }),
    slam(L.out(hit - 10), L.out(fall) + 50, ['HE ONLY NEEDED', 'ONE.'], 0.14, 104, { bar: false, fill: '#7ff3ff' }),
    { type: 'scrim', from: L.T, to: L.T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: L.T, to: L.T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
    { type: 'fade', from: L.T + END - 10, to: L.T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-23-pillar-1080x1920', profile: PROFILE, segs: L.segs.concat([{ len: END }]), overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
