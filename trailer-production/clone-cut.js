'use strict';
// AI series, Day 1: work/vert/clone-raw.mov + clone-skilled.mov (clone.js) → out/short-13-clone-day1-1080x1920.mp4
//
//   node clone-cut.js [--plan]     (--plan prints the chosen windows and stops)
//
// Story: a net copied from the player's replays plays like him and loses like him; after a night of
// practice it takes real stocks. Numbers are 200-match evals vs the live boss (17628) in
// data/brain-clone/night.log: raw clone 4/100, skilled clone 31/100 (3 seeds). Footage: one match each.
const { render, shotLog } = require('./lib/engine');

const PROFILE = 'vert';
const RAW = shotLog(PROFILE, 'clone-raw'), SK = shotLog(PROFILE, 'clone-skilled');
const END = 110;

// Stock losses in a shot: [{ f, who: 'clone' | 'sov' }], f = the frame the stock count drops.
function stocks(J) {
  const out = [];
  for (let i = 1; i < J.log.length; i++) {
    const a = J.log[i - 1], b = J.log[i];
    if (!a || !b) continue;
    if (b.l1 < a.l1) out.push({ f: i, who: 'clone' });
    if (b.l2 < a.l2) out.push({ f: i, who: 'sov' });
  }
  return out;
}
// The finisher that ended a stock: the last frame before it where `fin` switched on.
function finStart(J, f) {
  for (let i = f; i > Math.max(0, f - 400); i--) if (J.log[i] && J.log[i].fin && !(J.log[i - 1] && J.log[i - 1].fin)) return i;
  return null;
}
const finName = (J, f) => (J.log[f] && typeof J.log[f].fin === 'string') ? J.log[f].fin : null;

function plan() {
  // Stocks that ended in a finisher read best: the KO is unmistakable at phone size.
  const rawLoss = stocks(RAW).find(s => s.who === 'clone' && finStart(RAW, s.f));
  const skWin = stocks(SK).find(s => s.who === 'sov' && finStart(SK, s.f));
  if (!rawLoss) throw new Error('raw clone never lost a stock to a finisher in the capture');
  if (!skWin) throw new Error('skilled clone never took a stock with a finisher in the capture');
  const rf = finStart(RAW, rawLoss.f);
  const sf = finStart(SK, skWin.f);
  return {
    rawOpen: { shot: 'clone-raw', at: rf - 330, to: rf - 110 },
    rawLoss: { shot: 'clone-raw', at: rf - 110, to: rawLoss.f + 20, fin: finName(RAW, rf) },
    skOpen: { shot: 'clone-skilled', at: Math.max(40, sf - 330), to: sf - 120 },
    skWin: { shot: 'clone-skilled', at: sf - 120, to: Math.min(SK.frames - 1, skWin.f + 50), fin: finName(SK, sf), f: sf },
  };
}

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const tag = (from, to, text, y, extra) => Object.assign({ type: 'tag', from, to, text, x: 0.07, y, align: 'left', size: 60 }, extra || {});

(async () => {
  const P = plan();
  console.log(JSON.stringify(P));
  if (process.argv.includes('--plan')) return;
  const wins = [P.rawOpen, P.rawLoss, P.skOpen, P.skWin];
  const segs = []; let T = 0; const t0 = [];
  for (const w of wins) { t0.push(T); const len = w.to - w.at; segs.push({ shot: w.shot, at: w.at, len }); T += len; }
  const out = (i, src) => t0[i] + (src - wins[i].at);
  const tRawLoss = t0[1], tSk = t0[2], tWin = t0[3], tFin = out(3, P.skWin.f);
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(0, tRawLoss + 40, ['I TRAINED AN AI', 'TO PLAY LIKE ME.'], 0.15, 92, { bar: false }),
    slam(tRawLoss + 40, tRawLoss + 100, 'IT PLAYS LIKE ME.', 0.15, 96, { bar: false }),
    slam(tRawLoss + 100, tSk, 'IT LOSES LIKE ME.', 0.15, 96, { bar: false, fill: '#ff6a5a' }),
    slam(tSk - 70, tSk, ['VS MY BOSS AI:', '4 WINS IN 100'], 0.80, 84, { bar: true }),
    slam(tSk, tWin + 30, ['SO IT PRACTICED.', 'ALL NIGHT.'], 0.15, 92, { bar: false }),
    slam(tFin, T, '31 WINS IN 100.', 0.15, 104, { bar: false, fill: '#7ff3ff' }),
    ...(P.skWin.fin ? [tag(tFin + 6, T, P.skWin.fin, 0.27)] : []),
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    slam(T + 4, T + END, ['NEXT: THE BOSS AI', 'TRAINS AGAINST IT.'], 0.36, 84, { bar: false }),
    slam(T + 40, T + END, 'DAY 2 TOMORROW.', 0.56, 96, { bar: false, fill: '#ff9a2e' }),
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-13-clone-day1-1080x1920', profile: PROFILE, segs: segs.concat([{ len: END }]), overlays,
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 12.0, gain: 0.7, fadeIn: 0.2, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
