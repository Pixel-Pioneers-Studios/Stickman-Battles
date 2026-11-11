'use strict';
// AI series, Day 2: work/vert/clone-day2-before.mov + clone-day2-after.mov (clone.js) → out/short-16-clone-day2-1080x1920.mp4
//
//   node clone-day2-cut.js [--plan]     (--plan prints the chosen windows and stops)
//
// Story: the clone kept practicing and now beats the boss; the boss trains against it overnight and
// takes the fight back. Frame 1 has the boss losing (the opening rule from the Oct 21 Shorts).
// Numbers are 200-match evals in data/brain-tonight/night.log: skilled clone (iter 2114) 44% vs the
// live boss 17628, 35% vs the candidate 20011; 20011 wins 41% vs 17628. Footage: one match each.
const { render, shotLog } = require('./lib/engine');

const PROFILE = 'vert';
const BEFORE = shotLog(PROFILE, 'clone-day2-before'), AFTER = shotLog(PROFILE, 'clone-day2-after');
const END = 120;

// Stock losses in a shot: [{ f, who: 'clone' | 'sov', left }], f = the frame the stock count drops.
function stocks(J) {
  const out = [];
  for (let i = 1; i < J.log.length; i++) {
    const a = J.log[i - 1], b = J.log[i];
    if (!a || !b) continue;
    if (b.l1 < a.l1) out.push({ f: i, who: 'clone', left: b.l1 });
    if (b.l2 < a.l2) out.push({ f: i, who: 'sov', left: b.l2 });
  }
  return out;
}
function finStart(J, f) {
  for (let i = f; i > Math.max(0, f - 400); i--) if (J.log[i] && J.log[i].fin && !(J.log[i - 1] && J.log[i - 1].fin)) return i;
  return null;
}
const finName = (J, f) => (J.log[f] && typeof J.log[f].fin === 'string') ? J.log[f].fin : null;

function plan() {
  // The clone's finisher on the boss with the fewest boss stocks left: the boss is closest to losing.
  const cloneWins = stocks(BEFORE).filter(s => s.who === 'sov' && finStart(BEFORE, s.f));
  const sovWins = stocks(AFTER).filter(s => s.who === 'clone' && finStart(AFTER, s.f));
  if (!cloneWins.length) throw new Error('clone never took a stock with a finisher in clone-day2-before');
  if (!sovWins.length) throw new Error('new boss never took a stock with a finisher in clone-day2-after');
  const cw = cloneWins.reduce((a, b) => (b.left < a.left ? b : a));
  const sw = sovWins[sovWins.length - 1];
  const cf = finStart(BEFORE, cw.f), sf = finStart(AFTER, sw.f);
  return {
    cloneWin: { shot: 'clone-day2-before', at: Math.max(40, cf - 150), to: cw.f + 20, fin: finName(BEFORE, cf), f: cf, left: cw.left },
    sovOpen: { shot: 'clone-day2-after', at: Math.max(40, sf - 240), to: sf - 120 },
    sovWin: { shot: 'clone-day2-after', at: sf - 120, to: Math.min(AFTER.frames - 1, sw.f + 50), fin: finName(AFTER, sf), f: sf },
  };
}

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const tag = (from, to, text, y, extra) => Object.assign({ type: 'tag', from, to, text, x: 0.07, y, align: 'left', size: 60 }, extra || {});

(async () => {
  const P = plan();
  console.log(JSON.stringify(P));
  if (process.argv.includes('--plan')) return;
  const wins = [P.cloneWin, P.sovOpen, P.sovWin];
  const segs = []; let T = 0; const t0 = [];
  for (const w of wins) { t0.push(T); const len = w.to - w.at; segs.push({ shot: w.shot, at: w.at, len }); T += len; }
  const out = (i, src) => t0[i] + (src - wins[i].at);
  const tCloneFin = out(0, P.cloneWin.f), tOpen = t0[1], tFin = out(2, P.sovWin.f);
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(0, tCloneFin, ['DAY 2: MY AI CLONE', 'IS BEATING MY BOSS.'], 0.15, 78, { bar: false }),
    slam(tCloneFin, tOpen, '44 WINS IN 100.', 0.15, 104, { bar: false, fill: '#7ff3ff' }),
    ...(P.cloneWin.fin ? [tag(tCloneFin + 6, tOpen, P.cloneWin.fin, 0.27)] : []),
    slam(tOpen, tFin, ['SO THE BOSS TRAINED', 'AGAINST IT ALL NIGHT.'], 0.15, 74, { bar: false }),
    slam(tFin, T, '35 WINS IN 100.', 0.15, 104, { bar: false, fill: '#ff6a5a' }),
    ...(P.sovWin.fin ? [tag(tFin + 6, T, P.sovWin.fin, 0.27)] : []),
    { type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    slam(T + 4, T + END, ['IT LEARNED TO BEAT', 'MY CLONE...'], 0.36, 84, { bar: false }),
    slam(T + 45, T + END, ['AND GOT WORSE', 'AGAINST ITSELF.'], 0.56, 88, { bar: false, fill: '#ff9a2e' }),
    { type: 'fade', from: T + END - 10, to: T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-16-clone-day2-1080x1920', profile: PROFILE, segs: segs.concat([{ len: END }]), overlays,
    music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 12.0, gain: 0.7, fadeIn: 0.2, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
