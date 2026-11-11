'use strict';
// Rope bridge Short: work/vert/bridge.mov (bridge.js) → out/short-29-bridge-1080x1920.mp4
//
//   node bridge-cut.js [profile] [--plan]
//
// One continuous shot. The rule on frame 0 (it holds 4, and it's already at 4), the fifth stepping on, the snap,
// the payoff (one got across).
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'bridge';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 96;
const AT = 2;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});

(async () => {
  const T = J.frames - 1 - AT;
  const out = f => Math.max(0, fr(f) - AT);
  const snap = out(M.snap), land = out(M.land);
  console.log(JSON.stringify({ T, snap, land, secs: ((T + END) / 60).toFixed(1) }));
  if (process.argv.includes('--plan')) return;
  const overlays = [{ type: 'vignette', a: 0.3 }];
  overlays.push(slam(-4, land, 'THIS BRIDGE HOLDS 4.', 0.12, 72, { bar: false }));
  overlays.push(slam(-4, snap, '4 / 4', 0.25, 120, { bar: false, fill: '#ffb040' }));
  overlays.push(slam(snap, land, '5 / 4', 0.25, 140, { bar: false, fill: '#ff3a2a' }));
  overlays.push(slam(land + 4, T, 'ONLY ONE GOT ACROSS.', 0.12, 72, { bar: false, fill: '#7ff3ff' }));
  overlays.push(
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: T, to: T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  );
  const r = await render({
    W: 1080, H: 1920, name: 'short-29-bridge-1080x1920', profile: PROFILE,
    segs: [{ shot: NAME, at: AT, len: T, speed: 1 }, { len: END }], overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
