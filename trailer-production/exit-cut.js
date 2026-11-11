'use strict';
// Endless exit Short: work/vert/exit.mov (exit.js) → out/short-33-exit-1080x1920.mp4
//
//   node exit-cut.js [profile] [--plan]
//
// The rule and the count on frame 0, the count running down, the exit opening, and the hard cut (the fade between
// areas is dropped) to area 3's mini-boss on the next pad.
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'exit';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 96;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});

(async () => {
  const A1 = 0, L1 = fr(M.fade) + 4 - A1;
  const A2 = fr(M.area3) + 2, L2 = fr(M.jump) + 54 - A2;
  const T = L1 + L2;
  const open = fr(M.open) - A1, slamAt = L1 + fr(M.slam) - A2;
  const left = M.left.map(([f, n]) => [Math.max(0, fr(f) - A1), n]);
  console.log(JSON.stringify({ L1, L2, open, slamAt, left, boss: M.boss, secs: ((T + END) / 60).toFixed(1) }));
  if (process.argv.includes('--plan')) return;
  const overlays = [{ type: 'vignette', a: 0.3 }];
  overlays.push(slam(-4, open, ['THE EXIT OPENS WHEN', 'THEY\'RE ALL DEAD.'], 0.12, 72, { bar: false }));
  left.forEach(([f, n], i) => {
    if (n === 0) return;
    const to = i + 1 < left.length ? left[i + 1][0] : open;
    overlays.push(slam(i ? f : -4, to, n + ' LEFT', 0.25, 120, { bar: false, fill: '#ff5a5a', steady: true, band: false }));
  });
  overlays.push(slam(open, L1, 'EXIT OPEN.', 0.2, 110, { bar: false, fill: '#5fe8ff' }));
  overlays.push(slam(L1, T, ['AREA 3.', 'THE EXIT HAS A GUARD.'], 0.12, 72, { bar: false, fill: '#ff5a5a' }));
  if (M.boss) overlays.push(slam(L1 + 10, T, M.boss.name, 0.25, 84, { bar: false, fill: '#ffcc33' }));
  overlays.push(
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: T, to: T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'ENDLESS MODE: PLAY FREE', ctaAt: 18 },
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  );
  const r = await render({
    W: 1080, H: 1920, name: 'short-33-exit-1080x1920', profile: PROFILE,
    segs: [{ shot: NAME, at: A1, len: L1 }, { shot: NAME, at: A2, len: L2 }, { len: END }], overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
