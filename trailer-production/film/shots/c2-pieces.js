'use strict';
// Act 2, the pieces. The Creator's blade comes down on Kael where he kneels. His hand comes up and the katana's
// pieces fly off the floor into it, fitting back together along the blade, and the cut stops on it. He pushes the
// Creator off. The Creator opens its other hand and pours its unmaking onto the blade (the same light that erased
// its stairs): the blade flickers, and holds, light showing through the cracks (canon: the fragment is undefined in
// its domain; nothing there can delete it). The halo stutters. Kael looks at the blade, then walks at the Creator.
module.exports = {
  arena: 'creator', frames: 900, endC: 9.6,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const cyan = '#00d4ff', violet = '#cc00ee', pale = '#e8d4ff';
    CR.stage(1);
    // Where Act 1's break threw them in the final render (measured: 34 pieces, x 162..489).
    CR.layShards(162, 489, 34);
    const crackK = [[0, 0], [0.62, 1.2], [1.6, 0.6], [3.4, 0.6], [4.0, 1.4], [5.4, 1.4], [5.6, 1.8], [6.2, 0.8], [7.0, 1.0], [9.6, 0.7]];
    const washK = [[0, 0], [3.3, 0], [3.6, 1], [5.3, 1], [5.45, 0, 'in']];
    const lookBlade = { from: 'ready', rArm: 50, rFore: -42, headTilt: 16 };
    L.setup(H, {
      tempo: 1, vignette: 0.55,
      fade: [[0, 1], [0.25, 0]],
      speed: [[0, 1], [0.42, 1], [0.5, 0.25, 'xout'], [1.4, 0.25], [1.6, 1, 'in']],
      backdrop: (c, L) => { CR.drawShards(c); },
      actors: {
        k: {
          beats: [[0, 'lookHand', 'io', { headTilt: -10, rArm: 80, rFore: 60 }], [0.3, 'kneelBlock', 'xout'], [1.9, 'kneelBlock'],
            [2.5, 'blockHigh', 'io', { rFore: -64 }], [2.9, 'guard', 'io'], [5.6, 'guard'], [6.0, 'guard', 'io', { headTilt: -6 }],
            [6.6, lookBlade, 'io'], [7.6, lookBlade], [7.95, 'walkLowA', 'io'], [8.3, 'walkLowB', 'io'], [8.65, 'walkLowA', 'io'], [9.0, 'walkLowB', 'io'], [9.35, 'ready', 'io'], [9.6, 'ready']],
          pos: [[0, 240, 0], [7.9, 240, 0], [9.35, 296, 0, 'lin'], [9.6, 298, 0]],
          face: [[0, 1]],
          wAlphaK: [[0, 0], [0.55, 0], [0.62, 1, 'in']],
          post: (c, L) => CR.bladeCracks(c, 'k', L.curve(crackK, L.D.c)[0]),
          aura: [[0, 0], [0.6, 0.35], [1.6, 0.12], [3.4, 0.12], [4.0, 0.4], [5.6, 0.6], [6.4, 0.2]],
          expr: [[0, 'neutral'], [0.3, 'intense'], [6.4, 'neutral'], [7.6, 'intense']],
        },
        s: CR.actor({
          beats: [[0, 'crHigh'], [0.42, 'crHigh', 'lin', { torso: -12 }], [0.62, 'crCutStop', 'xout'], [1.9, 'crCutStop'],
            [2.5, 'crCutStop', 'io', { rArm: -30, rFore: -26 }], [2.9, 'crLow', 'io'], [3.3, 'crUnmake', 'io'], [5.5, 'crUnmake'], [5.9, 'crLow', 'io'], [9.6, 'crLow']],
          pos: [[0, 376, 0], [2.55, 376, 0], [2.95, 424, 0, 'out'], [9.6, 424, 0]],
          face: [[0, -1]], weapon: [[0, true]], arcColor: pale,
          post: (c, L) => CR.drawBlade(c, 's', 1),
          aura: [[0, 0.2], [3.3, 0.2], [3.6, 0.45], [5.5, 0.45], [5.8, 0.15]],
        }),
      },
      cam: [
        [0, 305, 72, 2.4], [0.5, 305, 72, 2.5, 'sine'],
        [0.62, 300, 82, 3.2, 'hold'], [1.9, 300, 84, 3.5, 'sine'],
        [1.91, 325, 84, 2.2, 'hold'], [3.2, 330, 84, 2.1, 'sine'],
        [3.21, 335, 80, 2.4, 'hold'], [5.4, 330, 80, 2.7, 'sine'],
        [5.55, 424, 102, 3.6, 'hold'], [7.0, 424, 104, 3.9, 'sine'],
        [7.01, 250, 62, 3.4, 'hold'], [7.9, 252, 62, 3.6, 'sine'],
        [7.91, 340, 80, 1.9, 'hold'], [9.6, 352, 80, 2.0, 'sine'],
      ],
      ev: [
        [0.25, L => { L.sfx('swingHeavy', 0.8, 0.7); }],
        [0.3, L => { CR.recall('k', 0.3, 0.32); L.sfx('soulAbsorb', 0.5, 1.3); L.sfx('phaseUp', 0.5, 1.1); }],
        [0.62, L => {
          CR.logContact('catch'); const X = CR.contact('k', 's');
          L.sfx('clang', 1.2, 0.75); L.sfx('stingImpact', 0.8, 0.9); L.shake(14); L.impact(3, { tint: '#bfefff' });
          L.ring(X.x, X.y, 70, { col: cyan, w: 6, life: 24 }); L.streaks(X.x, X.y, 18, 60, { col: '#bff4ff', life: 16 });
          L.debris(X.x, X.y, 16, { v: 4, kind: 'spark', col: cyan, r: 2.2, life: 30, g: 0.05, spread: 360 });
          L.debris(X.x, X.y, 12, { v: 4, kind: 'spark', col: violet, r: 2.2, life: 30, g: 0.05, spread: 360 });
        }],
        [2.45, L => { L.sfx('swingHeavy', 0.7, 0.9); L.sfx('heavyHit', 0.6, 0.9); L.shake(6); L.dust(240, 10, 60, { v: 2, life: 30, a: 0.35 }); }],
        [3.3, L => { L.sfx('stingLow', 0.6, 0.7); L.sfx('portalOpen', 0.4, 1.4); }],
        [4.0, L => { L.sfx('hitZap', 0.4, 0.6); }],
        [4.7, L => { L.sfx('hitZap', 0.4, 0.55); L.shake(3); }],
        [5.45, L => {
          const t = L.tip('k'), m = { x: (t.hand.x + t.x) / 2, y: (t.hand.y + t.y) / 2 };
          L.sfx('hitSnap', 0.9, 0.6); L.sfx('superActivate', 0.5, 1.1); L.shake(10);
          L.ring(m.x, m.y, 60, { col: cyan, w: 5, life: 22 }); L.debris(m.x, m.y, 20, { v: 5, kind: 'spark', col: '#d8b8ff', r: 2.2, life: 26, g: 0.08, dir: 0, spread: 120 });
        }],
        [5.6, L => { L.sfx('hitZap', 0.5, 0.5); L.sfx('stingLow', 0.4, 1.2); }],
        [7.95, L => { L.sfx('land', 0.25, 1.1); }], [8.65, L => { L.sfx('land', 0.25, 1.1); }],
      ],
      each: (L, c) => { CR.haloJit = L.curve([[0, 0], [5.5, 0], [5.6, 1], [6.3, 0.5], [7.0, 0]], c)[0]; },
    });
    // The unmaking, drawn over the bodies: from the Creator's open hand onto the middle of Kael's blade.
    L.add({ t: 'draw', life: 1e6, fn: (c) => {
      const k = L.curve(washK, L.D.c)[0]; if (k <= 0.01) return;
      const from = L.joints('s').lHand, t = L.tip('k'), to = { x: (t.hand.x + t.x) / 2, y: (t.hand.y + t.y) / 2 };
      CR.wash(c, from, to, k, L.D.c);
      // The blade flickering violet under it, and holding.
      if (Math.random() < 0.5) CR.bladeCracks(c, 'k', 2.2 * k, 'sepia(1) hue-rotate(230deg) saturate(5) brightness(1.2)', violet);
    } });
  },
  tick: function (H) { FILM.tick(H); },
};
