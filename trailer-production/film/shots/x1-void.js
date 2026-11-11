'use strict';
// The Void. A rift opens high in a sky of stars and spits Kael out. He falls a long way, tumbling, rights himself
// and lands hard on the only floor there is (the game's void arena: black, a white edge). He gets up and looks round:
// a galaxy, nothing else. Far off a star brightens, opens, and Cosmic Axiom steps out of it and comes down to float
// over the floor. Kael raises the katana.
module.exports = {
  arena: 'void', frames: 640, endC: 10.2,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star;
    CA.stage();
    const KX = 330, SX = 640, LAND = 2.3;
    // Fall speed for the star streaks (px per choreography second) and its running total.
    const fallV = [[0, 900], [LAND - 0.05, 1500], [LAND, 0, 'lin'], [12, 0]];
    let scroll = 0, lastC = 0;
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true, drift: 1,
      speed: [[0, 1], [LAND - 0.25, 1], [LAND - 0.1, 0.35], [LAND + 0.15, 0.35], [LAND + 0.35, 1]],
      backdrop: (c, L) => {
        const t = L.D.c, vy = L.curve(fallV, t)[0];
        CA.paintVoid(c, { vy, scroll, gy: -60, galaxy: t < LAND ? 0.4 : 0.75 });
        CA.rift(c, KX + 110, G - 960, 120, L.curve([[0, 1], [0.35, 1], [0.8, 0, 'in']], t)[0], t);
        // Where he appears: one star brightening, then opening.
        const sk = L.curve([[0, 0], [4.2, 0], [4.9, 1, 'in'], [5.3, 1], [5.9, 0, 'out']], t)[0];
        if (sk > 0.01) {
          c.save(); c.globalCompositeOperation = 'lighter';
          const x = SX, y = G - 120, r = 4 + sk * 40, g = c.createRadialGradient(x, y, 0, x, y, r * 3);
          g.addColorStop(0, 'rgba(255,255,255,' + sk + ')'); g.addColorStop(0.15, 'rgba(200,215,255,' + 0.5 * sk + ')'); g.addColorStop(1, 'rgba(60,80,200,0)');
          c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3, 0, Math.PI * 2); c.fill();
          c.strokeStyle = star; c.globalAlpha = sk; c.lineWidth = 1.2;
          c.beginPath(); c.moveTo(x - r * 2.4, y); c.lineTo(x + r * 2.4, y); c.moveTo(x, y - r * 1.6); c.lineTo(x, y + r * 1.6); c.stroke();
          c.restore();
        }
        CA.floor(c);
      },
      actors: {
        k: {
          beats: [[0, 'tuck', 'io', { rot: 360 }], [0.45, 'flyBack', 'lin', { rot: 230 }], [0.9, 'tuck', 'lin', { rot: 110 }], [1.35, 'flyBack', 'lin', { rot: 30 }],
            [1.75, 'airHigh', 'out'], [2.15, 'airCut', 'io'], [LAND, 'crouchLand', 'xout'],
            [3.4, 'crouchLand'], [4.1, 'readyOpen', 'io', { headTilt: -10 }], [4.6, 'readyOpen', 'io', { headTilt: 4 }],
            [5.3, 'readyOpen', 'io', { headTilt: -4 }], [7.6, 'readyOpen'], [8.2, 'guard', 'out'], [10.2, 'guard']],
          pos: [[0, KX + 110, 940], [LAND, KX, 0, 'in'], [10.2, KX, 0]],
          face: [[0, 1], [4.1, -1], [4.75, 1]], trail: [[0, LAND, 3, 0.04, 0.35]],
          aura: [[0, 0.2], [LAND, 0.6], [3, 0.25], [8.2, 0.6]], glowK: [[0, 0.3]], eyes: [[0, 0], [8.25, 1]], expr: [[0, 'hurt'], [LAND, 'intense']],
        },
        s: CA.actor({
          beats: [[0, 'caFloat'], [10.2, 'caFloat', 'io', { headTilt: 2 }]],
          pos: [[0, SX, 60], [5.0, SX, 60], [7.0, SX, 16, 'io'], [10.2, SX, 14]],
          face: [[0, -1]], alphaK: [[0, 0], [4.95, 0], [5.6, 1, 'out']],
          neb: [[0, 0], [5.0, 0], [6.2, 1]], crust: [[0, 0.45]],
          aura: [[0, 0], [5.2, 0.6]], eyes: [[0, 0], [6.4, 0], [6.9, 1]],
        }),
      },
      cam: [
        // Falling with him.
        [0, KX + 100, 980, 2.6], [LAND - 0.02, KX + 6, 70, 2.3, 'in'],
        // Impact (low, close), then the wide: a small figure on a black floor under the galaxy.
        [LAND, KX + 4, 54, 3.4, 'hold'], [3.2, KX + 4, 56, 3.6, 'sine'],
        [3.21, 460, 150, 1.25, 'hold'], [5.0, 470, 150, 1.3, 'sine'],
        // The star opening: on it.
        [5.01, SX - 10, 128, 2.5, 'hold'], [7.0, SX - 6, 108, 2.7, 'sine'],
        // The two of them, square on.
        [7.01, 485, 96, 1.9, 'hold'], [8.9, 485, 98, 2.05, 'sine'],
        [8.91, KX + 8, 66, 4.2, 'hold'], [9.5, KX + 8, 66, 4.4, 'sine'],
        [9.51, SX - 4, 120, 4.2, 'hold'], [10.2, SX - 4, 120, 4.4, 'sine'],
      ],
      ev: [
        [0.02, L => { L.sfx('portalOpen', 0.9, 0.55); L.sfx('stingRise', 0.6, 0.6); }],
        [LAND, L => {
          L.sfx('landHard', 1, 0.7); L.sfx('explosion', 0.8, 0.45); L.shake(16);
          L.ring(KX, G, 160, { sq: 0.18, col: star, w: 5, life: 26 });
          L.dust(KX, 10, 110, { col: '#9fb4ff', a: 0.16, r: 4 });
          L.debris(KX, G - 2, 14, { kind: 'spark', col: star, v: 5, r: 2, g: 0.15 });
          L.crack(KX, 70, { col: '#9fb4ff', life: 200 });
        }],
        [4.9, L => { L.sfx('stingLow', 0.8, 0.5); }],
        [5.25, L => { L.sfx('superActivate', 0.8, 0.45); L.sfx('phaseUp', 0.6, 0.5); L.streaks(SX, G - 120, 16, 90, { col: star, life: 22, w: 2 }); L.ring(SX, G - 120, 90, { col: star, w: 3, life: 26 }); }],
        [6.95, L => { L.sfx('land', 0.4, 0.5); L.ring(SX, G, 70, { sq: 0.18, col: star, w: 3, life: 30 }); }],
        [8.2, L => { L.sfx('iaiMark', 0.6, 0.8); }],
        [9.51, L => { L.sfx('stingImpact', 0.6, 0.55); }],
      ],
      each: (L, c) => { scroll += L.curve(fallV, c)[0] * (c - lastC); lastC = c; },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
