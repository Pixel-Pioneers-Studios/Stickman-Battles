'use strict';

// Two channel-ready Shorts built from existing, verified game footage.
// Run from trailer-production/:
//   node selected-shorts.js

const { render } = require('./lib/engine');

const slam = (from, to, text, y, size, extra) => Object.assign({
  type: 'slam', from, to, text, y, size, bar: false,
}, extra || {});

const endCard = (from, to) => [
  { type: 'scrim', from, to, a: 0.84, fade: 8 },
  {
    type: 'logo', from, to, y: 0.34, size: 124,
    lines: ['STICKMAN', 'EVOLUTION'],
    cta: 'PLAY FREE IN YOUR BROWSER', ctaSize: 56, ctaAt: 16,
    url: 'https://wronglysod.itch.io/stickman-evolution',
  },
  { type: 'fade', from: to - 12, to, out: true },
];

function arenaBetrayed() {
  // Native vertical hzCyber: the victim is reduced to 10 HP, then killed by
  // the environment at source frame 172. No wide-footage crop is needed.
  const body = 192;
  const card = 96;
  const total = body + card;
  const overlays = [
    { type: 'vignette', a: 0.28 },
    slam(0, 58, ['ONE HIT', 'LEFT.'], 0.14, 112, { fill: '#ffffff' }),
    slam(58, 108, ['THEN THE', 'ARENA MOVED.'], 0.14, 92, { fill: '#7ff3ff' }),
    slam(112, 176, ['THE ARENA', 'BETRAYED HIM.'], 0.14, 82, { fill: '#ffbd5a' }),
    ...endCard(body, total),
  ];
  return render({
    W: 1080, H: 1920, name: 'short-arena-betrayed-1080x1920', profile: 'audit',
    segs: [{ shot: 'hzCyber', profile: 'vert', at: 76, len: body } , { len: card }],
    overlays,
    music: { file: 'audio/music/arena-neon.mp3', from: 24, at: 0, end: total / 60, gain: 0.72, fadeIn: 0.12, fadeOut: 0.8 },
    stingers: [{ k: 'stingLow', at: 0, g: 0.8 }, { k: 'stingImpact', at: 160, g: 1.2 }],
  });
}

function impossibleDodge() {
  // A different clip from the published pit/Shadow Step Short: Cyberpunk
  // footage where the scythe swing passes under the airborne fighter.
  const body = 210;
  const card = 96;
  const total = body + card;
  const overlays = [
    { type: 'vignette', a: 0.22 },
    slam(0, 48, ['THE SCYTHE', 'WAS ALREADY SWINGING.'], 0.13, 74),
    slam(52, 112, ['HE JUMPED', 'THROUGH THE HIT.'], 0.13, 92, { fill: '#7ff3ff' }),
    slam(116, 176, ['THAT SHOULD', 'NOT HAVE WORKED.'], 0.13, 82, { fill: '#ffffff' }),
    slam(178, 204, 'ONE-FRAME DODGE', 0.72, 58, { fill: '#c9b8ff' }),
    ...endCard(body, total),
  ];
  return render({
    W: 1080, H: 1920, name: 'short-impossible-dodge-1080x1920', profile: 'audit',
    segs: [{ shot: 'duel2', profile: 'vert', at: 0, len: body }, { len: card }],
    overlays,
    music: { file: 'audio/music/boss-threshold.mp3', from: 32, at: 0, end: total / 60, gain: 0.68, fadeIn: 0.12, fadeOut: 0.8 },
    stingers: [{ k: 'stingLow', at: 0, g: 0.8 }, { k: 'jump', at: 112, g: 0.9 }, { k: 'stingImpact', at: 176, g: 1.1 }],
  });
}

(async () => {
  const results = [];
  results.push(await arenaBetrayed());
  results.push(await impossibleDodge());
  for (const r of results) console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
})().catch(err => { console.error(err); process.exit(1); });
