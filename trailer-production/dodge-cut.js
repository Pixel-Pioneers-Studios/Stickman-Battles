'use strict';
// Dodgeball Short: work/vert/dodge.mov (dodge.js) → out/short-36-dodge-1080x1920.mp4
//
//   node dodge-cut.js [profile] [--plan]
//
// The stake on frame 0 (5–6, one more hit and he loses), the jump over the first throw, the catch at half speed
// (6–6), the throw back (7–6).
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'dodge';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 72;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});

(async () => {
  const at = (s) => fr(M.score.find(e => e[1] === s)[0]);
  const catchF = at('6-6'), winF = at('7-6');
  const sA = fr(M.throw2a) + 2, sB = catchF + 8;            // the catch at half speed, source frames
  const segs = [
    { shot: NAME, at: 0, len: sA },
    { shot: NAME, at: sA, len: (sB - sA) * 2, speed: 0.5 },
    { shot: NAME, at: sB, len: Math.min(J.frames - 1, winF + 34) - sB },
  ];
  const outOf = f => f <= sA ? f : f <= sB ? sA + (f - sA) * 2 : sA + (sB - sA) * 2 + (f - sB);
  const T = segs.reduce((n, s) => n + s.len, 0), tCatch = outOf(catchF), tWin = outOf(winF);
  console.log(JSON.stringify({ T, tCatch, tWin, secs: ((T + END) / 60).toFixed(1) }));
  if (process.argv.includes('--plan')) return;
  const score = (from, to, text, fill) => slam(from, to, text, 0.22, 140, { bar: false, fill, steady: true, band: false });
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, tCatch, ['ONE MORE HIT', 'AND HE LOSES.'], 0.12, 80, { bar: false }),
    score(-4, tCatch, '5 – 6', '#ffffff'),
    slam(tCatch, tWin, 'SHIELD = CATCH.', 0.12, 84, { bar: false, fill: '#7ff3ff' }),
    score(tCatch, tWin, '6 – 6', '#ffffff'),
    slam(tWin, T, 'THEN HE THREW IT BACK.', 0.12, 72, { bar: false, fill: '#7ff3ff' }),
    slam(tWin, T, '7 – 6', 0.22, 160, { bar: false, fill: '#7ff3ff' }),
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: T, to: T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'SPORTS MODE: PLAY FREE', ctaAt: 18 },
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-36-dodge-1080x1920', profile: PROFILE, segs: [...segs, { len: END }], overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
