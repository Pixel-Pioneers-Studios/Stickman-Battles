'use strict';
// Act 3, the watcher. Quiet: the two of them, the empty form kneeling behind. The camera rises off them into the dark
// over the Void, a long way, to a red figure hanging there: Sovereign, who has been watching (canon: he arrives above
// the arena during the saving moment and does not descend; the kernel is exposed, but the bearer beside it is at peak
// output, and he does not take contested prizes). His mark closes on the gold in Axiom's chest. He turns and is gone
// upward. Below, Kael looks up a moment late, at nothing. Black.
module.exports = {
  arena: 'void', frames: 820, endC: 12.6,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const gold = CA.gold, red = '#ff3311';
    CA.stage();
    players[1].color = '#3a4260';
    const SX = 880, AX = 858, KX = 772, VX = 820, VH = 470, RISE = 1.6, SEEN = 4.2, MARK = 6.1, GONE = 7.9, LOOK = 8.8;
    const goldF = CA.proxy(gold), sovF = CA.proxy(red, 'nullblade');
    const kernel = (L) => { const J = L.joints('a'); return { x: (J.neck.x + J.hip.x) / 2, y: (J.neck.y + J.hip.y) / 2 - 2 }; };
    L.setup(H, {
      tempo: 1, vignette: 0.64, plant: true,
      fade: [[0, 0], [11.4, 0], [12.4, 1, 'io'], [12.6, 1]],
      backdrop: (c, L) => {
        CA.paintVoid(c, { gy: -60, galaxy: 0.8 });
        CA.floor(c);
      },
      actors: {
        k: {
          beats: [[0, 'readyOpen', 'io', { headTilt: -2 }], [LOOK, 'readyOpen', 'io', { headTilt: -2 }], [LOOK + 0.6, 'readyOpen', 'io', { headTilt: -40, torso: -8 }], [12.6, 'readyOpen', 'io', { headTilt: -42, torso: -8 }]],
          pos: [[0, KX, 0]], face: [[0, 1]], aura: [[0, 0.3]], glowK: [[0, 0.4]], eyes: [[0, 0.5]], expr: [[0, 'neutral'], [LOOK + 0.4, 'intense']],
        },
        s: CA.actor({ beats: [[0, 'kneel', 'io', { torso: 34, headTilt: 42 }]], pos: [[0, SX, 0]], face: [[0, -1]], crust: [[0, 0]], headCrust: [[0, 0]], neb: [[0, 0]], starK: [[0, 0]], aura: [[0, 0]], eyes: [[0, 0]], z: 0 }),
        a: {
          f: goldF, scale: 1.08, z: 2, lag: 1,
          beats: [[0, 'lookHandStand', 'io', { lArm: 50, lFore: -40, headTilt: 10 }], [1.4, 'stand', 'io', { headTilt: 0 }], [12.6, 'stand', 'io', { headTilt: 2 }]],
          pos: [[0, AX, 0]], face: [[0, -1]], weapon: [[0, false]], aura: [[0, 0.4]], auraColor: gold, glowK: [[0, 0.6]], eyes: [[0, 0.5]], eyeColor: gold, expr: [[0, 'neutral']],
          post: (c, L, a, s) => {
            const p = kernel(L), t = L.D.c;
            c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, 'rgba(255,210,127,0.8)'); g.addColorStop(1, 'rgba(255,210,127,0)');
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 9, 0, Math.PI * 2); c.fill(); c.restore();
            // His mark, closing on it; it stays a moment after he has gone, then fades.
            CA.mark(c, p.x, p.y, L.curve([[0, 0], [MARK, 0], [MARK + 1.1, 1, 'out'], [12.6, 1]], t)[0], t, { r0: 46, r1: 7, alpha: L.curve([[0, 1], [GONE + 0.6, 1], [LOOK + 0.6, 0]], t)[0] });
          },
        },
        v: {
          f: sovF, scale: 1.0, z: 3, lag: 1,
          beats: [[0, 'sovReady', 'io', { headTilt: 18, torso: 6, rLeg: 96, rShin: 104, lLeg: 84, lShin: 96 }], [GONE - 0.3, 'sovReady', 'io', { headTilt: 22, torso: 8, rLeg: 96, rShin: 104, lLeg: 84, lShin: 96 }], [GONE, 'sovReady', 'io', { headTilt: -6, torso: -4 }]],
          pos: [[0, VX, VH], [GONE, VX, VH], [GONE + 0.35, VX + 10, VH + 260, 'in']], face: [[0, -1], [GONE - 0.15, 1]],
          alphaK: [[0, 0], [RISE + 1.4, 0], [SEEN - 0.3, 1, 'io'], [GONE + 0.2, 1], [GONE + 0.35, 0, 'lin']], trail: [[GONE, GONE + 0.4, 5, 0.025, 0.5]], trailColor: red,
          aura: [[0, 0.3]], auraColor: red, glowK: [[0, 0.4]], eyes: [[0, 0], [SEEN, 1], [GONE + 0.3, 0]], eyeColor: red, expr: [[0, 'neutral']],
        },
      },
      cam: [
        [0, 828, 92, 2.1], [RISE, 828, 96, 2.15, 'sine'],
        // Up off them, a long way, into the dark over the Void.
        [SEEN - 0.4, VX, VH - 40, 1.7, 'io'], [SEEN, VX, VH + 30, 2.6, 'io'],
        [SEEN + 0.01, VX, VH + 44, 4.6, 'hold'], [MARK - 0.01, VX, VH + 44, 4.9, 'sine'],
        // The gold in Axiom's chest, the mark closing on it.
        [MARK, AX - 2, 46, 6.0, 'hold'], [GONE - 0.31, AX - 2, 46, 6.4, 'sine'],
        // Him again: he turns and goes.
        [GONE - 0.3, VX, VH + 44, 4.2, 'hold'], [GONE + 0.6, VX, VH + 60, 4.0, 'sine'],
        // Below: Kael looking up at nothing, low and wide.
        [GONE + 0.61, 800, 128, 1.5, 'hold'], [12.6, 806, 136, 1.42, 'sine'],
      ],
      ev: [
        [0.2, L => { L.sfx('stingLow', 0.4, 0.4); }],
        [SEEN - 0.3, L => { L.sfx('stingLow', 0.9, 0.3); }],
        [SEEN + 0.2, L => { L.sfx('iaiMark', 0.5, 0.5); }],
        [MARK, L => { L.sfx('hitZap', 0.35, 1.4); }],
        [GONE, L => { L.sfx('swingHeavy', 0.6, 0.6); L.sfx('portalOpen', 0.4, 0.8); }],
        [LOOK, L => { L.sfx('stingRise', 0.3, 0.5); }],
      ],
    });
  },
  tick: function (H) { FILM.tick(H); },
};
