'use strict';
// Act 1, the gate. The rift opens on the Creator's domain (a world half made). Kael steps through, empty-handed.
// High on the right, the Creator comes down stairs that build themselves under its feet, each step made as it is
// needed and unmade behind it. It reaches the floor. Kael's katana crystallizes (canon: the pattern answers a
// threat before he does). The Creator lifts its hand, and orange cracks run along the floor toward him.
module.exports = {
  arena: 'creator', frames: 900, endC: 12.8,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const cyan = '#00d4ff', violet = '#cc00ee', pale = '#e8d4ff';
    CR.stage(1);
    const GX = 110, KX = 330, SX = 600;
    // Kael's walk out of the gate: alternating steps.
    const kBeats = [[0, 'stand']];
    for (let t = 1.5, i = 0; t < 4.6; t += 0.34, i++) kBeats.push([t, i % 2 ? 'walkB' : 'walkA', 'io']);
    kBeats.push([4.75, 'stand', 'io'], [5.0, 'stand', 'io', { headTilt: -16 }], [8.6, 'stand', 'io', { headTilt: -16 }],
      [9.0, 'stand', 'io', { headTilt: -2 }], [9.3, 'readyOpen', 'io'], [9.9, 'ready', 'out'], [12.8, 'ready']);
    // The Creator's stairs: eight steps from high on the right down to the floor.
    const STEPS = [], N = 8, T0 = 5.2, DT = 0.42, X0 = 790, H0 = 232;
    for (let i = 0; i <= N; i++) STEPS.push({ t: T0 + i * DT, x: X0 - (X0 - SX) * i / N, h: H0 * (1 - i / N) });
    const sPos = [[0, X0, H0]], sBeats = [[0, 'crStand']];
    STEPS.forEach((st, i) => { if (i) { sPos.push([st.t - DT * 0.15, st.x, st.h, 'io']); sBeats.push([st.t - DT * 0.5, i % 2 ? 'crStepA' : 'crStepB', 'io']); } });
    sPos.push([12.8, SX, 0]);
    sBeats.push([STEPS[N].t + 0.1, 'crStand', 'io'], [10.3, 'crStand'], [10.7, 'crRaise', 'io'], [12.8, 'crRaise', 'lin', { headTilt: -6 }]);
    const WARN0 = 11.0;
    L.setup(H, {
      tempo: 1, vignette: 0.55,
      fade: [[0, 1], [1.0, 0, 'sine']],
      backdrop: (c, L) => {
        const cc = L.D.c;
        CR.gate(c, GX, cc < 0.5 ? 0 : cc < 1.3 ? (cc - 0.5) / 0.8 : cc < 4.0 ? 1 : Math.max(0, 1 - (cc - 4.0) / 0.8), cc);
        // Each step exists from just before the foot lands until a moment after it leaves.
        STEPS.forEach((st, i) => {
          if (i === N) return;
          const born = st.t - DT * 0.7 - (i === 0 ? 10 : 0), die = st.t + DT * 1.3;
          if (cc < born || cc > die + 0.4) return;
          const kin = Math.min(1, (cc - born) / 0.12), kout = cc > die ? 1 - (cc - die) / 0.4 : 1;
          CR.slab(c, st.x, 44 * kin, 7, { y: G - st.h + 7, a: kout, glint: kin < 1 ? 1 - kin : 0 });
        });
        // The cracks running toward Kael: one every 0.14 s from the Creator's feet.
        for (let i = 0; i < 9; i++) {
          const t = WARN0 + i * 0.14; if (cc < t) continue;
          CR.warn(c, SX - 40 - i * 28, Math.min(1, (cc - t) / 0.5));
        }
      },
      actors: {
        k: {
          beats: kBeats,
          pos: [[0, GX, 0], [1.5, GX + 10, 0], [4.6, KX, 0, 'lin'], [12.8, KX, 0]],
          face: [[0, 1]], hidden: [[0, true], [1.35, false]],
          alphaK: [[0, 0], [1.35, 0], [1.75, 1]],
          weapon: [[0, false], [9.3, true]],
          wAlphaK: [[0, 0], [9.3, 0], [9.75, 0.15], [9.95, 1, 'in']],
          aura: [[0, 0], [9.3, 0], [9.6, 0.3], [10.2, 0.12]],
          expr: [[0, 'neutral'], [11.2, 'intense']],
        },
        s: CR.actor({
          beats: sBeats, pos: sPos, face: [[0, -1]], weapon: [[0, false]],
          aura: [[0, 0.1], [10.6, 0.1], [11.0, 0.35]],
        }),
      },
      cam: [
        [0, 380, 140, 1.25], [1.3, 370, 132, 1.32, 'sine'],
        [1.31, GX + 70, 80, 2.3, 'hold'], [4.7, KX - 10, 82, 2.2, 'lin'], [5.1, KX - 10, 86, 2.25, 'sine'],
        [5.11, X0 - 50, H0 + 20, 1.95, 'hold'], [8.7, SX + 30, 80, 2.2, 'sine'],
        [8.71, 470, 86, 1.75, 'hold'], [9.2, 465, 86, 1.8, 'sine'],
        [9.21, KX + 16, 58, 3.4, 'hold'], [10.2, KX + 18, 58, 3.6, 'sine'],
        [10.21, SX - 6, 92, 3.0, 'hold'], [10.95, SX - 8, 100, 3.2, 'sine'],
        [10.96, 465, 70, 1.8, 'hold'], [12.8, 455, 64, 1.95, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingLow', 0.5, 0.8); }],
        [0.5, L => { L.sfx('portalOpen', 0.7, 0.8); }],
        [1.4, L => { L.sfx('land', 0.4, 0.9); L.dust(GX + 10, 10, 50, { v: 1.4, life: 30, a: 0.3 }); }],
        ...STEPS.slice(1).map((st, i) => [st.t - DT * 0.15, L => {
          L.sfx('land', 0.35, 1.2 - i * 0.02); L.sfx('hitZap', 0.15, 1.6);
          L.ring(st.x, G - st.h, 30, { sq: 0.22, col: pale, w: 2, life: 16 });
        }]),
        [STEPS[N].t, L => { L.sfx('landHard', 0.6, 0.9); L.shake(5); L.ring(SX, G, 90, { sq: 0.18, col: violet, w: 5, life: 26 }); L.dust(SX, 14, 80, { v: 2, life: 36, col: '#5a3a7a' }); }],
        [9.3, L => { L.manifest('k', cyan, 0.75); L.sfx('phaseUp', 0.55, 0.9); L.sfx('stingRise', 0.35, 1.2); }],
        [9.92, L => { L.sfx('iaiMark', 0.5, 1.3); const h = L.joints('k').rHand; L.ring(h.x, h.y, 30, { col: cyan, w: 3, life: 16 }); }],
        [10.7, L => { L.sfx('stingLow', 0.6, 0.7); L.sfx('soulAbsorb', 0.3, 0.6); }],
        [WARN0, L => { L.sfx('hitSnap', 0.4, 0.6); L.shake(2); }],
        [WARN0 + 0.6, L => { L.sfx('hitSnap', 0.45, 0.7); L.shake(3); }],
      ],
    });
  },
  tick: function (H) { FILM.tick(H); },
};
