'use strict';
// AI series, Day 6: the boss brain up the Fight Ladder. work/vert/ladder-8-loss.mov (ladder.js 8, a take the
// Berserker won) → out/short-38-ladder-1080x1920.mp4
//
//   node ladder-cut.js
//
// Numbers from tools/brain/laddereval.js, 6 matches a rung, data/brain/latest.json with the Null Blade, no
// retry assist (data/brain-ladder/rungs1-4.json + rungs5-10.json): rungs 1-8 48-0, Berserker 4-2, Champion 5-1.
// The STOCKS counter is read from the footage (Player 1's lives).
const { render, shotLog } = require('./lib/engine');

const PROFILE = 'vert', SHOT = 'ladder-8-loss', J = shotLog(PROFILE, SHOT), L = J.log;
const END = 150;
const lost = [];
for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; if (a && b && (b.l1 < a.l1 || (b.l1 === 1 && b.h1 <= 0 && a.h1 > 0))) lost.push(i); }
if (lost.length < 3) throw new Error('need a take where it loses all three stocks: ' + lost);
const pre = [95, 110, 130];
const wins = lost.slice(0, 3).map((s, k) => ({ at: Math.max(2, s - pre[k]), to: Math.min(J.frames - 1, s + (k === 2 ? 50 : 18)) }));
for (let k = 1; k < wins.length; k++) if (wins[k].at < wins[k - 1].to) wins[k].at = wins[k - 1].to;
let T = 0; const segs = [], lostOut = [];
wins.forEach((w, k) => { segs.push({ shot: SHOT, at: w.at, len: w.to - w.at }); lostOut.push(T + (lost[k] - w.at)); T += w.to - w.at; });

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
(async () => {
  console.log({ lost, wins, T });
  const st = (from, to, n) => slam(from, to, 'STOCKS LEFT: ' + n, 0.27, 84, { bar: false, fill: n === 0 ? '#ff5a5a' : '#ffffff', steady: true, band: false });
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, lostOut[0], ['48 WINS.', '0 LOSSES.'], 0.13, 104, { bar: false, fill: '#7ff3ff' }),
    slam(lostOut[0], T, ['THEN RUNG 9:', 'THE BERSERKER.'], 0.13, 96, { bar: false, fill: '#ff5a5a' }),
    { ...st(-4, lostOut[0], 3), from: -4 },
    st(lostOut[0], lostOut[1], 2),
    st(lostOut[1], lostOut[2], 1),
    st(lostOut[2], T, 0),
    { type: 'scrim', from: T, to: T + END, a: 0.86, fade: 8 },
    slam(T + 4, T + END, ['60 MATCHES.', '57 WON.'], 0.27, 100, { bar: false, fill: '#ffffff' }),
    slam(T + 22, T + END, ['CHAMPION BEAT IT: 1x', 'BERSERKER BEAT IT: 2x'], 0.45, 64, { bar: false, fill: '#ff5a5a' }),
    slam(T + 44, T + END, ['DAY 7:', 'WHY RUNG 9?'], 0.63, 100, { bar: false, fill: '#7ff3ff' }),
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-38-ladder-1080x1920', profile: PROFILE, segs: segs.concat([{ len: END }]), overlays,
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 45.0, gain: 0.7, fadeIn: 0.1, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
