'use strict';
// "Lightning vs Fire" hand-keyed Short: work/vert/duel.mov (anim-render.js duel) → out/short-25-duel-1080x1920.mp4
const { render, shotLog } = require('./lib/engine');
const J = shotLog('vert', 'duel');
const END = 120;
(async () => {
  const T = J.frames;
  const r = await render({
    W: 1080, H: 1920, name: 'short-25-duel-1080x1920', profile: 'vert',
    segs: [{ shot: 'duel', at: 0, len: T }, { len: END }],
    overlays: [
      { type: 'slam', from: -4, to: 70, text: ['LIGHTNING', 'VS FIRE.'], y: 0.12, size: 112, bar: false },
      { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
      { type: 'logo', from: T, to: T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'WANT MORE LIKE THIS?', ctaAt: 18 },
      { type: 'fade', from: T + END - 10, to: T + END, out: true },
    ],
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 40.0, gain: 0.7, fadeIn: 0.2, fadeOut: 1.0 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
