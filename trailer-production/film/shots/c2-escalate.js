'use strict';
// Act 2, escalation. The Creator does not give ground twice. Its halo turns magenta and breaks loose (its third
// phase in the game) and the cracks through its world blaze. It rises off the floor with its arms spread; violet
// floods back across the ground and pushes the cyan veins in. Overhead, the half-made world finishes itself: plates
// of land fly in from outside and lock into a vault over the arena. Kael, small on the floor, looks up at it, lifts
// the blade, and his eyes light.
module.exports = {
  arena: 'creator', frames: 800, endC: 10.5,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const cyan = '#00d4ff', magenta = '#ff40c0', pale = '#e8d4ff';
    CR.stage(1);
    CR.vein(540, -10, 320, 380);
    const KX = 690, SX = 816;
    const vaultK = [[0, 0], [3.6, 0], [7.4, 1, 'lin'], [10.5, 1]];
    const recedeK = [[0, 0], [1.2, 0], [3.4, 0.5, 'out'], [10.5, 0.5]];
    L.setup(H, {
      tempo: 1, vignette: 0.58,
      backdrop: (c, L) => {
        const cc = L.D.c;
        CR.vault(c, L.curve(vaultK, cc)[0], 0);
        CR.drawVeins(c, L.curve(recedeK, cc)[0]);
      },
      actors: {
        k: {
          beats: [[0, 'ready'], [1.6, 'ready', 'io', { headTilt: -14 }], [7.4, 'ready', 'io', { headTilt: -22 }], [8.4, 'guard', 'io', { headTilt: -14 }], [10.5, 'guard', 'lin', { headTilt: -16 }]],
          pos: [[0, KX, 0]], face: [[0, 1]],
          post: (c, L) => CR.bladeCracks(c, 'k', L.D.c > 8.4 ? 1.5 : 0.8),
          aura: [[0, 0.2], [8.3, 0.2], [8.6, 0.8], [10.5, 0.6]],
          glowK: [[0, 0], [8.3, 0], [8.7, 0.5], [10.5, 0.35]],
          eyes: [[0, 0], [9.2, 0], [9.6, 1]],
          expr: [[0, 'intense']],
        },
        s: CR.actor({
          beats: [[0, 'crLow'], [1.0, 'crLow', 'io', { headTilt: -10 }], [1.4, 'crSpread', 'io'], [10.5, 'crSpread', 'lin', { headTilt: -18 }]],
          pos: [[0, SX, 0], [1.4, SX, 0], [3.5, SX, 110, 'io'], [10.5, SX, 122]],
          face: [[0, -1]], weapon: [[0, true]], arcColor: pale, auraColor: magenta,
          post: (c, L) => CR.drawBlade(c, 's', 1),
          aura: [[0, 0.2], [1.0, 0.2], [1.2, 0.9], [3.5, 0.55]],
          glowK: [[0, 0], [1.0, 0], [1.2, 0.7], [3.0, 0.3]],
        }),
      },
      cam: [
        [0, SX, 102, 3.4], [1.0, SX, 104, 3.6, 'sine'], [1.08, SX, 110, 2.9, 'xout'], [1.6, SX - 10, 128, 2.6, 'sine'],
        [1.61, 760, 140, 1.6, 'hold'], [3.5, 768, 172, 1.5, 'sine'],
        [3.51, 450, 232, 0.95, 'hold'], [7.4, 450, 222, 1.0, 'sine'],
        [7.41, KX, 62, 2.8, 'hold'], [9.2, KX + 2, 64, 3.0, 'sine'],
        [9.21, KX + 6, 76, 5.0, 'hold'], [10.5, KX + 6, 77, 5.4, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingLow', 0.5, 0.6); }],
        [0.6, L => { CR.haloJit = 1; L.sfx('hitZap', 0.4, 0.5); }],
        [0.9, L => { CR.haloJit = 0; }],
        [1.0, L => {
          CR.phase = 3; L.sfx('superActivate', 0.9, 0.6); L.sfx('explosion', 0.5, 0.6); L.sfx('stingImpact', 0.7, 0.7); L.shake(14);
          L.flash(magenta, 0.3, 16); L.surge('s', magenta, 1.2); const J = L.joints('s'); L.ring(J.head.x, J.head.y, 90, { col: magenta, w: 6, life: 26 });
        }],
        [1.4, L => { L.sfx('portalOpen', 0.6, 0.6); }],
        [1.5, L => { L.ring(SX, G, 420, { sq: 0.12, col: '#c060ff', w: 8, life: 70 }); L.sfx('heavyHit', 0.6, 0.5); L.shake(6); }],
        [3.6, L => { L.sfx('stingRise', 0.6, 0.6); }],
        [5.0, L => { L.sfx('hitBlunt', 0.5, 0.5); L.shake(4); }], [6.3, L => { L.sfx('hitBlunt', 0.6, 0.45); L.shake(5); }], [7.3, L => { L.sfx('heavyHit', 0.8, 0.45); L.shake(8); }],
        [8.4, L => { L.sfx('phaseUp', 0.6, 0.8); L.surge('k', cyan, 0.8); }],
        [9.25, L => { L.sfx('iaiMark', 0.8, 0.8); L.sfx('stingImpact', 0.6, 1.1); }],
      ],
      each: (L, c) => {
        // Debris lifting off the floor toward the vault while it is laid.
        if (c > 3.6 && c < 7.6 && Math.random() < 0.5) L.parts.push({ c: L.D.c, x: 40 + Math.random() * 820, y: G - 2, vx: (Math.random() - 0.5) * 0.4, vy: -1.5 - Math.random() * 2,
          g: -0.01, life: 80, r: 2 + Math.random() * 3, col: '#5a2a8a', kind: 'rock', spin: Math.random() * 6, floor: G + 10 });
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
