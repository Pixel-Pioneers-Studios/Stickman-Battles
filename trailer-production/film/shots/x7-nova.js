'use strict';
// Act 2, the supernova. The Axiom rises and opens his arms, and every star in him runs into his chest: a star gathered
// out of himself. It goes. The light fills the whole Void, except the shadow behind Kael, where it comes apart in his
// interference (canon: the attacks still fire, they lose resolution on the one target they cannot address). Kael walks
// into it, step by step, and when it thins he is under him: the leap, the rising cut across his chest. The light
// is gone. The crust on his face cracks with starlight and holds. He drifts down, head bowed.
module.exports = {
  arena: 'void', frames: 760, endC: 11,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff';
    CA.stage();
    const GATHER = 0.9, BLOW = 3.0, WALK = 3.3, LEAP = 5.7, HIT = 6.0;
    const novaK = [[0, 0], [GATHER, 0], [BLOW, 0.5, 'in'], [LEAP + 0.1, 0.999, 'lin'], [LEAP + 0.12, 1, 'lin']];
    const noiseK = [[0, 0.5], [BLOW, 1, 'out'], [LEAP, 1], [HIT + 0.5, 0.5], [11, 0.4]];
    const chest = (L) => { const J = L.joints('k'); return { x: (J.shoulder.x + J.hip.x) / 2, y: (J.shoulder.y + J.hip.y) / 2 }; };
    const core = (L) => { const J = L.joints('s'); return { x: (J.neck.x + J.hip.x) / 2, y: (J.neck.y + J.hip.y) / 2 - 4 }; };
    L.setup(H, {
      tempo: 1, vignette: 0.6, plant: true,
      speed: [[0, 1], [BLOW - 0.05, 1], [BLOW, 0.45], [LEAP - 0.2, 0.45], [LEAP, 1], [HIT - 0.02, 1], [HIT, 0.25], [HIT + 0.6, 0.25], [HIT + 1.0, 1]],
      backdrop: (c, L) => {
        const t = L.D.c, k = L.curve(novaK, t)[0];
        // The Void dims as he draws everything in.
        CA.paintVoid(c, { gy: -60, galaxy: 0.75 * (1 - Math.min(1, Math.max(0, (t - GATHER) / (BLOW - GATHER))) * 0.8) });
        CA.floor(c);
      },
      actors: {
        k: {
          beats: [[0, 'guard'], [GATHER + 0.5, 'guard', 'io', { headTilt: -24 }], [BLOW - 0.2, 'block'], [BLOW, 'block', 'xout', { torso: -16 }],
            [WALK, 'guard', 'io', { torso: 16 }], [WALK + 0.45, 'walkLowA', 'io', { torso: 16 }], [WALK + 0.9, 'walkLowB', 'io', { torso: 16 }], [WALK + 1.35, 'walkLowA', 'io', { torso: 16 }],
            [WALK + 1.8, 'walkLowB', 'io', { torso: 16 }], [LEAP - 0.1, 'crouch'], [LEAP + 0.1, 'airHigh'], [HIT - 0.08, 'windBack', 'io', { rLeg: 40, rShin: 120, lLeg: 20, lShin: 100 }], [HIT, 'upperCut', 'xout'],
            [HIT + 0.7, 'upperCut'], [7.6, 'airCut'], [8.1, 'crouchLand', 'out'], [9.0, 'crouchLand'], [10, 'guard', 'io', { headTilt: -10 }], [11, 'guard', 'io', { headTilt: -6 }]],
          pos: [[0, 690, 0], [WALK, 690, 0], [LEAP - 0.1, 800, 0, 'lin'], ...CA.arc(LEAP - 0.1, 800, 0, HIT, 832, 96, 112), [HIT + 0.7, 836, 106, 'out'], ...CA.arc(HIT + 0.7, 836, 106, 8.1, 716, 0, 112), [11, 716, 0]],
          face: [[0, 1]], trail: [[LEAP, HIT + 0.2, 3, 0.03, 0.4]],
          aura: [[0, 0.7], [BLOW, 1]], glowK: [[0, 0.6], [BLOW, 1], [9, 0.6]], eyes: [[0, 1]], expr: [[0, 'intense']],
          post: (c, L) => CA.noise(c, chest(L).x, chest(L).y, L.curve(noiseK, L.D.c)[0], L.D.c),
        },
        s: CA.actor({
          beats: [[0, 'caFloat', 'io', { headTilt: 12 }], [GATHER, 'crSpread', 'io'], [BLOW, 'crSpread', 'io', { torso: -14, headTilt: -16 }], [HIT, 'crSpread', 'io', { torso: -6 }],
            [HIT + 0.15, 'caRecoil', 'xout', { torso: -34, headTilt: -26 }], [8.2, 'caRecoil', 'io', { torso: -10 }], [9.6, 'kneel', 'io', { torso: 26, headTilt: 34, hipDrop: 6 }], [11, 'kneel', 'io', { torso: 30, headTilt: 38, hipDrop: 6 }]],
          pos: [[0, 806, 120], [BLOW, 880, 110, 'out'], [HIT, 880, 112], [HIT + 0.5, 900, 150, 'out'], [9.6, 880, 62, 'io'], [11, 880, 56]],
          face: [[0, -1]], crust: [[0, 0.2]], headCrust: [[0, 1]], headCrack: [[0, 0], [HIT + 0.05, 0], [HIT + 0.3, 0.85, 'out']],
          kept: [[0, 0.9], [GATHER, 0.9], [BLOW, 0], [HIT + 0.3, 0], [HIT + 1.2, 0.8]], keptFace: [[0, 0]],
          neb: [[0, 1], [GATHER, 1], [BLOW, 0.2], [HIT, 0.2], [HIT + 0.4, 1.2]],
          aura: [[0, 0.5], [GATHER, 1], [BLOW, 0.2], [HIT + 0.2, 0.9], [9.6, 0.4]], eyes: [[0, 1], [HIT + 0.05, 1], [HIT + 0.3, 0.4], [9.6, 0.6]],
          post: (c, L, a, s) => {
            CA.drawBody(c, L, a, s);
            // The stars of his body running into his chest while he gathers.
            const t = L.D.c, u = Math.max(0, Math.min(1, (t - GATHER) / (BLOW - GATHER)));
            if (u > 0 && t < BLOW + 0.1) {
              const J = L.joints('s'), p = core(L), pts = [J.head, J.rHand, J.lHand, J.rFoot, J.lFoot, J.rElbow, J.lElbow, J.rKnee, J.lKnee];
              c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#ffffff'; c.shadowColor = star; c.shadowBlur = 8;
              pts.forEach((q, i) => { for (let j = 0; j < 3; j++) { const v = ((t * 1.4 + j / 3 + i * 0.13) % 1); c.globalAlpha = u * v; c.beginPath(); c.arc(q.x + (p.x - q.x) * v, q.y + (p.y - q.y) * v, 1.4, 0, Math.PI * 2); c.fill(); } });
              c.restore();
            }
          },
        }),
      },
      cam: [
        [0, 760, 150, 1.6], [GATHER, 780, 150, 1.4, 'sine'], [BLOW - 0.4, 790, 150, 1.3, 'sine'],
        // The light: wide on Kael's shadow in it, then into it with him.
        [BLOW, 640, 110, 1.45, 'hold'], [WALK, 650, 106, 1.6, 'sine'],
        [WALK + 0.01, 720, 62, 3.0, 'hold'], [WALK + 1.2, 750, 64, 3.2, 'sine'],
        [WALK + 1.21, 800, 130, 1.6, 'hold'], [LEAP, 820, 130, 1.8, 'sine'],
        [HIT, 850, 150, 2.5, 'sine'], [HIT + 0.7, 860, 160, 2.7, 'sine'],
        // His face, the crust cracked; then wide as he drifts down.
        [HIT + 0.71, 910, 252, 4.4, 'hold'], [7.6, 910, 252, 4.7, 'sine'],
        [7.61, 820, 120, 1.7, 'hold'], [11, 830, 110, 1.9, 'sine'],
      ],
      ev: [
        [GATHER, L => { L.sfx('stingRise', 0.8, 0.4); L.sfx('soulHarvest', 0.6, 0.5); }],
        [BLOW - 0.6, L => { L.sfx('stingRise', 0.8, 0.6); }],
        [BLOW, L => { L.sfx('explosion', 1.2, 0.3); L.sfx('stingImpact', 1, 0.35); L.sfx('superActivate', 0.9, 0.4); L.shake(26); L.flash('#fff1d8', 0.5, 14); }],
        [BLOW + 0.3, L => { L.sfx('shieldUp', 0.9, 0.5); }],
        [WALK + 0.45, L => { L.sfx('land', 0.4, 0.6); }], [WALK + 1.35, L => { L.sfx('land', 0.4, 0.6); }],
        [LEAP, L => { L.sfx('jump', 0.8, 0.7); }], [HIT - 0.1, L => { L.sfx('swingHeavy', 1, 0.7); }],
        [HIT + 0.05, L => {
          const J = L.joints('s'), p = { x: (J.neck.x + J.hip.x) / 2, y: (J.neck.y + J.hip.y) / 2 };
          L.D.log.hit = Object.assign({ at: [Math.round(p.x), Math.round(p.y)] }, L.onBlade('k', p));
          L.sfx('heavyHit', 1, 0.45); L.sfx('hitSlash', 1, 0.5); L.sfx('explosion', 0.8, 0.5); L.shake(20); L.impact(3, { tint: '#bfe8ff' });
          L.burst(p.x, p.y, 30, star); L.ring(p.x, p.y, 120, { col: cyan, w: 6, life: 24 });
        }],
        [HIT + 0.72, L => { L.sfx('hitSnap', 0.8, 0.5); L.sfx('stingLow', 0.7, 0.5); }],
        [9.6, L => { L.sfx('landHard', 0.6, 0.6); L.ring(880, G, 90, { sq: 0.18, col: star, w: 3, life: 30 }); }],
      ],
      each: (L, c) => {
        // The blast is drawn over everything but the lee behind Kael.
        const k = L.curve(novaK, c)[0];
        L._novaK = k;
        if (!L._novaHooked) {
          L._novaHooked = true;
          L.add({ t: 'draw', life: 100000, fn: (cx) => { const p = core(L), q = chest(L); CA.nova(cx, p.x, p.y, L._novaK, L.D.c, { kx: q.x, ky: q.y, spread: 0.42, pocket: 50 }); } });
        }
      },
    });
    const k = L.actors.k, J = L.joints('s', HIT + 0.05);
    L.D.log.solve = CA.solve('k', k.beats.findIndex(b => b[0] === HIT), { x: (J.neck.x + J.hip.x) / 2, y: (J.neck.y + J.hip.y) / 2 }, HIT + 0.05, { range: 110 });
  },
  tick: function (H) { FILM.tick(H); },
};
