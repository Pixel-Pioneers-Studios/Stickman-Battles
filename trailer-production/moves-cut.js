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

// Edge: a story Short in the Conviction form. One hit into the pit; Varek comes to watch; Shadow Step.
SPECS.edge = () => {
  const look = fr(M.look), step = fr(M.step), fin = fr(M.fin);
  const L = timeline([
    { at: 2, to: look },
    { at: look, to: step },
    { at: step, to: fin + 2, speed: 0.6 },          // the vanish and the reappearance behind him: slower
    { at: fin + 2, to: Math.min(J.frames - 1, fin + 140) },
  ]);
  return {
    n: 14, L, music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 40.0, gain: 0.75, fadeIn: 0.2, fadeOut: 0.8 },
    overlays: [
      { type: 'vignette', a: 0.3 },
      slam(0, L.out(look), ['ONE HIT.', 'INTO THE PIT.'], 0.15, 104, { bar: false }),
      slam(L.out(look) + 6, L.out(step) + 8, ['HE CAME OVER', 'TO WATCH.'], 0.15, 100, { bar: false }),
      slam(L.out(step) + 8, L.out(fin) + 50, 'WRONG WAY.', 0.15, 116, { bar: false, fill: '#7ff3ff' }),
      tag(L.out(fin) + 4, L.T, 'THOUSAND STEPS', 0.27),
      ...endCard(L.T),
    ],
  };
};

// Guard: a story Short. Three thrusts off the shield; Lance Charge breaks the guard; LAST CHARGE.
SPECS.guard = () => {
  const p3 = fr(M.poke3), charge = fr(M.charge), fin = fr(M.fin);
  const L = timeline([
    { at: 2, to: charge - 4 },
    { at: charge - 4, to: fin + 2, speed: 0.6 },    // the break and the carry: slower
    { at: fin + 2, to: Math.min(J.frames - 1, fin + 150) },
  ]);
  return {
    n: 15, L, music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 },
    overlays: [
      { type: 'vignette', a: 0.3 },
      slam(0, L.out(p3), ['HE BLOCKED', 'EVERYTHING.'], 0.15, 104, { bar: false }),
      slam(L.out(p3), L.out(charge) - 2, 'EVERYTHING.', 0.15, 112, { bar: false }),
      slam(L.out(charge) - 2, L.out(fin) + 40, 'ALMOST.', 0.15, 120, { bar: false, fill: '#7ff3ff' }),
      tag(L.out(fin) + 4, L.T, 'LAST CHARGE', 0.27),
      ...endCard(L.T),
    ],
  };
};

// Pan: a story Short. A frying pan against an axe; Varek laughs and lands the axe; Grand Slam, HOLE IN ONE.
SPECS.pan = () => {
  const hit = fr(M.hit), bonk = fr(M.slam), fin = fr(M.fin);
  const L = timeline([
    { at: 4, to: hit + 2 },
    { at: hit + 2, to: bonk },
    { at: bonk, to: fin + 2, speed: 0.7 },          // the bonk and the wind-up: a touch slower
    { at: fin + 2, to: Math.min(J.frames - 1, fin + 108) },
  ]);
  return {
    n: 18, L, music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 },
    overlays: [
      { type: 'vignette', a: 0.3 },
      slam(0, L.out(hit), ['HE BROUGHT', 'A FRYING PAN', 'TO AN AXE FIGHT.'], 0.15, 88, { bar: false }),
      slam(L.out(hit), L.out(bonk), ['THE AXE', 'HIT FIRST.'], 0.15, 104, { bar: false }),
      slam(L.out(bonk), L.out(fin) + 70, ['THE PAN', 'HIT HARDER.'], 0.15, 104, { bar: false, fill: '#ffdd44' }),
      tag(L.out(fin) + 4, L.T, 'HOLE IN ONE', 0.27),
      ...endCard(L.T),
    ],
  };
};

// Arena: a story Short. Varek one swing from the win over a kneeling Kael; a city car takes him out of it;
// Kael gets up bare-handed: HUNDRED FISTS.
SPECS.arena = () => {
  const car = fr(M.car), hit = fr(M.hit), strike = fr(M.strike), fin = fr(M.fin);
  const L = timeline([
    { at: 8, to: car },
    { at: car, to: hit - 22, speed: 1.6 },          // the car's approach off-frame, quicker
    { at: hit - 22, to: hit + 4, speed: 0.4 },      // in frame: slow, so the car reads on a phone
    { at: hit + 4, to: strike, speed: 0.8 },
    { at: strike, to: Math.min(J.frames - 1, fin + 200) },
  ]);
  return {
    n: 19, L, music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 25.6, gain: 0.7, fadeIn: 0.15, fadeOut: 0.8 },
    overlays: [
      { type: 'vignette', a: 0.3 },
      slam(0, L.out(hit) - 2, ['ONE SWING', 'FROM WINNING.'], 0.15, 104, { bar: false }),
      slam(L.out(hit) - 2, L.out(fin) + 60, ['THE CITY HAD', 'OTHER PLANS.'], 0.15, 100, { bar: false, fill: '#ffcc33' }),
      tag(L.out(fin) + 4, L.T, 'HUNDRED FISTS', 0.27),
      ...endCard(L.T),
    ],
  };
};

// Dodge: a story Short. The hammer at point blank; he goes over it and over Varek; Soul Reap, HARVEST.
SPECS.dodge = () => {
  const swing = fr(M.swing), land = fr(M.land), fin = fr(M.fin);
  const L = timeline([
    { at: 8, to: swing, speed: 0.55 },              // hold the stake: hammer up, nowhere to go
    { at: swing, to: land + 4 },                    // the jump is already in the game's slow motion
    { at: land + 4, to: Math.min(J.frames - 1, fin + 190) },
  ]);
  return {
    n: 20, L, music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 40.0, gain: 0.75, fadeIn: 0.2, fadeOut: 0.8 },
    overlays: [
      { type: 'vignette', a: 0.3 },
      slam(0, L.out(swing) + 8, ['NOWHERE', 'TO GO.'], 0.15, 112, { bar: false }),
      slam(L.out(swing) + 8, L.out(fin) + 40, ['SO HE WENT', 'OVER IT.'], 0.15, 104, { bar: false, fill: '#7ff3ff' }),
      tag(L.out(fin) + 4, L.T, 'HARVEST', 0.27),
      ...endCard(L.T),
    ],
  };
};

// Axe vs Katana: a staged duel in the game's own fighters. The lock gives, Kael charges, the ground throws him up,
// Varek meets him above and spikes him into a crater. In the dust: the katana still shines.
SPECS.axeslam = () => {
  const launch = fr(M.launch), spike = fr(M.spike), glint = fr(M.glintAt);
  const L = timeline([
    { at: 0, to: launch - 2 },
    { at: launch - 2, to: launch + 16, speed: 0.55 },   // the rock throws him: let it read
    { at: launch + 16, to: spike - 4 },
    { at: spike - 4, to: spike + 14, speed: 0.45 },     // the spike
    { at: spike + 14, to: Math.min(J.frames - 1, glint + 70) },
  ]);
  return {
    n: 26, L, music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 40.0, gain: 0.75, fadeIn: 0.1, fadeOut: 0.8 },
    overlays: [
      { type: 'vignette', a: 0.3 },
      slam(-4, L.out(launch), ['AXE', 'VS KATANA.'], 0.15, 112, { bar: false }),
      slam(L.out(glint) - 6, L.T, ['PART 2?'], 0.15, 120, { bar: false, fill: '#7ff3ff' }),
      ...endCard(L.T),
    ],
  };
};

SPECS.beast = () => {
  const cut = fr(M.beastCut), grant = fr(M.grant), s3 = fr(M.s3), thud = fr(M.thud);
  const L = timeline([
    { at: 0, to: cut - 6 },
    { at: cut - 6, to: cut + 14, speed: 0.5 },          // the cut through the beast
    { at: cut + 14, to: grant + 30 },
    { at: grant + 30, to: s3 - 4 },
    { at: s3 - 4, to: s3 + 14, speed: 0.5 },            // the throw
    { at: s3 + 14, to: Math.min(J.frames - 1, thud + 60) },
  ]);
  return {
    n: 30, L, music: { file: 'audio/music/boss-threshold.mp3', at: 0, from: 52.0, gain: 0.75, fadeIn: 0.1, fadeOut: 0.8 },
    overlays: [
      { type: 'vignette', a: 0.3 },
      slam(-4, L.out(grant), ['KILL THE BEAST.', 'BECOME THE BEAST.'], 0.15, 80, { bar: false }),
      slam(L.out(grant) + 8, L.out(s3), ['HE KEPT', 'THE KATANA.'], 0.15, 104, { bar: false, fill: '#7ff3ff' }),
      slam(L.out(thud) - 4, L.T, ['BEAST + KATANA.'], 0.15, 104, { bar: false, fill: '#7ff3ff' }),
      ...endCard(L.T),
    ],
  };
};


// Mines: three chase him across his own minefield; he turns round and holds Q. Open loop on frame 0
// ("he's not running" over a man running), answered by the blast. Slow motion is captured in-engine.
SPECS.mines = () => {
  const boom = fr(M.boom);
  const L = timeline([
    { at: 2, to: boom },
    { at: boom, to: Math.min(J.frames - 1, boom + 150) },
  ]);
  return {
    n: 37, L, music: { file: 'audio/music/arena-neon.mp3', at: 0, from: 27.0, gain: 0.7, fadeIn: 0.1, fadeOut: 0.8 },
    overlays: [
      { type: 'vignette', a: 0.3 },
      slam(-4, L.out(boom), ["HE'S NOT", 'RUNNING.'], 0.15, 112, { bar: false }),
      slam(L.out(boom) + 6, L.T, ['SIX STICKY', 'BOMBS.'], 0.15, 112, { bar: false, fill: '#ff5a4a' }),
      ...endCard(L.T),
    ],
  };
};

// Shatter: the Glass Blade at 2 of 3 cracks, three round him. The rule on frame 0 reads as a threat;
// the third crack is the payoff (its own ring of shards). Counter from D.log.cracks.
SPECS.shatter = () => {
  const boom = fr(M.boom);
  const two = fr((M.cracks.find(c => c[1] === 2) || [9])[0]);
  const back = M.cracks.find((c, i) => i > 0 && c[1] === 0);
  const L = timeline([
    { at: 2, to: boom },
    { at: boom, to: J.frames - 1 },
  ]);
  const o = [
    { type: 'vignette', a: 0.3 },
    slam(-4, L.out(boom), ['ONE MORE CRACK', 'AND IT SHATTERS.'], 0.13, 84, { bar: false }),
    slam(-4, L.out(two), '1 / 3', 0.27, 140, { bar: false, fill: '#bff4ff', steady: true }),
    slam(L.out(two), L.out(boom), '2 / 3', 0.27, 140, { bar: false, fill: '#ffb040', steady: true }),
    slam(L.out(boom), back ? L.out(fr(back[0])) : L.T, '3 / 3', 0.27, 160, { bar: false, fill: '#ff3a2a' }),
    slam(L.out(boom) + 10, L.T, ['THAT WAS', 'THE PLAN.'], 0.13, 112, { bar: false, fill: '#7ff3ff' }),
  ];
  if (back) o.push(slam(L.out(fr(back[0])), L.T, '0 / 3', 0.27, 140, { bar: false, fill: '#bff4ff' }));
  return { n: 39, L, music: { file: 'audio/music/arena-neon.mp3', at: 0, from: 27.0, gain: 0.7, fadeIn: 0.1, fadeOut: 0.8 }, overlays: o.concat(endCard(L.T)) };
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
