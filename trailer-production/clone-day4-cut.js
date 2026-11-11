'use strict';
// AI series, Day 4: the turning. work/vert/clone-day4raw.mov (SOV = raw 15705) and clone-day4fix.mov
// (SOV = 15705 with its play block: away-turns wait 6 frames, turnDz 30) → out/short-31-clone-day4-1080x1920.mp4
//
//   node clone-day4-cut.js
//
// The on-screen counter and the closing per-minute numbers are Sovereign's facing reversals in the footage itself
// (finisher frames excluded). The Oct 19 real-game check vs the hard bot measured 114 raw and 15 fixed.
const { render, shotLog } = require('./lib/engine');

const PROFILE = 'vert', RAW = 'clone-day4raw', FIX = 'clone-day4fix';
const JR = shotLog(PROFILE, RAW), JF = shotLog(PROFILE, FIX);
const END = 120, WR = 300, WF = 210;

const turnsOf = J => { const t = []; for (let i = 1; i < J.log.length; i++) { const a = J.log[i - 1], b = J.log[i]; if (a && b && a.fc2 !== b.fc2 && !b.fin) t.push(i); } return t; };
const live = (J, i) => { const e = J.log[i]; return e && !e.fin && e.h1 > 0 && e.h2 > 0; };
// Pick the window: raw = the most turns while both are up close; fix = up close too, so it isn't just distance.
function pick(J, W, best) {
  const turns = new Set(turnsOf(J));
  let pickAt = null, score = null;
  for (let at = 60; at + W < J.log.length; at += 10) {
    let n = 0, close = 0, ok = true;
    for (let i = at; i < at + W; i++) {
      if (!live(J, i)) { ok = false; break; }
      if (turns.has(i)) n++;
      if (Math.abs(J.log[i].x1 - J.log[i].x2) < 90) close++;
    }
    // Frame 0 has to show both of them, so the opening second is up close.
    for (let i = at; ok && i < at + 40; i++) if (Math.abs(J.log[i].x1 - J.log[i].x2) > 60) ok = false;
    if (!ok || close < W * 0.6) continue;
    const sc = best === 'max' ? n : -n;
    if (score === null || sc > score) { score = sc; pickAt = at; }
  }
  if (pickAt === null) throw new Error('no window in ' + J.name);
  const inWin = [...turns].filter(i => i >= pickAt && i < pickAt + W).map(i => i - pickAt);
  return { at: pickAt, turns: inWin };
}
const R = pick(JR, WR, 'max'), F = pick(JF, WF, 'min');
const rate = J => { const t = turnsOf(J).length, n = J.log.filter(Boolean).length; return +(t / (n / 3600)).toFixed(0); };

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const counter = (t0, len, turns, fill) => {
  const out = []; let prev = 0;
  turns.forEach((f, k) => { if (k) out.push(slam(t0 + prev, t0 + f, 'TURNS: ' + k, 0.29, 110, { bar: false, fill, steady: true, band: false })); prev = f; });
  out.push(slam(t0 + prev, t0 + len, 'TURNS: ' + turns.length, 0.29, 110, { bar: false, fill, steady: true, band: false }));
  if (turns.length && turns[0] > 0) out.unshift(slam(t0, t0 + turns[0], 'TURNS: 0', 0.29, 110, { bar: false, fill, steady: true, band: false }));
  return out;
};

(async () => {
  console.log({ raw: R, fix: F, rawRate: rate(JR), fixRate: rate(JF) });
  const T = WR + WF;
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, WR, ['MY BOSS AI CAN\'T', 'STOP TURNING.'], 0.15, 84, { bar: false }),
    ...counter(0, WR, R.turns, '#ff5a5a'),
    slam(WR, T, ['FIX: MAKE IT', 'WAIT 6 FRAMES.'], 0.15, 84, { bar: false, fill: '#7ff3ff' }),
    ...counter(WR, WF, F.turns, '#7ff3ff'),
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    slam(T + 4, T + END, [rate(JR) + ' TURNS A MINUTE', 'DOWN TO ' + rate(JF) + '.', 'DAY 5: THE GUN.'], 0.4, 80, { bar: false, fill: '#7ff3ff' }),
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-31-clone-day4-1080x1920', profile: PROFILE,
    segs: [{ shot: RAW, at: R.at, len: WR }, { shot: FIX, at: F.at, len: WF }, { len: END }], overlays,
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 30.0, gain: 0.7, fadeIn: 0.1, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
