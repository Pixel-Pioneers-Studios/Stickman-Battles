'use strict';
// Act 2, the patterns. Kael lets the katana go and reaches for the others the fragment carries: the hammer, the
// scythe, the spear, each the fighting style of a bearer who died holding it (canon: classes are the 94 dead).
// Sovereign has all ninety-four on file. Before each attack the dead bearer himself appears, grey, doing it, and
// Sovereign is already somewhere else. He answers with Counter Step (the Null Blade's move: punish the swing),
// then steps inside the spear's reach and kicks Kael across the roof.
module.exports = {
  arena: 'city', frames: 700, endC: 9.4,
  install: function (H) {
    const L = FILM, G = H.D.G;
    const red = '#ff3311', cyan = '#00d4ff', white = '#ffffff';
    const walk = (t0, t1, n0) => { const o = []; for (let i = n0 || 0, t = t0; t < t1; i++, t += 0.42) o.push([t, i % 2 ? 'sovWalkB' : 'sovWalkA', 'sine']); return o; };
    L.setup(H, {
      tempo: 0.92,
      speed: [[0, 1], [4.9, 1], [4.93, 0.15, 'xout'], [5.12, 0.15], [5.4, 1, 'in'], [6.9, 1], [6.92, 0.2, 'xout'], [7.02, 0.2], [7.25, 1, 'in']],
      actors: {
        k: {
          beats: [[0, 'kneelLook'], [1.7, 'kneelLook'], [2.0, 'crouch', 'io'], [2.45, 'readyOpen', 'io'], [2.65, 'ready', 'out'],
            // The hammer: a leap and a slam on the place Sovereign was.
            [2.95, 'crouch', 'io'], [3.1, 'airHigh', 'out'], [3.38, 'airHigh', 'io'], [3.48, 'cutDown', 'xin'], [3.75, 'cutDown'],
            // The scythe: a spinning reap at his neck.
            [3.95, 'ready', 'io'], [4.3, 'windBack', 'io'], [4.34, 'windBack', 'lin', { rot: 0 }], [4.55, 'slashOut', 'out', { rot: 360 }], [4.85, 'slashOut', 'lin', { rot: 360 }],
            // Cut by the Counter Step as Sovereign passes.
            [4.95, 'hitBack', 'xout', { rot: 360, rArm: -128, rFore: -112 }], [5.35, 'hitBack', 'lin', { rot: 360, rArm: -128, rFore: -112 }], [5.65, 'guard', 'io', { rot: 360 }],
            // The spear: three thrusts.
            [6.0, 'guard', 'lin', { rot: 360 }], [6.12, 'thrust', 'xout', { rot: 360 }], [6.22, 'guard', 'io', { rot: 360 }], [6.32, 'thrust', 'xout', { rot: 360 }],
            [6.42, 'guard', 'io', { rot: 360 }], [6.52, 'thrust', 'xout', { rot: 360 }], [6.88, 'thrust', 'lin', { rot: 360 }],
            // The kick.
            [6.95, 'flyBack', 'xout', { rot: 380 }], [7.4, 'flyBack', 'lin', { rot: 700 }], [7.55, 'crouchLand', 'xout', { rot: 720 }],
            [8.1, 'kneel', 'io', { rot: 720 }], [8.9, 'kneelLook', 'io', { rot: 720 }], [9.4, 'kneelLook', 'lin', { rot: 720 }]],
          pos: [[0, 200, 0], [2.95, 200, 0], [3.1, 232, 60, 'out'], [3.38, 280, 92, 'io'], [3.48, 296, 0, 'xin'], [3.95, 296, 0],
            [4.3, 290, 0], [4.85, 300, 0], [4.95, 330, 0, 'xout'], [5.35, 336, 0], [5.65, 304, 0], [6.0, 300, 0],
            [6.12, 288, 0, 'xout'], [6.22, 294, 0], [6.32, 284, 0, 'xout'], [6.42, 290, 0], [6.52, 282, 0, 'xout'], [6.88, 286, 0],
            [7.1, 380, 60, 'out'], [7.4, 540, 10, 'in'], [7.55, 556, 0, 'in'], [7.9, 600, 0, 'xout'], [9.4, 600, 0]],
          face: [[0, 1], [5.5, -1], [6.93, -1]],
          weapon: [[0, true], [1.95, false], [2.2, true], [3.82, false], [3.98, true], [5.68, false], [5.82, true], [7.75, false], [8.6, true]],
          wkey: [[0, 'katana'], [2.0, 'hammer'], [3.85, 'scythe'], [5.7, 'spear'], [7.8, 'katana']],
          wAlphaK: [[0, 1], [1.9, 1], [1.95, 0], [2.2, 0], [2.6, 1, 'in'], [3.98, 0, 'hold'], [4.25, 1, 'in'], [5.82, 0, 'hold'], [6.05, 1, 'in'],
            [8.6, 0, 'hold'], [9.0, 1, 'in']],
          trail: [[3.05, 3.5, 4, 0.03, 0.4], [4.34, 4.6, 4, 0.025, 0.4], [6.95, 7.5, 5, 0.035, 0.4]],
          aura: [[0, 0.1], [2.4, 0.3], [4.9, 0.3], [5.0, 0.6], [5.6, 0.2], [6.9, 0.2], [7.0, 0], [9.4, 0.1]],
          expr: [[0, 'angry'], [4.95, 'hurt'], [5.6, 'angry'], [6.95, 'hurt']],
        },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: walk(0, 1.6).concat([[1.7, 'sovReady', 'io'],
            // He steps off the line before the hammer leaves the ground.
            [2.85, 'sovReady'], [3.05, 'walkA', 'io', { rArm: 116, rFore: 132 }], [3.25, 'sovReady', 'io'],
            // Under the scythe before it comes.
            [4.3, 'sovReady'], [4.42, 'sovDuck', 'xout'], [4.75, 'sovDuck'],
            // Counter Step: through him, cutting.
            [4.86, 'lunge', 'xout'], [4.95, 'slashOut', 'xout'], [5.3, 'slashOut'], [5.55, 'sovReady', 'io'],
            [6.05, 'sovReady'], [6.1, 'sovLean', 'xout', { torso: -16 }], [6.2, 'sovReady', 'io'], [6.3, 'sovLean', 'xout', { torso: -18 }],
            [6.4, 'sovReady', 'io'], [6.5, 'sovLean', 'xout', { torso: -20 }],
            // Inside the reach. The kick.
            [6.78, 'sovReady', 'xout'], [6.92, 'sovKick', 'xout'], [7.3, 'sovKick'], [7.6, 'sovReady', 'io']]).concat(walk(7.9, 9.4, 1)),
          pos: [[0, 410, 0], [1.6, 300, 0, 'lin'], [2.85, 300, 0], [3.25, 372, 0, 'out'], [4.3, 372, 0], [4.42, 372, 0],
            [4.86, 366, 0], [4.95, 226, 0, 'xout'], [5.3, 220, 0], [6.05, 222, 0], [6.1, 208, 0, 'xout'], [6.2, 212, 0], [6.3, 200, 0, 'xout'],
            [6.4, 204, 0], [6.5, 194, 0, 'xout'], [6.62, 196, 0], [6.78, 262, 0, 'xout'], [7.6, 262, 0], [7.9, 262, 0], [9.4, 340, 0, 'lin']],
          face: [[0, -1], [5.4, 1]],
          trail: [[4.86, 5.0, 8, 0.012, 0.6], [6.62, 6.8, 5, 0.015, 0.5]],
          aura: [[0, 0.25], [4.8, 0.25], [4.86, 0.8], [5.3, 0.3], [6.7, 0.7], [7.2, 0.3]],
          auraColor: red,
        },
      },
      cam: [
        [0, 250, 55, 2.5], [1.6, 262, 56, 2.7, 'sine'],
        [1.61, 210, 48, 3.6, 'hold'], [2.6, 216, 50, 3.8, 'sine'],
        [2.61, 268, 112, 1.75, 'hold'], [3.3, 280, 104, 1.8, 'sine'], [3.48, 300, 78, 2.15, 'xout'], [3.6, 300, 68, 2.3, 'sine'],
        [3.8, 300, 60, 2.75, 'sine'], [4.25, 320, 66, 2.45, 'sine'], [4.9, 330, 70, 2.35, 'sine'],
        [4.93, 270, 62, 3.0, 'hold'], [5.4, 266, 62, 3.1, 'sine'], [5.7, 258, 64, 2.65, 'sine'],
        [6.6, 248, 66, 2.55, 'sine'], [6.92, 262, 64, 2.6, 'sine'], [7.5, 440, 70, 1.9, 'out'], [9.4, 450, 64, 2.0, 'sine'],
      ],
      ev: [
        [0.1, L => { L.sfx('stingLow', 0.5, 0.75); }],
        // He lets the katana go. The hammer.
        [1.92, L => { L.disperse('k', cyan, 0.9); L.sfx('soulRip', 0.4, 1.3); }],
        [2.2, L => { L.manifest('k', cyan, 0.6); L.sfx('phaseUp', 0.5, 0.8); }],
        [3.06, L => { L.sfx('jump', 0.7, 0.85); L.sfx('swingHeavy', 0.7, 0.7); }],
        [3.48, L => {
          L.sfx('heavyHit', 1.2, 0.6); L.sfx('explosion', 0.7, 1.3); L.sfx('landHard', 1); L.shake(24);
          const x = L.joints('k').hip.x + 36; L.ring(x, G, 150, { sq: 0.2, col: cyan, w: 8, life: 30 }); L.ring(x, G - 10, 70, { col: white, w: 4, life: 18 });
          L.crack(x, 90, { col: cyan, life: 200 }); L.debris(x, G - 4, 30, { v: 8, spread: 120, col: '#7d7a88', r: 4 });
          L.dust(x, 22, 200, { v: 5, life: 70 }); L.streaks(x, G - 10, 14, 70, { col: '#cfefff', dir: -90, spread: 120, life: 14, w: 2 });
        }],
        // The scythe.
        [3.84, L => { L.disperse('k', cyan, 0.7); }],
        [3.98, L => { L.manifest('k', cyan, 0.5); L.sfx('phaseUp', 0.45, 1.0); }],
        [4.35, L => { L.sfx('swing3', 0.9, 0.8); }],
        [4.5, L => { L.slash(310, G - 74, 90, 200, 380, { sq: 0.32, col: cyan, w: 16, life: 18 }); L.sfx('soulHarvest', 0.4, 1.2); }],
        // Counter Step.
        [4.88, L => { L.sfx('swing', 1, 1.2); L.lines(16, { dir: 180, n: 36, col: '#ffd0c0' }); }],
        [4.93, L => {
          L.sfx('hitSlash', 1.1, 0.8); L.sfx('stingImpact', 0.8, 0.8); L.shake(18); L.impact(2, { tint: '#ff3311' });
          const J = L.joints('k'); L.slash(J.shoulder.x, J.shoulder.y + 6, 50, 150, 20, { sq: 0.3, col: red, w: 14, life: 16, tilt: -10 });
          L.burst(J.shoulder.x, J.shoulder.y + 10, 24, '#9feaff'); L.streaks(J.shoulder.x, J.shoulder.y, 16, 60, { col: '#ff9a80', dir: 180, spread: 60, life: 16 });
        }],
        // The spear.
        [5.69, L => { L.disperse('k', cyan, 0.6); }],
        [5.82, L => { L.manifest('k', cyan, 0.45); L.sfx('phaseUp', 0.4, 1.2); }],
        [6.1, L => { L.sfx('swingLight', 0.9, 1.2); }], [6.3, L => { L.sfx('swingLight', 0.9, 1.25); }], [6.5, L => { L.sfx('swingLight', 0.9, 1.3); }],
        [6.78, L => { L.sfx('swing', 0.8, 0.9); L.dust(240, 6, 40, { v: 2 }); }],
        [6.92, L => {
          L.sfx('heavyHit', 1.2, 0.7); L.sfx('hitBlunt', 0.8, 0.7); L.shake(22); L.flash(red, 0.2, 10);
          const J = L.joints('s'); const f = J.lFoot;
          L.ring(f.x, f.y, 110, { col: red, w: 7, life: 26 }); L.streaks(f.x, f.y, 22, 110, { col: '#ffb09a', dir: 0, spread: 80, life: 18 });
          L.surge('s', red, 0.8);
        }],
        [7.4, L => { L.sfx('landHard', 1); L.shake(12); L.dust(540, 10, 60, { v: 3 }); }],
        [7.55, L => { L.sfx('hitBlunt', 0.6, 0.8); }],
        [7.76, L => { L.disperse('k', cyan, 0.7); }],
        [8.6, L => { L.manifest('k', cyan, 0.6); L.sfx('iaiMark', 0.6, 1.1); }],
      ],
      each: (L, c) => {
        // The cut leaks light: a hit displaces a bearer's presence (canon: vitality is the will to remain).
        if (c > 5.0 && L.D.f % 7 === 0) { const J = L.joints('k'); L.debris(J.shoulder.x, J.shoulder.y + 10, 1, { v: 0.6, col: '#7fe6ff', kind: 'spark', r: 1.6, life: 22, g: 0.04, dir: 90, spread: 60 }); }
      },
    });
    // The dead, on file: each one a beat ahead of Kael.
    L.bearer('k', 2.62, 3.2, 0.42, 'hammer');
    L.bearer('k', 4.02, 4.45, 0.3, 'scythe');
    L.bearer('k', 5.86, 6.42, 0.22, 'spear');
  },
  tick: function (H) { FILM.tick(H); },
};
