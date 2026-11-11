'use strict';
// Act 2, the holes. The Axiom lifts away and spreads his hands, and the air between them fills with collapses, five
// black holes at once. They are ragged now. Kael runs straight in: each one he passes close to loses its shape and
// pops in his interference. The last he uses the way he used the first (Act 1), half round it and out over the top,
// straight at him: the cut takes him across the shoulder and throws him back through the air, and the rest of the
// holes go out. All of the crust below his neck is gone; behind his stars, the kept.
module.exports = {
  arena: 'void', frames: 560, endC: 8,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff';
    CA.stage();
    const RUN = 1.5, JUMP = 2.45, ORB0 = 2.6, ORB1 = 3.15, HIT = 3.45, OX = 650, OY = 150, OR = 50;
    // [x, height, born, popped]: the slingshot hole (index 1) goes out with the others after the hit.
    const holes = [[592, 56, 1.0, 2.05], [OX, OY, 1.15, HIT + 0.3], [712, 36, 1.3, HIT + 0.35], [560, 200, 1.42, HIT + 0.4], [742, 240, 1.55, HIT + 0.45]];
    const crustK = [[0, 0.24], [HIT + 0.05, 0.24], [HIT + 0.07, 0.2, 'lin']];
    const keptK = [[0, 0.5], [HIT + 0.05, 0.5], [HIT + 0.1, 1, 'lin'], [8, 0.9]];
    const noiseK = [[0, 0.4], [RUN, 0.6], [2.0, 1, 'out'], [HIT + 0.5, 0.8], [8, 0.5]];
    const chest = (L) => { const J = L.joints('k'); return { x: (J.shoulder.x + J.hip.x) / 2, y: (J.shoulder.y + J.hip.y) / 2 }; };
    const orbit = c => { const u = Math.max(0, Math.min(1, (c - ORB0) / (ORB1 - ORB0))), an = Math.PI / 2 + Math.PI * L.EASE.io(u); return { x: OX + Math.cos(an) * OR, y: G - OY + Math.sin(an) * OR }; };
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true,
      speed: [[0, 1], [HIT, 1], [HIT + 0.04, 0.25], [HIT + 0.5, 0.25], [HIT + 0.9, 1]],
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.75 });
        CA.floor(c);
        holes.forEach(([x, h, b, p], i) => {
          const k = t < b ? 0 : t < p ? Math.min(1, (t - b) / 0.15) : Math.max(0, 1 - (t - p) / 0.08);
          const jam = 0.45 + Math.max(0, Math.min(0.55, (t - (p - 0.4)) / 0.4 * 0.55));
          CA.hole(c, x, G - h, i === 1 ? 18 : 13, k, t + i, { jam });
        });
      },
      actors: {
        k: {
          beats: [[0, 'guard'], [RUN - 0.3, 'guard', 'io', { headTilt: -20 }], [RUN, 'runA'], [RUN + 0.2, 'runB'], [RUN + 0.4, 'runA'], [RUN + 0.6, 'runB'], [RUN + 0.8, 'runA'],
            [JUMP, 'crouch'], [ORB0, 'airHigh'], [ORB0 + 0.28, 'tuck', 'lin', { rot: -100 }], [ORB1, 'airHigh', 'out'], [HIT - 0.12, 'highGuard'], [HIT, 'cutDown', 'xout'],
            [HIT + 0.5, 'airCut'], [4.6, 'crouchLand', 'out'], [5.4, 'crouchLand'], [6.2, 'guard'], [8, 'guard', 'io', { headTilt: -22 }]],
          pos: [[0, 522, 0], [RUN, 522, 0], [JUMP, 610, 0, 'lin']],
          face: [[0, 1]], trail: [[RUN, HIT + 0.2, 3, 0.03, 0.4]],
          aura: [[0, 0.7], [2.0, 1]], glowK: [[0, 0.6], [HIT, 0.9], [6, 0.6]], eyes: [[0, 1]], expr: [[0, 'intense']],
          post: (c, L) => CA.noise(c, chest(L).x, chest(L).y, L.curve(noiseK, L.D.c)[0], L.D.c),
        },
        s: CA.actor({
          beats: [[0, 'caFloat', 'io', { headTilt: 12 }], [0.6, 'caFloat', 'io', { headTilt: -4 }], [1.0, 'crSpread', 'out'], [HIT, 'crSpread'], [HIT + 0.2, 'caRecoil', 'xout', { torso: -30 }], [5.2, 'caRecoil', 'io', { torso: -10 }], [6.4, 'caFloat', 'io', { headTilt: 10 }], [8, 'caFloat', 'io', { headTilt: 12 }]],
          pos: [[0, 690, 60], [1.0, 760, 88, 'out'], [HIT, 760, 88], [HIT + 0.5, 800, 120, 'out'], [5.2, 812, 130, 'out'], [8, 806, 120]],
          face: [[0, -1]], crust: crustK, headCrust: [[0, 1]], kept: keptK, keptFace: [[0, 0]],
          neb: [[0, 1]], aura: [[0, 0.5], [1.0, 0.9], [HIT, 0.4]], eyes: [[0, 1]],
        }),
      },
      cam: [
        [0, 620, 120, 1.7], [1.0, 660, 140, 1.4, 'sine'], [RUN, 640, 130, 1.45, 'sine'],
        [RUN + 0.01, 560, 70, 2.6, 'hold'], [JUMP, 610, 80, 2.4, 'sine'],
        [JUMP + 0.01, 660, 150, 2.0, 'hold'], [ORB1, 690, 170, 2.0, 'sine'],
        [HIT - 0.02, 740, 160, 2.6, 'sine'], [HIT + 0.6, 760, 170, 2.4, 'sine'],
        [HIT + 0.61, 680, 130, 1.5, 'hold'], [6.2, 690, 140, 1.6, 'sine'],
        [6.21, 800, 170, 3.2, 'hold'], [8, 800, 168, 3.5, 'sine'],
      ],
      ev: [
        [1.0, L => { L.sfx('stingLow', 0.8, 0.45); }],
        ...holes.map(([x, h, b], i) => [b, L => { L.sfx('soulAbsorb', 0.5, 0.6 + i * 0.05); L.add({ t: 'ring', x, y: G - h, r0: 70, r1: 4, life: 12, w: 3, sq: 1, col: star }); }]),
        [2.05, L => { L.sfx('hitZap', 0.8, 0.8); L.burst(592, G - 56, 18, star); L.ring(592, G - 56, 40, { col: cyan, w: 3, life: 16 }); }],
        [JUMP, L => { L.sfx('jump', 0.7, 0.8); }],
        [ORB0 + 0.2, L => { L.sfx('swingHeavy', 0.8, 0.6); }],
        [HIT - 0.1, L => { L.sfx('swingHeavy', 1, 0.8); }],
        [HIT + 0.05, L => {
          const J = L.joints('s'), p = { x: (J.shoulder.x + J.rElbow.x) / 2, y: (J.shoulder.y + J.rElbow.y) / 2 };
          L.D.log.hit = Object.assign({ at: [Math.round(p.x), Math.round(p.y)] }, L.onBlade('k', p));
          L.sfx('heavyHit', 1, 0.5); L.sfx('hitSlash', 1, 0.6); L.sfx('explosion', 0.7, 0.5); L.shake(18); L.impact(3, { tint: '#bfe8ff' });
          L.burst(p.x, p.y, 24, star); L.ring(p.x, p.y, 90, { col: cyan, w: 5, life: 22 }); L.slash(p.x, p.y, 60, -150, 30, { col: cyan, life: 16 });
        }],
        [HIT + 0.3, L => { holes.slice(1).forEach(([x, h]) => L.burst(x, G - h, 10, star)); L.sfx('hitZap', 0.8, 0.5); }],
        [4.6, L => { L.sfx('land', 0.7, 0.8); }],
        [6.3, L => { L.sfx('soulHarvest', 0.5, 0.45); }],
      ],
      each: (L, c) => {
        const k = L.actors.k;
        if (c >= ORB0 && c < ORB1) { const o = orbit(c), J = L.joints('k'), st = L.state(k, c); k._o = { x: st.x + o.x - J.hip.x, h: st.h - (o.y - J.hip.y) }; k.pos = [[0, k._o.x, k._o.h]]; }
        else if (c >= ORB1 && k._o && !k._out) { k._out = true; k.pos = [[ORB1, k._o.x, k._o.h], [HIT, 690, 96, 'lin'], ...CA.arc(HIT, 690, 96, 4.6, 690, 0, 108), [8, 690, 0]];
          // Now the flight is known: aim the cut at his shoulder.
          const J = L.joints('s', HIT + 0.05);
          L.D.log.solve = CA.solve('k', k.beats.findIndex(b => b[0] === HIT), { x: (J.shoulder.x + J.rElbow.x) / 2, y: (J.shoulder.y + J.rElbow.y) / 2 }, HIT + 0.05, { range: 110 });
        }
        else if (c >= JUMP && c < ORB0 && !k._o) { const o = orbit(ORB0), st = L.state(k, c), J = L.joints('k'), u = (c - JUMP) / (ORB0 - JUMP); k.pos = [[0, st.x + (o.x - J.hip.x) * u * 0.5, st.h - (o.y - J.hip.y) * u * 0.5]]; }
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
