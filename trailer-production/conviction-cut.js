'use strict';
// Conviction Short edit: work/vert/conviction.mov → out/short-9-conviction-1080x1920.mp4
//
//   node conviction-cut.js
//
// Three windows of the one staged take (conviction.js), placed by the marks the
// capture logged, so a re-capture needs no hand re-timing:
//   1. the hit, the wall, the slump, Varek walking in        (swing → surge)
//   2. the surge into the game's own Conviction rise          (surge → name card + 50)
//   3. Storm Realm, the dash, STORMBEARER                    (close → finisher)
// The domain bubble, name card and quote are hidden in the capture (they sit
// outside the 9:16 crop) and set here as captions at the frames they fired.
const fs = require('fs'), path = require('path');
const { render, shotLog } = require('./lib/engine');

const J = shotLog('vert', 'conviction');
const M = J.marks;
const card = M.texts.find(t => t.kind === 'card');
const line = M.texts.find(t => t.kind === 'line' && /storm/i.test(t.text));
const finsub = M.texts.find(t => t.kind === 'finsub');
// Probe frames are 1-based director frames; recorded frame i has f = i + 1.
const fr = f => f - 1;

const A0 = fr(M.flight) - 3, A1 = fr(M.surge);
const B0 = A1, B1 = fr(card.f) + 70;
const C0 = fr(M.close) + Number(process.env.C_IN || 40), C1 = Math.min(J.frames - 1, fr(M.fin) + Number(process.env.FIN_LEN || 130));
const END = 96;

const segs = [
  { shot: 'conviction', at: A0, len: A1 - A0 },
  { shot: 'conviction', at: B0, len: B1 - B0 },
  { shot: 'conviction', at: C0, len: C1 - C0 },
  { len: END },
];
const t1 = A1 - A0, t2 = t1 + (B1 - B0), t3 = t2 + (C1 - C0), total = t3 + END;
const inB = f => t1 + (fr(f) - B0), inC = f => t2 + (fr(f) - C0);

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const tag = (from, to, text, y, extra) => Object.assign({ type: 'tag', from, to, text, x: 0.07, y, align: 'left', size: 60 }, extra || {});
const BLUE = '#7fd0ff';

const overlays = [
  { type: 'vignette', a: 0.3 },
  slam(fr(M.slam) - A0, t1, ['ONE HIT', 'FROM LOSING'], 0.17, 104, { bar: false }),
  slam(inB(card.f), Math.min(t2, inB(card.f) + 110), 'CONVICTION', 0.17, 122, { sub: 'STORM REALM', fill: BLUE, subFill: '#ffffff' }),
  line && slam(inB(line.f) + 30, t2, ['"THE STORM', 'ANSWERS ME."'], 0.62, 66, { bar: false, band: false }),
  tag(inC(M.fin) + 4, t3, 'STORMBEARER', 0.27),
  finsub && slam(inC(finsub.f), t3, ['"BY THE POWER', 'OF THE STORM."'], 0.62, 66, { bar: false, band: false, fill: BLUE }),
  { type: 'scrim', from: t3, to: total, a: 0.84, fade: 8 },
  { type: 'logo', from: t3, to: total, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
  { type: 'fade', from: total - 10, to: total, out: true },
].filter(Boolean);

(async () => {
  const r = await render({
    W: 1080, H: 1920, name: 'short-9-conviction-1080x1920', profile: 'vert', segs, overlays,
    // The bed comes in on the surge: the track's half-time drop (bar 24) lands on the release.
    music: { file: 'audio/music/boss-threshold.mp3', at: (t1 - 10) / 60, from: 40.0, gain: 0.8, fadeIn: 0.4, fadeOut: 0.8 },
    stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's', { A: [A0, A1], B: [B0, B1], C: [C0, C1] });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
