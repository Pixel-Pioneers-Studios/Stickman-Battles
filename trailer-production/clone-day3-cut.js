'use strict';
// AI series, Day 3: work/vert/clone-day3.mov (clone.js, P1W=gun, SOV=17628) → out/short-27-clone-day3-1080x1920.mp4
//
//   node clone-day3-cut.js [at]
//
// Story: the same boss brain on both sides, one copy holding a gun; the gun copy gets taken apart.
// The number is the Oct 21 weapon-read eval (data/brain-weapons/read-17628): 17628 holding the gun wins
// 3 of 60 (5%) against itself. Footage: one match, its first stock.
const { render, shotLog } = require('./lib/engine');

const PROFILE = 'vert', SHOT = 'clone-day3', J = shotLog(PROFILE, SHOT);
const END = 120;
let stock = null, fin = null;
for (let i = 1; i < J.log.length; i++) {
  const a = J.log[i - 1], b = J.log[i]; if (!a || !b) continue;
  if (fin === null && b.fin && !a.fin) fin = i;
  if (b.l1 < a.l1) { stock = i; break; }
}
if (!stock || !fin) throw new Error('no gun-side stock lost with a finisher');
const at = Number(process.argv[2]) || Math.max(40, fin - 300), to = Math.min(J.frames - 1, stock + 24);
const T = to - at, tFin = fin - at;
const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const tag = (from, to, text, y) => ({ type: 'tag', from, to, text, x: 0.07, y, align: 'left', size: 60 });
const finName = typeof J.log[fin].fin === 'string' ? J.log[fin].fin : null;

(async () => {
  console.log({ at, to, fin, stock, finName });
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, tFin, ['SAME AI.', 'ONE GETS A GUN.'], 0.15, 84, { bar: false }),
    slam(tFin, T, ['THE GUN WON', '3 OF 60.'], 0.15, 100, { bar: false, fill: '#ffcc33' }),
    ...(finName ? [tag(tFin + 6, T, finName, 0.27)] : []),
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    slam(T + 4, T + END, ['DAY 3:', 'SHOULD I TEACH', 'IT TO SHOOT?'], 0.4, 88, { bar: false, fill: '#7ff3ff' }),
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-27-clone-day3-1080x1920', profile: PROFILE, segs: [{ shot: SHOT, at, len: T }, { len: END }], overlays,
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 12.0, gain: 0.7, fadeIn: 0.1, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
