'use strict';
// Nexus Defense Short: work/vert/nexus.mov (nexus.js) → out/short-35-nexus-1080x1920.mp4
//
//   node nexus-cut.js [profile] [--plan]
//
// The stake on frame 0 (last wave, the Nexus on 10 HP, one touch costs 10), the rusher count running down as he
// crosses the crystal from side to side, then the game's own result: NEXUS DEFENDED.
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'nexus';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 72;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});

(async () => {
  const downs = M.downs.map(fr), last = downs[downs.length - 1];
  const T = Math.min(J.frames - 1, last + 36);
  console.log(JSON.stringify({ T, downs, result: M.result, secs: ((T + END) / 60).toFixed(1) }));
  if (process.argv.includes('--plan')) return;
  const n = downs.length;
  const counter = [slam(-4, downs[0], n + ' LEFT', 0.25, 120, { bar: false, fill: '#ff5a5a', steady: true, band: false })];
  downs.forEach((d, i) => { if (i + 1 < n) counter.push(slam(d, downs[i + 1], (n - i - 1) + ' LEFT', 0.25, 120, { bar: false, fill: '#ff5a5a', steady: true, band: false })); });
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, last, ['ONE TOUCH AND', 'THE CRYSTAL BREAKS.'], 0.12, 72, { bar: false }),
    ...counter,
    slam(last, T, ['LAST WAVE.', 'NEXUS DEFENDED.'], 0.12, 80, { bar: false, fill: '#44ff88' }),
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: T, to: T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'NEXUS DEFENSE: PLAY FREE', ctaAt: 18 },
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-35-nexus-1080x1920', profile: PROFILE, segs: [{ shot: NAME, at: 0, len: T }, { len: END }], overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
