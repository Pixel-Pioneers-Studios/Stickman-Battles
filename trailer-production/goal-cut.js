'use strict';
// Soccer Short: work/vert/goal.mov (goal.js) → out/short-34-goal-1080x1920.mp4
//
//   node goal-cut.js [profile] [--plan]
//
// The stake on frame 0 (4–4, next goal wins) with the kick already flying into the keeper, the super at half speed,
// the burning ball through him, 5–4. The SAVES count is the ball turning back off Varek in the footage.
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'goal';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 72;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});

(async () => {
  const sup = fr(M.sup), goal = fr(M.goal);
  const sA = sup - 4, sB = goal + 6;                     // the slow stretch, source frames
  const segs = [
    { shot: NAME, at: 0, len: sA },
    { shot: NAME, at: sA, len: (sB - sA) * 2, speed: 0.5 },
    { shot: NAME, at: sB, len: 54 },
  ];
  const outOf = f => f <= sA ? f : f <= sB ? sA + (f - sA) * 2 : sA + (sB - sA) * 2 + (f - sB);
  const T = segs.reduce((n, s) => n + s.len, 0), tSup = outOf(sup), tGoal = outOf(goal);
  console.log(JSON.stringify({ T, tSup, tGoal, secs: ((T + END) / 60).toFixed(1) }));
  if (process.argv.includes('--plan')) return;
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, tSup, 'NEXT GOAL WINS.', 0.12, 80, { bar: false }),
    slam(tSup, tGoal, 'SO HE SET IT ON FIRE.', 0.12, 72, { bar: false, fill: '#ff8a2a' }),
    slam(tGoal, T, 'STRAIGHT THROUGH HIM.', 0.12, 72, { bar: false, fill: '#7ff3ff' }),
    slam(-4, tGoal, '4 – 4', 0.22, 140, { bar: false, steady: true, band: false }),
    ...M.saves.map((f, i) => slam(outOf(fr(f)), i + 1 < M.saves.length ? outOf(fr(M.saves[i + 1])) : tSup, 'SAVES: ' + (i + 1), 0.32, 90, { bar: false, fill: '#ff5a5a', steady: true, band: false })),
    slam(tGoal, T, '5 – 4', 0.22, 160, { bar: false, fill: '#7ff3ff' }),
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: T, to: T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'SPORTS MODE: PLAY FREE', ctaAt: 18 },
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-34-goal-1080x1920', profile: PROFILE, segs: [...segs, { len: END }], overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
