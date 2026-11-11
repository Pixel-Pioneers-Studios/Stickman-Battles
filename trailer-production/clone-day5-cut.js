'use strict';
// AI series, Day 5: the gun. work/vert/clone-day5.mov (clone.js, P1 = data/brain-ranged/latest.json iter 18102,
// the 17628 brain after the Oct 22 ranged night, P1W=gun, SOV=17628) → out/short-32-clone-day5-1080x1920.mp4
//
//   node clone-day5-cut.js [finIndex=1]
//
// The SHOTS / HITS counters and the closing totals are counted from the footage itself (s1 = Player 1's
// projectiles, a hit = Sovereign's health dropping outside a finisher). The 27% -> 31% eval lives in the description.
const { render, shotLog } = require('./lib/engine');

const PROFILE = 'vert', SHOT = 'clone-day5', J = shotLog(PROFILE, SHOT), L = J.log;
const END = 120, W = 360;
const fins = [], stocks = [];
for (let i = 1; i < L.length; i++) {
  const a = L[i - 1], b = L[i]; if (!a || !b) continue;
  if (b.fin && !a.fin) fins.push(i);
  if (b.l1 < a.l1) stocks.push(i);
}
const fin = fins[Number(process.argv[2] || 1)];
const stock = stocks.find(s => s > fin);
if (!fin || !stock) throw new Error('no gun-side stock lost with a finisher');
const at = fin - W, to = Math.min(J.frames - 1, stock + 24), T = to - at, tFin = fin - at;

const hitFrames = (from, upto) => { const h = []; let last = -99; for (let i = from + 1; i < upto; i++) { const a = L[i - 1], b = L[i]; if (a && b && b.h2 < a.h2 && !b.fin && b.l2 === a.l2 && i - last > 6) { h.push(i); last = i; } } return h; };
const shotFrames = (from, upto) => { const s = []; for (let i = from + 1; i < upto; i++) for (let k = L[i - 1].s1; k < L[i].s1; k++) s.push(i); return s; };
const totalShots = L[L.length - 1].s1, totalHits = hitFrames(0, L.length).length;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const counter = (frames, label, y, fill) => {
  const out = [], ev = frames.map(f => f - at);
  let prev = 0;
  ev.forEach((f, k) => { out.push(slam(prev, f, label + ': ' + k, y, 96, { bar: false, fill, steady: true, band: false })); prev = f; });
  out.push(slam(prev, tFin, label + ': ' + ev.length, y, 96, { bar: false, fill, steady: true, band: false }));
  out[0].from = -4;
  return out;
};
const finName = typeof L[fin].fin === 'string' ? L[fin].fin : null;

(async () => {
  const shots = shotFrames(at, fin), hits = hitFrames(at, fin);
  console.log({ at, to, fin, stock, finName, shots: shots.length, hits: hits.length, totalShots, totalHits });
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, tFin, ['IT PRACTICED', 'SHOOTING ALL NIGHT.'], 0.13, 80, { bar: false }),
    ...counter(shots, 'SHOTS', 0.25, '#ffffff'),
    ...counter(hits, 'HITS', 0.31, '#ff5a5a'),
    ...(finName ? [slam(tFin, T, finName, 0.2, 100, { bar: false, fill: '#ffcc33' })] : []),
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    slam(T + 4, T + END, ['WHOLE MATCH:', totalShots + ' SHOTS. ' + totalHits + ' HITS.', 'WHAT SHOULD IT', 'LEARN NEXT?'], 0.4, 84, { bar: false, fill: '#7ff3ff' }),
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-32-clone-day5-1080x1920', profile: PROFILE, segs: [{ shot: SHOT, at, len: T }, { len: END }], overlays,
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 45.0, gain: 0.7, fadeIn: 0.1, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
