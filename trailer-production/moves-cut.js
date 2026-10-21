'use strict';
// Weapon-trick Shorts edit: work/vert/<scene>.mov → out/short-<n>-<scene>-1080x1920.mp4
//
//   node moves-cut.js <scene> [profile]
//
// Windows are placed from the marks moves.js logged, so a re-capture needs no
// hand re-timing. Slow-motion windows use the engine's segment `speed`.
const path = require('path');
const { render, shotLog } = require('./lib/engine');

const NAME = process.argv[2], PROFILE = process.argv[3] || 'vert';
const J = shotLog(PROFILE, NAME);
const M = J.marks;
const fr = f => f - 1;   // director frame → recorded frame
const END = 96;

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const tag = (from, to, text, y, extra) => Object.assign({ type: 'tag', from, to, text, x: 0.07, y, align: 'left', size: 60 }, extra || {});
const endCard = t => [
  { type: 'scrim', from: t, to: t + END, a: 0.84, fade: 8 },
  { type: 'logo', from: t, to: t + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
  { type: 'fade', from: t + END - 10, to: t + END, out: true },
];

// Lay out windows [{at, to, speed}] back to back; returns segs and a map from source frame → output frame.
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

const SPECS = {
  // Anchor: throw, bite, the axe misses under him, up onto the ledge, hook, haul, Keelhaul.
  anchor: () => {
    const bite = fr(M.bite), keel = fr(M.keel), fin = fr(M.fin);
    const L = timeline([
      { at: 3, to: bite - 8 },
      { at: bite - 8, to: fr(M.perched) + 4, speed: 0.5 },     // the bite, the axe, the pull: half speed
      { at: fr(M.perched) + 4, to: fr(M.hooked) - 4 },
      { at: fr(M.hooked) - 4, to: fr(M.hooked) + 10, speed: 0.5 }, // the hook landing
      { at: fr(M.hooked) + 10, to: Math.min(J.frames - 1, fin + 118) },
    ]);
    return {
      n: 10, L, music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 },
      overlays: [
        { type: 'vignette', a: 0.3 },
        // Off before he reaches the ledge: up there he's in the top band where the caption sits.
        slam(0, L.out(bite) + 24, ['HIS ANCHOR IS', 'A GRAPPLING HOOK'], 0.15, 92, { bar: false }),
        slam(L.out(fr(M.hooked)), L.out(keel), 'GOT YOU.', 0.80, 104, { bar: false }),
        tag(L.out(fin) + 4, L.T, 'KEELHAUL', 0.27),
        ...endCard(L.T),
      ],
    };
  },
  // Knives: six misses, the glance back, the walk in, Recall through his back.
  knives: () => {
    const rec = fr(M.recall), fin = fr(M.fin);
    const L = timeline([
      { at: 3, to: fr(M.walk) + 30 },
      { at: fr(M.walk) + 30, to: rec - 6, speed: 1.5 },          // the walk in, quicker
      { at: rec - 6, to: fin + 2, speed: 0.45 },                 // the knives coming home: slow
      { at: fin + 2, to: Math.min(J.frames - 1, fin + 108) },
    ]);
    return {
      n: 11, L, music: { file: 'audio/music/arena-neon.mp3', at: 0, from: 27.0, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 },
      overlays: [
        { type: 'vignette', a: 0.3 },
        slam(0, L.out(rec) - 2, ['HE MISSED', 'EVERY THROW.'], 0.15, 104, { bar: false }),
        slam(L.out(rec), L.out(fin) + 40, 'ON PURPOSE.', 0.15, 112, { bar: false, fill: '#ff8ae8' }),
        tag(L.out(fin) + 4, L.T, 'RECALL: ALL', 0.27),
        ...endCard(L.T),
      ],
    };
  },
  // Katana: three charge; one draw through all of them; the cut lands on the sheathe.
  // The draw is captured in the game's own slow motion, so it plays at speed 1.
  katana: () => {
    const draw = fr(M.draw), fin = fr(M.fin);
    const L = timeline([
      { at: Math.max(3, draw - 28), to: draw },   // open as the first of them runs into frame
      { at: draw, to: fin + 2 },
      { at: fin + 2, to: Math.min(J.frames - 1, fin + 134) },
    ]);
    return {
      n: 12, L, music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 40.0, gain: 0.75, fadeIn: 0.2, fadeOut: 0.8 },
      overlays: [
        { type: 'vignette', a: 0.3 },
        slam(0, L.out(draw) + 30, ['THREE OF THEM.', 'ONE OF HIM.'], 0.15, 96, { bar: false }),
        slam(L.out(fin) - 30, L.T, 'ONE DRAW.', 0.15, 116, { bar: false, fill: '#7ff3ff' }),
        ...endCard(L.T),
      ],
    };
  },
};

(async () => {
  const spec = SPECS[NAME] && SPECS[NAME]();
  if (!spec) throw new Error('usage: node moves-cut.js <' + Object.keys(SPECS).join('|') + '> [profile]');
  const segs = spec.L.segs.concat([{ len: END }]);
  const r = await render({
    W: 1080, H: 1920, name: `short-${spec.n}-${NAME}-1080x1920`, profile: PROFILE, segs, overlays: spec.overlays,
    music: spec.music, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
