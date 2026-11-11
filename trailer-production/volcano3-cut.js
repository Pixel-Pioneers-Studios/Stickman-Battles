'use strict';
// Inside-the-volcano Short: work/vert/volcano3.mov (volcano3.js) → out/short-28-volcano3-1080x1920.mp4
//
//   node volcano3-cut.js [profile] [--plan]
//
// One continuous shot inside the pit. The stake on frame 0 (it is erupting, five are still inside), a counter that
// drops as the flood, a bomb and Kael's axe take them, the payoff (he is the last one left in it).
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'volcano3';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 96;
const AT = 4;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});

(async () => {
  const T = J.frames - 1 - AT;
  const out = f => Math.max(0, fr(f) - AT);
  const inside = M.inside.map(([f, n]) => [out(f), n]);
  const last = inside[inside.length - 1][0];
  console.log(JSON.stringify({ T, inside, secs: ((T + END) / 60).toFixed(1) }));
  if (process.argv.includes('--plan')) return;
  const overlays = [{ type: 'vignette', a: 0.3 }];
  overlays.push(slam(-4, last, "IT'S ERUPTING.", 0.12, 120, { bar: false }));
  inside.forEach(([f, n], i) => {
    const to = i + 1 < inside.length ? inside[i + 1][0] : T;
    if (to - f < 4) return;
    overlays.push(slam(i ? f : -4, to, n + ' STILL INSIDE', 0.25, 110, { bar: false, fill: n > 1 ? '#ffb040' : '#7ff3ff' }));
  });
  overlays.push(slam(last + 6, T, 'THE LAST ONE.', 0.12, 120, { bar: false, fill: '#7ff3ff' }));
  overlays.push(
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: T, to: T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  );
  const r = await render({
    W: 1080, H: 1920, name: 'short-28-volcano3-1080x1920', profile: PROFILE,
    segs: [{ shot: NAME, at: AT, len: T, speed: 1 }, { len: END }], overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
