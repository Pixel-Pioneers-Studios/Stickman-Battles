'use strict';
// "Most overpowered weapon" Short: work/vert/cataclysm.mov (cataclysm.js) → out/short-17-cataclysm-1080x1920.mp4
//
//   node cataclysm-cut.js [profile] [--plan]
//
// Story in the Edge/Knives form: the stake in frame 1 (six of them closing in on one), the turn (every swing a
// Conviction, a meteor swarm, then Axiom), the payoff (none left). Windows come from the marks cataclysm.js logged.
const path = require('path');
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'cataclysm';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 96;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const tag = (from, to, text, y, extra) => Object.assign({ type: 'tag', from, to, text, x: 0.07, y, align: 'left', size: 60 }, extra || {});

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
  const sw = fr(M.swings), q = fr(M.q), sup = fr(M.super), after = fr(M.after);
  const hole = sup + 200;                         // the collapse (smb-cataclysm.js: hole opens at 80, collapses 120 later)
  const L = timeline([
    { at: 4, to: sw },                            // six of them close in
    { at: sw, to: q - 4 },                        // three swings, three Convictions
    { at: q - 4, to: q + 150 },                   // the swarm, the towers, the office
    { at: sup - 26, to: hole + 110 },             // they come back; Axiom
    { at: after - 20, to: Math.min(J.frames - 1, after + 70) },
  ]);
  const P = { sw, q, sup, hole, after, T: L.T, secs: ((L.T + END) / 60).toFixed(1) };
  console.log(JSON.stringify(P));
  if (process.argv.includes('--plan')) return;
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(0, L.out(sw), ['6 OF THEM.', '1 OF ME.'], 0.14, 112, { bar: false }),
    slam(L.out(sw), L.out(q - 4), ['EVERY SWING IS', 'A CONVICTION.'], 0.14, 92, { bar: false }),
    slam(L.out(q - 4), L.out(sup - 26), ['THEN I CALLED', 'THE METEORS.'], 0.14, 92, { bar: false, fill: '#ffb040' }),
    tag(L.out(q) + 4, L.out(sup - 26), 'METEOR SWARM', 0.25),
    slam(L.out(sup - 26), L.out(hole) + 40, ['THEY KEPT COMING.', 'SO I SUMMONED', 'AXIOM.'], 0.13, 76, { bar: false, fill: '#c9b8ff' }),
    tag(L.out(sup) + 6, L.out(hole) + 40, 'COSMIC AXIOM', 0.29),
    slam(L.out(hole) + 40, L.T, ['THE MOST', 'OVERPOWERED WEAPON', 'I COULD MAKE.'], 0.13, 66, { bar: false }),
    slam(L.out(after - 20), L.T, 'TOO MUCH?', 0.31, 112, { bar: false, fill: '#7ff3ff' }),
    { type: 'scrim', from: L.T, to: L.T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: L.T, to: L.T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
    { type: 'fade', from: L.T + END - 10, to: L.T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-17-cataclysm-1080x1920', profile: PROFILE, segs: L.segs.concat([{ len: END }]), overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
