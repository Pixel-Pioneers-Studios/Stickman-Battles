'use strict';
// Act 2, interference. The giant aims down at Kael and fires: the light reaches him and comes apart, scattered off a
// sphere of wavering cyan round him (canon: his fragment is the same frequency as the Axiom's power, so it jams it).
// Kael looks at his own hand. The giant presses "down" on him: the floor cracks, Kael's knees bend, and it is the
// giant form that cannot hold, flickering between sizes and dropping back to a man's height. Kael gets up and walks
// in; the pull the Axiom throws at him bends round him and he keeps walking.
module.exports = {
  arena: 'void', frames: 620, endC: 10,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff';
    CA.stage();
    const FIRE = 1.1, STOP = 3.4, PRESS = 3.8, FLICK = 4.2, SMALL = 4.95, WALK = 6.4;
    const beamK = [[0, 0], [FIRE, 0], [FIRE + 0.05, 1, 'lin'], [STOP - 0.15, 1], [STOP, 0, 'lin']];
    const noiseK = [[0, 0], [FIRE + 0.05, 0], [FIRE + 0.2, 1, 'out'], [STOP, 0.8], [STOP + 0.4, 0.3], [PRESS + 0.2, 1, 'out'], [SMALL + 0.4, 0.35], [10, 0.4]];
    // The giant losing his size: snapped between sizes, then down to a man's.
    const scaleK = [[0, 5.8], [FLICK, 5.8], [FLICK + 0.07, 3.9, 'hold'], [FLICK + 0.14, 5.3, 'hold'], [FLICK + 0.22, 2.6, 'hold'], [FLICK + 0.3, 4.4, 'hold'], [FLICK + 0.38, 1.9, 'hold'], [FLICK + 0.46, 3.1, 'hold'], [SMALL - 0.2, 1.6, 'hold'], [SMALL, 1.3, 'out']];
    const pullK = [[0, 0], [WALK + 0.4, 0], [WALK + 0.8, 0.8], [10, 0.8]];
    const chest = (L) => { const J = L.joints('k'); return { x: (J.shoulder.x + J.hip.x) / 2, y: (J.shoulder.y + J.hip.y) / 2 }; };
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true,
      fade: [[0, 1], [0.5, 0, 'lin']],
      speed: [[0, 1], [FIRE + 0.15, 1], [FIRE + 0.2, 0.4], [FIRE + 0.6, 0.4], [FIRE + 0.9, 1], [FLICK, 1], [FLICK + 0.02, 0.6], [SMALL, 0.6], [SMALL + 0.3, 1]],
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.75 });
        CA.floor(c);
        const J = L.joints('s'), p = chest(L);
        CA.pull(c, (J.neck.x + J.hip.x) / 2, (J.neck.y + J.hip.y) / 2, L.curve(pullK, t)[0], t);
        CA.scatter(c, J.rHand.x, J.rHand.y, p.x, p.y, 46, L.curve(beamK, t)[0], t, { n: 6, len: 340 });
      },
      actors: {
        k: {
          beats: [[0, 'guard', 'io', { headTilt: -32 }], [FIRE - 0.1, 'guard', 'io', { headTilt: -28 }], [FIRE + 0.15, 'block', 'xout'], [FIRE + 1.0, 'block'],
            [FIRE + 1.5, 'lookHandStand'], [STOP, 'lookHandStand', 'io', { headTilt: 18 }], [STOP + 0.3, 'readyOpen', 'io', { headTilt: -26 }],
            [PRESS, 'readyOpen', 'io', { headTilt: -26 }], [PRESS + 0.15, 'crouch', 'xout', { headTilt: -10 }], [FLICK + 0.3, 'crouch', 'io', { headTilt: -16 }],
            [SMALL + 0.6, 'guard', 'io'], [WALK, 'guard', 'io', { headTilt: 0 }],
            [WALK + 0.4, 'walkLowA'], [WALK + 0.8, 'walkLowB'], [WALK + 1.2, 'walkLowA'], [WALK + 1.6, 'walkLowB'], [WALK + 2.0, 'walkLowA'], [WALK + 2.4, 'walkLowB'],
            [WALK + 2.8, 'walkLowA'], [WALK + 3.2, 'runA'], [10, 'runB']],
          pos: [[0, 150, 0], [WALK, 150, 0], [WALK + 3.2, 300, 0, 'lin'], [10, 360, 0, 'in']],
          face: [[0, 1]],
          aura: [[0, 0.35], [FIRE + 0.2, 0.9], [STOP + 0.3, 0.5], [PRESS + 0.2, 1], [SMALL + 0.5, 0.7]], glowK: [[0, 0.3], [FIRE + 0.2, 0.7], [10, 0.6]],
          eyes: [[0, 1]], expr: [[0, 'intense']],
          post: (c, L) => CA.noise(c, chest(L).x, chest(L).y, L.curve(noiseK, L.D.c)[0], L.D.c),
        },
        s: CA.actor({
          beats: [[0, 'caFloat', 'io', { headTilt: 16, torso: 6 }], [0.8, 'caFloat', 'io', { headTilt: 16, torso: 6 }], [FIRE, 'caAimDown', 'xout'], [STOP, 'caAimDown'],
            [STOP + 0.5, 'caFloat', 'io', { headTilt: 26, torso: 4 }], [PRESS - 0.1, 'caFloat', 'io', { headTilt: 22 }], [PRESS, 'caPalmDown', 'xout'], [FLICK + 0.4, 'caPalmDown'],
            [SMALL + 0.4, 'caFloat', 'io', { headTilt: 6 }], [WALK + 0.3, 'caFloat'], [WALK + 0.6, 'caPalmTurn', 'out'], [10, 'caPalmTurn']],
          pos: [[0, 680, 4], [FLICK, 680, 4], [SMALL, 640, 14, 'out'], [10, 640, 14]], face: [[0, -1]],
          neb: [[0, 1]], crust: [[0, 0.45]], aura: [[0, 0.8], [SMALL, 0.5]], eyes: [[0, 1]],
        }),
      },
      cam: [
        [0, 424, 268, 0.84], [FIRE - 0.01, 424, 268, 0.85, 'sine'],
        // From behind Kael: the light coming down and breaking off round him.
        [FIRE, 230, 96, 2.0, 'hold'], [STOP, 200, 86, 2.6, 'sine'],
        // Wide for the press and the giant coming apart.
        [STOP + 0.01, 420, 282, 0.8, 'hold'], [FLICK + 0.2, 420, 240, 0.92, 'sine'], [SMALL + 0.3, 400, 140, 1.35, 'io'],
        [WALK, 400, 110, 1.6, 'sine'],
        // Walking in.
        [WALK + 0.01, 250, 70, 2.8, 'hold'], [WALK + 2.0, 300, 74, 2.8, 'sine'],
        [WALK + 2.01, 470, 100, 1.8, 'hold'], [10, 500, 100, 2.0, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingLow', 0.6, 0.4); }],
        [FIRE, L => { L.sfx('hitZap', 1, 0.45); L.sfx('superActivate', 0.8, 0.5); L.shake(10); }],
        [FIRE + 0.2, L => { L.sfx('shieldUp', 0.9, 0.6); L.sfx('soulRip', 0.5, 0.7); const p = chest(L); L.ring(p.x, p.y, 90, { col: cyan, w: 4, life: 24 }); L.D.log.noise = { kael: [Math.round(p.x), Math.round(p.y)] }; }],
        [FIRE + 1.5, L => { L.sfx('stingRise', 0.5, 0.8); }],
        [PRESS, L => {
          L.sfx('stingImpact', 1, 0.35); L.sfx('explosion', 0.8, 0.35); L.shake(16);
          L.crack(150, 120, { col: '#9fb4ff', life: 400 }); L.ring(150, G, 200, { sq: 0.16, col: star, w: 5, life: 26 });
          const p = chest(L); L.ring(p.x, p.y, 110, { col: cyan, w: 5, life: 24 });
        }],
        [FLICK, L => { L.sfx('hitZap', 0.8, 0.4); L.sfx('soulRip', 0.8, 0.4); }],
        [FLICK + 0.22, L => { L.sfx('hitZap', 0.7, 0.55); }], [FLICK + 0.38, L => { L.sfx('hitZap', 0.7, 0.7); }],
        [SMALL, L => { L.sfx('stingLow', 0.9, 0.6); L.shake(8); const J = L.joints('s'); L.streaks((J.neck.x + J.hip.x) / 2, (J.neck.y + J.hip.y) / 2, 24, 140, { col: star, life: 22, w: 2 }); }],
        [WALK + 0.6, L => { L.sfx('stingImpact', 0.7, 0.5); L.sfx('soulRip', 0.4, 0.5); }],
        [WALK + 3.2, L => { L.sfx('jump', 0.5, 0.9); }],
      ],
      each: (L, c) => {
        const s = L.actors.s; s.scale = L.curve(scaleK, c)[0];
        if (c > FLICK && c < SMALL && Math.random() < 0.6) { const J = L.joints('s'); L.debris(J.hip.x + (Math.random() - 0.5) * 80 * s.scale, J.neck.y + Math.random() * 60 * s.scale, 2, { kind: 'spark', col: star, v: 3, r: 1.6, g: 0.02, spread: 360 }); }
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
