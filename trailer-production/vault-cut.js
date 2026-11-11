'use strict';
// Vault Short: work/vert/vault.mov (vault.js) → out/short-22-vault-1080x1920.mp4
//
//   node vault-cut.js [profile] [--plan]
//
// Story form: the stake in frame 1 (he's holding the door while Kael loots), the turn (he lets go; the door comes
// down), the payoff (the plate on the inside, the hammer from the chest). Windows come from the marks vault.js logged.
const path = require('path');
const { render, shotLog } = require('./lib/engine');

const PROFILE = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) || 'vert';
const NAME = 'vault';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;
const END = 96;
const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});

function timeline(wins) {
  const segs = []; let T = 0; const placed = [];
  for (const w of wins) {
    const speed = w.speed || 1, len = Math.round((w.to - w.at) / speed);
    segs.push({ shot: NAME, at: w.at, len, speed });
    placed.push({ at: w.at, to: w.to, speed, t0: T });
    T += len;
  }
  const out = src => { for (const p of placed) if (src >= p.at && src < p.to) return Math.round(p.t0 + (src - p.at) / p.speed); return src < placed[0].at ? 0 : T; };
  return { segs, T, out };
}

(async () => {
  const off = fr(M.off), shut = fr(M.shut), inside = fr(M.inside), plate = fr(M.plate), up = fr(M.up), swing = fr(M.swing), ko = fr(M.ko);
  const L = timeline([
    // Open mid-action (Oct 23 review: a static first second is what got swiped): he's already stepping off.
    { at: shut - 34, to: shut + 30 },            // open on Kael running at the door as it comes down
    { at: shut + 30, to: up + 6 },              // shut in; back across to the inner plate; up it goes
    { at: up + 6, to: Math.min(J.frames - 1, ko + 80) },   // out, and the hammer
  ]);
  const P = { off, shut, inside, plate, up, swing, ko, T: L.T, secs: ((L.T + END) / 60).toFixed(1) };
  console.log(JSON.stringify(P));
  if (process.argv.includes('--plan')) return;
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(-4, L.out(shut) + 24, ['HE LET GO', 'OF THE DOOR.'], 0.14, 112, { bar: false, fill: '#ff6a5a' }),
    slam(L.out(shut) + 24, L.out(plate) - 16, 'LOCKED IN.', 0.14, 120, { bar: false }),
    slam(L.out(plate) - 16, L.out(swing), ['THERE WAS A PLATE', 'ON THE INSIDE TOO.'], 0.14, 88, { bar: false, fill: '#ffd27a' }),
    slam(L.out(swing), L.T, ['AND HE FOUND', 'A HAMMER.'], 0.14, 104, { bar: false, fill: '#7ff3ff' }),
    { type: 'scrim', from: L.T, to: L.T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: L.T, to: L.T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
    { type: 'fade', from: L.T + END - 10, to: L.T + END, out: true },
  ];
  const r = await render({
    W: 1080, H: 1920, name: 'short-22-vault-1080x1920', profile: PROFILE, segs: L.segs.concat([{ len: END }]), overlays,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
