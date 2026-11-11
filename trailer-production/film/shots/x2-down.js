'use strict';
// Act 1, "down". Kael goes in first: three cuts, and every one bends off him before it lands (canon: in the First
// Laws "down" is whatever the strongest mass says it is, and near him the strongest mass is him). Kael hops back. The
// Axiom turns his palm and "down" points at him: Kael slides, drives the katana into the floor and hangs off the hilt
// flat out in the air like a flag. He pulls it free and lets the pull throw him, blade first. A hand-width away the
// Axiom presses his palm down and "down" is the floor again: Kael is slammed into it from the air.
module.exports = {
  arena: 'void', frames: 640, endC: 9.4,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff';
    CA.stage();
    const SX = 640, SH = 14, PLANT = 2.95, FREE = 5.3, SLAM = 5.95;
    const pullK = [[0, 0], [2.5, 0], [2.7, 0.7, 'out'], [3.4, 1], [5.95, 1], [5.97, 0, 'lin']];
    // The planted blade turns with the body (see the flag note in each) so it stays pointing into the floor.
    const tiltK = [[0, 0], [PLANT + 0.03, 0], [3.5, 270], [FREE, 270], [FREE + 0.25, 0]];
    let hilt = null;
    const lens = (L) => { const J = L.joints('s'); L.ring((J.neck.x + J.hip.x) / 2, (J.neck.y + J.hip.y) / 2, 64, { col: star, w: 2, life: 14, sq: 1 }); L.sfx('stingLow', 0.5, 1.4); };
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true,
      speed: [[0, 1], [SLAM - 0.02, 1], [SLAM + 0.02, 0.3], [SLAM + 0.5, 0.3], [SLAM + 1.1, 1]],
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.75 });
        CA.floor(c);
        CA.crater(c, 478, 160, 18, L.curve([[0, 0], [SLAM, 0], [SLAM + 0.04, 1, 'out']], t)[0]);
        const J = L.joints('s');
        CA.pull(c, (J.neck.x + J.hip.x) / 2, (J.neck.y + J.hip.y) / 2, L.curve(pullK, t)[0], t);
      },
      actors: {
        k: {
          beats: [[0, 'guard'], [0.15, 'runA'], [0.3, 'runB'], [0.45, 'windBack'],
            // Cut 1: a level cut, dragged up and over him.
            [0.56, 'slashOut', 'xout'], [0.72, 'upperCut', 'out'],
            // Cut 2: down from high, dragged off to the side.
            [0.84, 'highGuard'], [0.95, 'cutDown', 'xout'], [1.08, 'sweepLow', 'out', { torso: 50 }],
            // Cut 3: the thrust, pulled down into the floor.
            [1.18, 'ready'], [1.28, 'thrust', 'xout'], [1.42, 'plant', 'out'],
            [1.6, 'tuck'], [1.9, 'crouchLand', 'out'], [2.3, 'guard'],
            // Pulled toward him: braced, planted, then off the floor and flat out on the hilt.
            [2.55, 'braceBack'], [2.9, 'braceBack', 'io', { torso: -10 }], [PLANT, 'plantHigh', 'xout'],
            [3.5, 'hangUp', 'io', { rot: -90 }], [3.9, 'hangUp2', 'io', { rot: -90 }], [4.3, 'hangUp', 'io', { rot: -90 }], [4.7, 'hangUp2', 'io', { rot: -90 }],
            [FREE, 'hangUp', 'io', { rot: -90, headTilt: -16 }],
            // Free, flipping over, blade first at him.
            [FREE + 0.25, 'dive', 'out', { rot: 90 }], [SLAM, 'dive', 'lin', { rot: 90 }],
            [SLAM + 0.05, 'fallen', 'lin'], [7.6, 'fallen'], [8.6, 'rising', 'io'], [9.4, 'rising', 'io', { headTilt: -20 }]],
          pos: [[0, 330, 0], [0.45, 548, 0, 'out'], [1.42, 560, 0], ...CA.arc(1.42, 560, 0, 1.9, 400, 0, 26),
            [2.5, 400, 0], [2.9, 430, 0, 'in'], [PLANT, 432, 0]],
          face: [[0, 1]], trail: [[0, 0.5, 3, 0.03, 0.4], [FREE, SLAM + 0.05, 4, 0.025, 0.45]], sink: [[0, false], [PLANT, true], [FREE + 0.02, false]],
          aura: [[0, 0.4], [SLAM, 0.15]], glowK: [[0, 0.3]], eyes: [[0, 0], [4.4, 1], [5.2, 1], [5.9, 0]], expr: [[0, 'intense'], [SLAM, 'hurt'], [7.6, 'intense']],
        },
        s: CA.actor({
          beats: [[0, 'caFloat'], [1.95, 'caFloat'], [2.35, 'caPalmUp'], [2.5, 'caPalmTurn', 'xout'], [SLAM - 0.08, 'caPalmTurn'], [SLAM, 'caPalmDown', 'xout'], [9.4, 'caPalmDown', 'io', { headTilt: 16 }]],
          pos: [[0, SX, SH], [9.4, SX, SH + 2]], face: [[0, -1]],
          neb: [[0, 1]], crust: [[0, 0.45]], aura: [[0, 0.4], [2.5, 0.9], [SLAM + 0.5, 0.5]], eyes: [[0, 1]],
        }),
      },
      cam: [
        // The rush and the three cuts.
        [0, 470, 84, 1.9], [0.45, 590, 84, 2.4, 'out'], [1.45, 594, 84, 2.5, 'sine'],
        [1.46, 520, 94, 2.0, 'hold'], [2.3, 520, 94, 2.05, 'sine'],
        // His palm turning.
        [2.31, SX - 4, 134, 4.0, 'hold'], [2.62, SX - 4, 134, 4.2, 'sine'],
        // Kael dragged, planting, flat out.
        [2.63, 470, 70, 2.6, 'hold'], [3.6, 520, 80, 2.2, 'sine'],
        [4.3, 500, 56, 3.8, 'hold'], [5.0, 500, 56, 4.0, 'sine'],
        [5.01, 530, 86, 2.1, 'hold'], [SLAM - 0.01, 540, 86, 2.3, 'out'],
        // The slam: low and close, then up to him standing over it.
        [SLAM, 540, 46, 2.9, 'hold'], [7.4, 540, 50, 2.8, 'sine'],
        [7.41, 570, 92, 2.3, 'hold'], [9.4, 568, 90, 2.45, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('jump', 0.5, 0.9); }],
        [0.47, L => { L.sfx('swingHeavy', 0.8, 1); }], [0.58, L => { lens(L); }],
        [0.86, L => { L.sfx('swingHeavy', 0.8, 1.05); }], [0.97, L => { lens(L); }],
        [1.2, L => { L.sfx('swing', 0.8, 1); }], [1.3, L => { lens(L); }],
        [1.42, L => { const t = L.tip('k'); L.sfx('clang', 0.6, 0.8); L.debris(t.x, G - 2, 8, { kind: 'spark', col: star, v: 4, r: 2, g: 0.2 }); }],
        [1.9, L => { L.sfx('land', 0.6, 0.9); }],
        [2.5, L => { L.sfx('stingImpact', 0.9, 0.45); L.sfx('soulRip', 0.5, 0.5); L.shake(6); const J = L.joints('s'); L.ring(J.rHand.x, J.rHand.y, 110, { col: star, w: 4, life: 26 }); }],
        [2.55, L => { L.dust(415, 6, 30, { col: '#9fb4ff', a: 0.14, r: 4, v: 3 }); }],
        [PLANT, L => {
          const J = L.joints('k'); hilt = { x: J.rHand.x, y: J.rHand.y }; L.D.log.hilt = [Math.round(hilt.x), Math.round(hilt.y)];
          L.sfx('clang', 1, 0.7); L.shake(5); L.debris(hilt.x + 4, G - 2, 12, { kind: 'spark', col: star, v: 5, r: 2, g: 0.2 });
        }],
        [3.3, L => { L.sfx('stingRise', 0.5, 0.5); }],
        [FREE, L => { L.sfx('swingHeavy', 1, 0.7); L.debris(hilt.x, G - 2, 10, { col: '#2a2a3a', v: 4, r: 3 }); }],
        [FREE + 0.3, L => { L.sfx('swingHeavy', 0.9, 0.5); L.lines(22, { dir: 180 }); }],
        [SLAM, L => {
          const J = L.joints('k'), tip = L.tip('k'); L.D.log.dive = { tip: [Math.round(tip.x), Math.round(tip.y)], chest: Math.round(L.joints('s').neck.x) };
          L.sfx('landHard', 1, 0.6); L.sfx('explosion', 1, 0.45); L.sfx('heavyHit', 1, 0.55); L.shake(22); L.impact(3, { tint: '#9fb4ff' });
          L.crack(500, 140, { col: '#9fb4ff', life: 400 }); L.ring(500, G, 220, { sq: 0.16, col: star, w: 6, life: 30 });
          L.debris(500, G - 2, 30, { col: '#1a1a26', v: 7, r: 4 }); L.debris(500, G - 2, 18, { kind: 'spark', col: star, v: 6, r: 2, g: 0.18 });
        }],
        [8.0, L => { L.sfx('stingLow', 0.6, 0.5); }],
      ],
      each: (L, c) => {
        const k = L.actors.k;
        k.wTilt = L.curve(tiltK, c)[0];
        // On the hilt (PLANT .. FREE): the hands stay where the blade went in, whatever the body does round them.
        if (hilt && c >= PLANT && c < FREE) {
          const st = L.state(k, c), J = L.joints('k');
          k.pos = [[0, st.x + hilt.x - J.rHand.x, st.h - (hilt.y - J.rHand.y)]];
          k._last = { x: st.x + hilt.x - J.rHand.x, h: st.h - (hilt.y - J.rHand.y) };
        } else if (c >= FREE && k._last && !k._freed) {
          // Thrown along the pull: from the hilt to a hand-width short of his chest, then down into the floor.
          k._freed = true;
          k.pos = [[FREE, k._last.x, k._last.h], ...CA.arc(FREE, k._last.x, k._last.h, SLAM, 476, 96, 100), [SLAM + 0.05, 500, 0, 'lin'], [9.4, 500, 0]];
        }
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
