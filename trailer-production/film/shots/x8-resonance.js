'use strict';
// Act 3, resonance. The Axiom comes down onto one knee on the floor; his face is still crusted, cracked with light.
// He raises a hand to begin one more command. Then Kael's fragment goes off: not an attack, involuntary (canon), a
// pulse out of his chest that passes through the Axiom and finds something deep in him: a point of light, the
// fragment he dissolved five thousand years ago, the same thing in another state. A thread between the two chests.
// Through it the kept look back at him (canon: everyone who died holding the fragment, looking back at Axiom through
// the only channel that could reach him): they turn, and step out of him, and stand round him in the Void. His hand
// comes down. The crust on his face splits and falls.
module.exports = {
  arena: 'void', frames: 960, endC: 14.5,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff', gold = CA.gold;
    CA.stage();
    const SX = 880, KX = 716, RAISE = 1.6, PULSE = 3.6, THREAD = 4.0, TURN = 5.2, OUT = 6.4, LOWER = 7.0, SPLIT = 12.2;
    const core = (L) => { const J = L.joints('s'); return { x: (J.neck.x + J.hip.x) / 2, y: (J.neck.y + J.hip.y) / 2 }; };
    const chest = (L) => { const J = L.joints('k'); return { x: (J.shoulder.x + J.hip.x) / 2, y: (J.shoulder.y + J.hip.y) / 2 }; };
    const threadK = [[0, 0], [THREAD, 0], [THREAD + 0.6, 1, 'out'], [14.5, 1]];
    const ringK = [[0, 0], [OUT, 0], [OUT + 3.6, 1, 'io'], [14.5, 1]];
    L.setup(H, {
      tempo: 1, vignette: 0.62, plant: true,
      speed: [[0, 1], [PULSE - 0.02, 1], [PULSE, 0.4], [PULSE + 0.6, 0.4], [PULSE + 1.0, 1], [SPLIT - 0.02, 1], [SPLIT, 0.4], [SPLIT + 0.6, 0.4], [SPLIT + 1.0, 1]],
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.6 });
        CA.floor(c);
        CA.keptRing(c, SX - 40, L.curve(ringK, t)[0], t, { n: 20, rx: 330 });
        const a = chest(L), b = core(L);
        CA.thread(c, a.x, a.y, b.x, b.y, L.curve(threadK, t)[0], t);
        // The point in him the pulse found.
        const pk = L.curve([[0, 0], [PULSE + 0.25, 0], [PULSE + 0.5, 1, 'out'], [14.5, 1]], t)[0];
        if (pk > 0.01) {
          c.save(); c.globalCompositeOperation = 'lighter';
          const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, 18); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, 'rgba(255,220,150,' + 0.8 * pk + ')'); g.addColorStop(1, 'rgba(0,212,255,0)');
          c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, 18, 0, Math.PI * 2); c.fill(); c.restore();
        }
      },
      actors: {
        k: {
          beats: [[0, 'guard', 'io', { headTilt: -6 }], [RAISE + 0.3, 'guard', 'io', { torso: 14 }], [PULSE - 0.05, 'guard'], [PULSE + 0.12, 'pulseOpen', 'xout'], [PULSE + 1.2, 'pulseOpen', 'io', { torso: -10 }],
            [THREAD + 1.6, 'readyOpen', 'io', { headTilt: 6 }], [OUT + 1.5, 'readyOpen', 'io', { headTilt: 0 }], [14.5, 'readyOpen', 'io', { headTilt: 2 }]],
          pos: [[0, KX, 0], [14.5, KX, 0]],
          face: [[0, 1]], aura: [[0, 0.5], [PULSE, 1.2], [PULSE + 1.5, 0.6]], glowK: [[0, 0.5], [PULSE, 1.2], [PULSE + 1.5, 0.7]], eyes: [[0, 1]], expr: [[0, 'intense'], [THREAD + 1, 'neutral']],
        },
        s: CA.actor({
          beats: [[0, 'kneel', 'io', { torso: 30, headTilt: 38, hipDrop: 6 }], [1.2, 'kneel', 'io', { torso: 24, headTilt: 30 }], [RAISE, 'kneel', 'io', { torso: 14, headTilt: 6 }], [RAISE + 1.0, 'caKneelRaise', 'io'],
            [PULSE + 0.2, 'caKneelRaise', 'io', { torso: 4, headTilt: -10 }], [LOWER, 'caKneelRaise', 'io', { torso: 4, headTilt: -8 }], [LOWER + 2.5, 'caKneelLook', 'io'], [14.5, 'caKneelLook', 'io', { headTilt: -2 }]],
          pos: [[0, SX, 56], [1.4, SX, 0, 'io'], [14.5, SX, 0]], face: [[0, -1]],
          crust: [[0, 0.2], [SPLIT, 0.2], [SPLIT + 0.05, 0, 'lin']], headCrust: [[0, 1], [SPLIT, 1], [SPLIT + 0.03, 0, 'lin']], headCrack: [[0, 0.85], [9.5, 0.85], [SPLIT, 1]],
          kept: [[0, 0.8], [TURN, 0.9], [OUT, 1], [OUT + 2.5, 0.1], [14.5, 0.05]], keptFace: [[0, 1], [TURN, 0]],
          neb: [[0, 1]], aura: [[0, 0.4], [PULSE, 0.1], [SPLIT, 0.1], [SPLIT + 0.2, 0.5]], eyes: [[0, 0.6], [SPLIT, 0.6], [SPLIT + 0.4, 0.9]], expr: [[0, 'neutral'], [SPLIT, 'hurt']],
        }),
      },
      cam: [
        [0, 800, 100, 2.0], [RAISE, 806, 96, 2.2, 'sine'],
        // The hand coming up (close on him).
        [RAISE + 0.01, SX - 10, 70, 3.2, 'hold'], [PULSE - 0.01, SX - 10, 70, 3.4, 'sine'],
        // The pulse: wide.
        [PULSE, 800, 96, 1.9, 'hold'], [THREAD + 0.8, 800, 92, 2.2, 'sine'],
        // The kept turning in him, then out round them.
        [THREAD + 0.81, SX - 4, 66, 3.6, 'hold'], [OUT, SX - 4, 66, 3.8, 'sine'],
        [OUT + 0.01, 820, 120, 1.3, 'hold'], [LOWER + 2.6, 826, 104, 1.5, 'sine'],
        // His face.
        [LOWER + 2.61, SX - 12, 74, 4.6, 'hold'], [14.5, SX - 12, 74, 5.1, 'sine'],
      ],
      ev: [
        [0.1, L => { L.sfx('stingLow', 0.6, 0.4); }],
        [1.4, L => { L.sfx('land', 0.5, 0.5); L.ring(SX, G, 80, { sq: 0.18, col: star, w: 3, life: 30 }); }],
        [RAISE + 0.4, L => { L.sfx('stingRise', 0.5, 0.5); }],
        [PULSE, L => {
          const p = chest(L); L.sfx('superActivate', 1, 0.4); L.sfx('soulRip', 0.8, 0.35); L.shake(14);
          L.surge('k', cyan, 1.4); L.ring(p.x, p.y, 420, { col: cyan, w: 6, life: 60 }); L.ring(p.x, p.y, 260, { col: '#ffffff', w: 3, life: 44 });
        }],
        [PULSE + 0.35, L => { L.sfx('soulAbsorb', 0.9, 0.4); const b = core(L); L.D.log.core = [Math.round(b.x), Math.round(b.y)]; }],
        [THREAD, L => { L.sfx('stingRise', 0.6, 0.35); }],
        [TURN, L => { L.sfx('soulHarvest', 0.6, 0.4); }],
        [OUT, L => { L.sfx('soulHarvest', 0.7, 0.35); L.sfx('stingLow', 0.6, 0.35); }],
        [SPLIT, L => {
          const J = L.joints('s'); L.sfx('hitSnap', 1, 0.45); L.sfx('stingImpact', 0.7, 0.5); L.shake(6);
          L.debris(J.head.x, J.head.y, 16, { col: '#120818', v: 3, r: 2.6, g: 0.12, spread: 360 }); L.debris(J.head.x, J.head.y, 12, { kind: 'spark', col: star, v: 3, r: 1.5, g: 0.04, spread: 360 });
        }],
      ],
      each: (L, c) => {
        const s = L.actors.s;
        s.eyeColor = c < SPLIT ? CA.star : gold;
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
