'use strict';
// Act 1, opening. The rooftop in the rain. Sovereign waits, back turned, his blade sunk in the roof. Kael drops in
// empty-handed (canon: a bearer carries nothing; the weapon is recalled when the pattern reads a threat). Sovereign
// turns, and Kael's katana crystallizes out of fragment-light. Sovereign recognises him (canon: a candidate set
// collapsing to one), sees the stance before Kael takes it, and pulls his blade out of the roof. Both surge.
module.exports = {
  arena: 'city', frames: 900, endC: 15.0,
  install: function (H) {
    const L = FILM, G = H.D.G;
    const KX = 330, SX = 560;
    const red = '#ff3311', cyan = '#00d4ff';
    L.setup(H, {
      tempo: 0.92,
      fade: [[0, 1], [1.6, 0, 'sine']],
      actors: {
        k: {
          scale: 1,
          beats: [[0, 'tuck'], [5.15, 'tuck'], [5.17, 'crouchLand', 'xout'], [6.4, 'crouchLand'], [7.3, 'readyOpen', 'io'],
            [8.5, 'readyOpen'], [9.0, 'ready', 'out'],
            [11.9, 'ready'], [12.3, 'iaido', 'xout'], [15.0, 'iaido', 'io', { headTilt: 2 }]],
          pos: [[0, KX, 520], [4.8, KX, 520], [5.17, KX, 0, 'in'], [15.0, KX, 0]],
          face: [[0, 1]],
          hidden: [[0, true], [4.8, false]],
          weapon: [[0, false], [8.5, true]],
          wAlphaK: [[0, 0], [8.5, 0], [8.95, 0.15], [9.15, 1, 'in']],
          trail: [[4.85, 5.2, 4, 0.025, 0.45]],
          aura: [[0, 0], [8.5, 0], [8.8, 0.3], [9.4, 0.12], [12.9, 0.12], [13.3, 0.6], [15.0, 0.45]],
          glowK: [[0, 0], [12.9, 0], [13.3, 0.5], [15, 0.3]],
          expr: [[0, 'neutral'], [12.3, 'intense']],
        },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: [[0, 'sovPlant'], [7.6, 'sovPlant'], [7.78, 'sovPlantLook', 'io'], [8.2, 'sovPlant', 'io'],
            [12.6, 'sovPlant'], [12.72, 'sovRaise', 'xout'], [13.05, 'sovRaise'], [13.6, 'sovReady', 'io'], [15.0, 'sovReady']],
          pos: [[0, SX, 0]],
          face: [[0, 1], [7.86, -1]],
          sink: [[0, true], [12.72, false]],
          // Held perfectly still while the blade is in the roof: no breath through the arms.
          breath: [[0, 0], [12.7, 0], [13.6, 1]],
          aura: [[0, 0], [12.7, 0], [13.1, 0.55], [14.2, 0.3]],
          auraColor: red,
        },
      },
      cam: [
        [0, 470, 150, 1.05], [4.49, 535, 95, 1.55, 'sine'],
        [4.5, KX + 10, 70, 2.5, 'hold'], [5.15, KX + 10, 70, 2.5], [5.45, KX + 10, 60, 2.8, 'xout'], [7.29, KX + 14, 64, 2.65, 'sine'],
        [7.3, SX - 10, 90, 4.4, 'hold'], [8.39, SX - 14, 90, 4.6, 'sine'],
        // Kael's hand filling: close, low.
        [8.4, KX + 18, 52, 3.6, 'hold'], [9.35, KX + 22, 54, 3.8, 'sine'],
        // The recognition: two-shot.
        [9.36, 445, 70, 2.0, 'hold'], [11.8, 445, 70, 2.15, 'sine'], [12.3, 430, 66, 2.35, 'xout'],
        [12.62, 430, 66, 2.35], [12.8, 470, 70, 2.15, 'xout'], [15.0, 445, 64, 2.5, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingLow', 0.6, 0.8); }],
        [4.85, L => { L.sfx('swing', 0.5, 0.7); }],
        [5.17, L => {
          L.shake(16); L.sfx('landHard', 1.1); L.sfx('heavyHit', 0.8, 0.8);
          L.dust(KX, 16, 120, { v: 3.2, life: 50 });
          L.ring(KX, G, 120, { sq: 0.18, col: cyan, w: 8, life: 26 });
          L.crack(KX, 70, { col: cyan, life: 80 });
          L.debris(KX, G - 4, 14, { v: 5, spread: 140, col: '#7d7a88', r: 3 });
          L.streaks(KX, G - 8, 9, 36, { col: '#9fc4d8', dir: -90, spread: 150, life: 10, w: 2 });
        }],
        [7.9, L => { L.sfx('swingLight', 0.4, 0.8); }],
        [8.05, L => {
          // The eye catches.
          L.sfx('hitZap', 0.45, 0.7); L.sfx('stingLow', 0.5);
          L.add({ t: 'draw', life: 40, fn: (c, k) => {
            const J = L.joints('s'), x = J.head.x - J.headR * 0.42, y = J.head.y - J.headR * 0.12;
            const r = J.headR * (0.4 + Math.sin(Math.min(1, k * 3) * Math.PI) * 1.6);
            c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - k; c.fillStyle = '#ffd0c0'; c.shadowColor = red; c.shadowBlur = 20;
            c.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? r * 0.16 : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(an) * rr, y + Math.sin(an) * rr); } c.closePath(); c.fill();
          } });
        }],
        // The pattern answers the threat before he does: the blade crystallizes in his hand.
        [8.5, L => { L.manifest('k', cyan, 0.75); L.sfx('phaseUp', 0.55, 0.9); L.sfx('stingRise', 0.35, 1.2); }],
        [9.12, L => { L.sfx('iaiMark', 0.5, 1.3); const h = L.joints('k').rHand; L.ring(h.x, h.y, 30, { col: cyan, w: 3, life: 16 }); }],
        // Recognition: every opponent he has ever filed, narrowing to this one.
        [9.45, L => { L.catalogue('k', 1.7); L.sfx('soulAbsorb', 0.35, 1.4); }],
        [12.3, L => { L.sfx('iaiMark', 0.8, 0.9); L.shake(4); L.dust(KX, 6, 50, { v: 1.4, life: 30, a: 0.35 }); }],
        [12.72, L => {
          // He pulls the blade out of the roof. Both surge.
          L.sfx('swingHeavy', 0.9, 0.8); L.sfx('clang', 0.6, 0.6); L.shake(12);
          L.crack(SX, 60, { col: red, life: 140 });
          L.debris(SX, G - 2, 18, { v: 6, spread: 70, col: '#7d7a88', r: 3 });
          L.debris(SX, G - 2, 16, { v: 8, spread: 50, col: '#ff6a40', kind: 'spark', r: 3, life: 26, g: 0.2 });
          L.surge('s', red, 1.1);
        }],
        [13.25, L => { L.surge('k', cyan, 1.0); L.sfx('superActivate', 0.5, 0.8); L.shake(10); }],
      ],
      each: (L, c) => {
        // The slit in the roof where the blade stands, glowing faintly.
        if (c < 12.72 && L.D.f % 20 === 0) L.debris(SX, G - 1, 1, { v: 0.6, col: '#ff5533', kind: 'spark', r: 1.6, life: 18, g: 0.03, dir: -90, spread: 50 });
        if (c > 13.3 && Math.random() < 0.25) { const t = L.tip('s'); L.debris(t.x, t.y, 1, { v: 0.8, col: '#ff5533', kind: 'spark', r: 2, life: 20, g: 0.05, dir: -90, spread: 60 }); }
      },
    });
    // The read: Kael in his draw stance, a beat before he takes it.
    L.ghost('k', 11.0, 12.1, 1.2, { dx: 8 });
  },
  tick: function (H) { FILM.tick(H); },
};
