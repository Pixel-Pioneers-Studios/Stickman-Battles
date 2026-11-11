'use strict';
// Act 2, excavation. Kael runs in; the Axiom presses "down" on him and he dips and keeps running. Now the cuts land.
// Each one strikes a crusted bone and throws its plate off (canon: every hit clears void corruption; Kael is not
// out-powering him, he is excavating), and behind the starlight under it, for a moment, there are people: grey
// strangers standing in him (the kept bearers). The Axiom answers with his hands and with a collapse at Kael's side
// that wobbles and fails in the interference. Third cut; he lifts away and looks at his own arm. Close: the kept.
module.exports = {
  arena: 'void', frames: 560, endC: 8.6,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff';
    CA.stage();
    const H1 = 0.62, PALM = 1.15, H2 = 1.95, HOLE = 2.05, H3 = 2.92;
    const crustK = [[0, 0.45], [H1, 0.45], [H1 + 0.05, 0.45], [H1 + 0.07, 0.31, 'lin'], [H2, 0.31], [H2 + 0.05, 0.31], [H2 + 0.07, 0.279, 'lin'], [H3, 0.279], [H3 + 0.05, 0.279], [H3 + 0.07, 0.26, 'lin']];
    const keptK = [[0, 0], [H1, 0], [H1 + 0.05, 0.6, 'lin'], [H1 + 0.4, 0.12], [H2, 0.12], [H2 + 0.05, 0.6, 'lin'], [H2 + 0.4, 0.15], [H3, 0.15], [H3 + 0.05, 0.7], [4.2, 0.35], [5.0, 0.7], [8.6, 0.75]];
    const holeK = [[0, 0], [HOLE, 0], [HOLE + 0.1, 0.7, 'out'], [2.5, 0.75], [2.62, 0, 'in']];
    const noiseK = [[0, 0.4], [0.3, 1, 'out'], [0.8, 0.5], [HOLE + 0.1, 1, 'out'], [2.8, 0.45], [8.6, 0.4]];
    const chest = (L) => { const J = L.joints('k'); return { x: (J.shoulder.x + J.hip.x) / 2, y: (J.shoulder.y + J.hip.y) / 2 }; };
    // Where each cut lands: the middle of the struck bone, and how far the drawn blade passes from it.
    const strike = (L, name, a, b) => { const J = L.joints('s'), p = { x: (J[a].x + J[b].x) / 2, y: (J[a].y + J[b].y) / 2 }; (L.D.log.hits || (L.D.log.hits = {}))[name] = Object.assign({ at: [Math.round(p.x), Math.round(p.y)] }, L.onBlade('k', p)); return p; };
    const hit = (L, p) => {
      L.sfx('heavyHit', 1, 0.6); L.sfx('hitSlash', 0.9, 0.7); L.shake(10); L.impact(2, { tint: '#bfe8ff' });
      L.burst(p.x, p.y, 14, star); L.ring(p.x, p.y, 50, { col: cyan, w: 3, life: 16 });
    };
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true,
      speed: [[0, 1], [H1 - 0.02, 1], [H1, 0.3], [H1 + 0.25, 0.3], [H1 + 0.4, 1], [H2 - 0.02, 1], [H2, 0.35], [H2 + 0.2, 0.35], [H2 + 0.3, 1], [H3 - 0.02, 1], [H3, 0.3], [H3 + 0.3, 0.3], [H3 + 0.6, 1]],
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.75 });
        CA.floor(c);
        const p = chest(L);
        CA.hole(c, p.x + 40, p.y - 30, 14, L.curve(holeK, t)[0], t, { jam: 0.9 });
      },
      actors: {
        k: {
          beats: [[0, 'runB'], [0.15, 'runA', 'io', { hipDrop: 14, torso: 44 }], [0.3, 'runB', 'io', { hipDrop: 12 }], [0.45, 'windBack'],
            [H1, 'slashOut', 'xout'], [0.85, 'ready'], [PALM - 0.05, 'block', 'out'], [PALM + 0.3, 'block', 'io', { torso: -12 }],
            [1.6, 'highGuard'], [H2, 'cutDown', 'xout'], [2.3, 'ready'], [2.65, 'windBack'], [H3, 'slashOut', 'xout', { torso: 34, hipDrop: 22 }],
            [3.4, 'follow'], [4.2, 'guard'], [8.6, 'guard', 'io', { headTilt: -14 }]],
          pos: [[0, 360, 0], [0.45, 548, 0, 'lin'], [H1, 574, 0, 'out'], [PALM, 556, 0], [PALM + 0.35, 486, 0, 'out'], [1.6, 500, 0], [H2, 548, 0, 'out'], [2.65, 520, 0], [H3, 572, 0, 'out'], [3.6, 560, 0], [4.2, 520, 0, 'io']],
          face: [[0, 1]], trail: [[0, 0.5, 3, 0.03, 0.35]],
          aura: [[0, 0.7]], glowK: [[0, 0.6]], eyes: [[0, 1]], expr: [[0, 'intense']],
          post: (c, L) => CA.noise(c, chest(L).x, chest(L).y, L.curve(noiseK, L.D.c)[0], L.D.c),
        },
        s: CA.actor({
          beats: [[0, 'caPalmTurn'], [0.25, 'caPalmDown', 'xout'], [0.45, 'caGuard', 'out'], [H1, 'caGuard'], [H1 + 0.15, 'caRecoil', 'out', { torso: -8 }],
            [PALM - 0.15, 'caFloat'], [PALM, 'caAim', 'xout'], [H2 + 0.05, 'caAim'], [H2 + 0.2, 'caRecoil', 'out', { torso: -10 }],
            [HOLE + 0.1, 'caFist'], [2.7, 'caFloat'], [H3 + 0.15, 'caRecoil', 'out'], [4.0, 'caLookArm', 'io'], [8.6, 'caLookArm', 'io', { headTilt: 30 }]],
          pos: [[0, 640, 14], [H1, 640, 14], [H1 + 0.2, 656, 18, 'out'], [PALM, 640, 14], [H2, 640, 14], [H2 + 0.2, 650, 16, 'out'], [H3, 650, 16], [H3 + 0.25, 680, 30, 'out'], [4.2, 690, 56, 'io'], [8.6, 690, 60]],
          face: [[0, -1]], crust: crustK, headCrust: [[0, 1]], kept: keptK, keptFace: [[0, 0]],
          neb: [[0, 1]], aura: [[0, 0.5]], eyes: [[0, 1]],
        }),
      },
      // After setup (below): each cut's beat is aimed at the bone it strikes, judged a few frames into the hold.
      cam: [
        [0, 470, 96, 2.0], [0.45, 580, 96, 2.5, 'out'], [H1 + 0.5, 590, 100, 2.7, 'sine'],
        [H1 + 0.51, 570, 96, 2.3, 'hold'], [H3 + 0.4, 600, 100, 2.4, 'sine'],
        [H3 + 0.41, 620, 110, 1.9, 'hold'], [4.2, 630, 120, 2.0, 'sine'],
        // Close on him: the arm, then the kept in his nebula.
        [4.21, 690, 150, 3.4, 'hold'], [5.4, 690, 148, 3.6, 'sine'],
        [5.41, 694, 128, 5.0, 'hold'], [8.6, 694, 128, 5.6, 'sine'],
      ],
      ev: [
        [0.25, L => { L.sfx('stingImpact', 0.8, 0.45); L.shake(8); const p = chest(L); L.ring(p.x, p.y, 100, { col: cyan, w: 4, life: 22 }); }],
        [0.47, L => { L.sfx('swingHeavy', 0.9, 0.9); }],
        [H1 + 0.05, L => hit(L, strike(L, 'lUpper', 'shoulder', 'lElbow'))],
        [PALM, L => { L.sfx('clang', 1, 0.6); L.sfx('heavyHit', 0.8, 0.5); L.shake(12); const t = L.tip('k'); L.ring((t.x + t.hand.x) / 2, (t.y + t.hand.y) / 2, 70, { col: star, w: 4, life: 20 }); L.D.log.palm = L.onBlade('k', L.joints('s').rHand); }],
        [1.62, L => { L.sfx('swingHeavy', 0.9, 0.95); }],
        [H2 + 0.05, L => hit(L, strike(L, 'rFore', 'rElbow', 'rHand'))],
        [HOLE, L => { L.sfx('soulAbsorb', 0.7, 0.7); }], [2.62, L => { L.sfx('hitZap', 0.8, 0.7); const p = chest(L); L.burst(p.x + 40, p.y - 30, 16, star); }],
        [2.67, L => { L.sfx('swingHeavy', 0.9, 0.85); }],
        [H3 + 0.05, L => hit(L, strike(L, 'rThigh', 'hip', 'rKnee'))],
        [4.3, L => { L.sfx('stingLow', 0.7, 0.5); }],
        [5.45, L => { L.sfx('soulHarvest', 0.5, 0.5); L.sfx('stingRise', 0.4, 0.4); }],
      ],
    });
    const k = L.actors.k, J = (c) => L.joints('s', c), mid = (c, a, b) => { const j = J(c); return { x: (j[a].x + j[b].x) / 2, y: (j[a].y + j[b].y) / 2 }; };
    const bi = (t) => k.beats.findIndex(b => b[0] === t);
    L.D.log.solve = {
      lUpper: CA.solve('k', bi(H1), mid(H1 + 0.05, 'shoulder', 'lElbow'), H1 + 0.05, { range: 110 }),
      rFore: CA.solve('k', bi(H2), mid(H2 + 0.05, 'rElbow', 'rHand'), H2 + 0.05, { range: 110 }),
      rThigh: CA.solve('k', bi(H3), mid(H3 + 0.05, 'hip', 'rKnee'), H3 + 0.05, { range: 110 }),
    };
  },
  tick: function (H) { FILM.tick(H); },
};
