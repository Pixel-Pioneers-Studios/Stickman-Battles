'use strict';
// Act 2, the domain. Sovereign raises his blade and expands Absolute Dominion (his domain in the game: red walls
// closing a corridor — "You fight where I allow"). Inside it he answers commitments Kael has not made yet (canon:
// DOMINATING): every attack runs into a guard that was already there. He pins the blade under his foot, throws Kael
// into his wall, breaks his guard, and drives him through the wall and off the edge of the roof (x 960).
module.exports = {
  arena: 'city', frames: 640, endC: 8.8,
  install: function (H) {
    const L = FILM, G = H.D.G;
    const red = '#ff3311', cyan = '#00d4ff', white = '#ffffff';
    const DX = 700;
    const walk = (t0, t1, n0) => { const o = []; for (let i = n0 || 0, t = t0; t < t1; i++, t += 0.42) o.push([t, i % 2 ? 'sovWalkB' : 'sovWalkA', 'sine']); return o; };
    const clang = (L, g, r) => {
      const a = L.tip('k'), b = L.tip('s'), x = (a.x + b.x + a.hand.x + b.hand.x) / 4, y = (a.y + b.y + a.hand.y + b.hand.y) / 4;
      L.sfx('clang', g, r); L.sfx('parry', 0.4 * g, r * 1.2); L.shake(10);
      L.burst(x, y, 16); L.ring(x, y, 40, { col: '#fff4c0', w: 3, life: 14 }); L.streaks(x, y, 8, 30, { col: '#ffd890', life: 10, w: 1.6 });
    };
    L.setup(H, {
      tempo: 0.92, domX: DX,
      dominion: [[0, 900, 0], [1.5, 900, 0], [1.9, 300, 1, 'xout'], [5.0, 212, 1, 'sine'], [8.8, 212, 1]],
      speed: [[0, 1], [1.5, 1], [1.52, 0.3, 'xout'], [1.8, 1, 'in'], [6.62, 1], [6.64, 0.12, 'xout'], [6.9, 0.12], [7.2, 1, 'in']],
      actors: {
        k: {
          beats: [[0, 'kneelLook'], [0.5, 'crouch', 'io'], [1.1, 'guard', 'io'], [2.3, 'guard'],
            [2.45, 'iaido', 'xout'], [2.58, 'lunge', 'xout'], [2.64, 'clash', 'xout', { rFore: -73 }], [2.7, 'clash', 'lin', { rFore: -73 }], [2.84, 'hitBack', 'xout'], [2.95, 'crouch', 'io'],
            [3.1, 'airHigh', 'out'], [3.24, 'airCut', 'in'], [3.32, 'airCut'], [3.45, 'tuck', 'xout', { rot: -180 }], [3.7, 'crouchLand', 'in', { rot: -360 }],
            [3.9, 'sweepLow', 'xout', { rot: -360 }], [4.05, 'sweepLow', 'lin', { rot: -360 }], [4.33, 'sweepLow', 'lin', { rot: -360, torso: 50 }],
            [4.38, 'flyBack', 'xout', { rot: -360 }], [4.6, 'hitBack', 'in', { rot: -360 }], [4.75, 'kneel', 'xout', { rot: -360 }],
            [5.2, 'guard', 'io', { rot: -360 }], [5.45, 'block', 'xout', { rot: -360 }], [5.62, 'blockHigh', 'xout', { rot: -360 }], [5.82, 'block', 'xout', { rot: -360 }],
            [6.02, 'blockHigh', 'xout', { rot: -360 }], [6.12, 'hitBack', 'xout', { rot: -360 }], [6.32, 'hitBack', 'lin', { rot: -360, torso: -36 }],
            [6.64, 'flyBack', 'xout', { rot: -380 }], [7.3, 'flyBack', 'lin', { rot: -560 }], [8.8, 'flyBack', 'lin', { rot: -800 }]],
          pos: [[0, 600, 0], [1.1, 610, 0], [2.3, 710, 0, 'out'], [2.45, 710, 0], [2.6, 662, 0, 'xout'], [2.64, 660, 0], [2.7, 662, 0], [2.84, 694, 0, 'xout'], [2.95, 694, 0],
            [3.1, 600, 70, 'out'], [3.24, 520, 104, 'io'], [3.32, 500, 60, 'in'], [3.45, 560, 120, 'out'], [3.7, 700, 0, 'in'],
            [3.9, 662, 0, 'xout'], [4.33, 662, 0], [4.45, 800, 50, 'out'], [4.6, 900, 10, 'in'], [4.75, 900, 0, 'in'],
            [5.2, 896, 0], [6.32, 898, 0], [6.64, 900, 0], [6.9, 960, 30, 'out'], [7.3, 1040, -40, 'lin'], [8.8, 1150, -420, 'in']],
          face: [[0, -1], [3.2, 1], [3.5, -1]],
          weapon: [[0, true], [6.06, false]],
          trail: [[2.45, 2.62, 5, 0.015, 0.5], [3.05, 3.7, 4, 0.03, 0.35], [4.32, 4.62, 5, 0.03, 0.4], [6.64, 7.3, 6, 0.03, 0.4]],
          aura: [[0, 0.2], [2.3, 0.45], [4.6, 0.1]],
          expr: [[0, 'angry'], [4.36, 'hurt'], [5.2, 'angry'], [6.12, 'hurt']],
        },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: walk(0, 0.9, 1).concat([[1.0, 'sovReady', 'io'], [1.25, 'sovRaise', 'out'], [1.5, 'sovRaise', 'lin', { headTilt: -14 }], [2.0, 'sovReady', 'io'],
            // Already there: the guard is up before Kael moves.
            [2.32, 'block', 'xout'], [2.75, 'block'], [2.9, 'sovReady', 'io'],
            [3.0, 'sovReady'], [3.08, 'blockHigh', 'xout'], [3.4, 'blockHigh'], [3.5, 'slashOut', 'xout'], [3.65, 'sovReady', 'io'],
            // The stomp on the blade, the hilt to the face.
            [3.88, 'walkA', 'xout', { lLeg: 64, lShin: 96, rArm: 116, rFore: 132, hipDrop: 6 }], [4.22, 'walkA', 'lin', { lLeg: 64, lShin: 96, rArm: 116, rFore: 132, hipDrop: 6 }],
            [4.32, 'sovPalm', 'xout'], [4.6, 'sovPalm'], [4.8, 'sovReady', 'io']]).concat(walk(4.85, 5.4)).concat([
            // The flurry, and the guard breaks.
            [5.4, 'windBack', 'xout'], [5.45, 'slashOut', 'xout'], [5.55, 'highGuard', 'out'], [5.62, 'cutDown', 'xout'], [5.72, 'windBack', 'out'],
            [5.82, 'slashOut', 'xout'], [5.92, 'highGuard', 'out'], [6.02, 'cutDown', 'xout'], [6.06, 'cutDown'], [6.12, 'upperCut', 'xout'], [6.4, 'upperCut'],
            // Through the wall: he has no blade left to answer, so a kick does it.
            [6.52, 'sovReady', 'io'], [6.64, 'sovKick', 'xout'], [7.2, 'sovKick'], [7.6, 'sovReady', 'io']]).concat(walk(7.7, 8.8)),
          pos: [[0, 340, 0], [0.9, 470, 0, 'lin'], [2.2, 470, 0], [2.32, 556, 0, 'xout'], [2.9, 556, 0], [3.08, 560, 0], [3.65, 560, 0],
            [3.88, 596, 0, 'xout'], [4.85, 596, 0], [5.4, 755, 0, 'lin'], [6.52, 759, 0], [6.64, 862, 0, 'xout'], [7.7, 862, 0], [8.8, 930, 0, 'lin']],
          face: [[0, 1], [3.04, -1], [3.6, 1]],
          trail: [[2.24, 2.34, 5, 0.012, 0.45], [3.82, 3.9, 4, 0.012, 0.4], [6.56, 6.66, 5, 0.012, 0.5]],
          aura: [[0, 0.3], [1.2, 0.3], [1.5, 1.0], [2.4, 0.45]],
          auraColor: red,
          glowK: [[0, 0], [1.4, 0], [1.55, 0.9], [2.4, 0.3]],
        },
      },
      cam: [
        [0, 470, 64, 2.1], [1.2, 450, 70, 2.0, 'sine'],
        [1.25, 430, 56, 3.2, 'hold'], [1.5, 430, 60, 3.4, 'sine'],
        [1.51, 680, 120, 1.5, 'hold'], [2.0, 660, 96, 1.65, 'out'],
        [2.3, 650, 70, 2.3, 'sine'], [2.7, 628, 66, 2.6, 'sine'], [3.0, 590, 86, 2.15, 'sine'], [3.5, 610, 90, 2.1, 'sine'],
        [3.9, 630, 64, 2.6, 'sine'], [4.25, 628, 60, 2.9, 'sine'], [4.4, 760, 70, 2.1, 'out'], [4.8, 860, 64, 2.4, 'sine'],
        [5.4, 868, 62, 2.7, 'sine'], [6.1, 872, 62, 2.9, 'sine'],
        [6.64, 900, 60, 3.1, 'xout'], [6.9, 930, 50, 2.6, 'sine'], [7.4, 990, 0, 2.0, 'out'], [8.0, 980, 20, 1.9, 'sine'], [8.8, 980, -40, 1.8, 'sine'],
      ],
      ev: [
        [0.1, L => { L.sfx('stingLow', 0.5, 0.7); }],
        [1.26, L => { L.sfx('superActivate', 0.8, 0.6); L.surge('s', red, 1.6); }],
        // DOMAIN EXPANSION.
        [1.52, L => {
          L.impact(3, { tint: '#ff3311' }); L.shake(34); L.flash(red, 0.4, 14);
          L.sfx('explosion', 1, 0.6); L.sfx('stingImpact', 1, 0.5); L.sfx('heavyHit', 1, 0.5);
          const J = L.joints('s'); L.ring(J.hip.x, J.hip.y, 340, { col: red, w: 10, life: 50 }); L.ring(J.hip.x, G, 400, { sq: 0.15, col: red, w: 8, life: 50 });
          L.lines(40, { col: '#ff9080', n: 60, cx: 0.45, cy: 0.55 });
        }],
        [1.9, L => { L.sfx('landHard', 1, 0.6); L.shake(20); L.dust(DX - 300, 10, 40); L.dust(DX + 300, 10, 40); }],
        // 1. Into a guard that was already up.
        [2.24, L => { L.sfx('swingLight', 0.6, 0.9); }],
        [2.45, L => { L.sfx('iaiMark', 0.7, 1.1); }],
        [2.64, L => { clang(L, 1.1, 0.9); L.shake(14); }],
        // 2. Over him; he has already turned.
        [3.08, L => { L.sfx('jump', 0.6); }],
        [3.3, L => { clang(L, 1.0, 1.1); }],
        [3.5, L => { L.sfx('swingHeavy', 0.8, 1.0); L.slash(L.joints('s').shoulder.x, G - 70, 60, 300, 160, { sq: 0.4, col: red, w: 12, life: 12 }); }],
        [3.7, L => { L.sfx('land', 0.7); L.dust(700, 8, 50); }],
        // 3. The stomp. The hilt.
        [3.92, L => { L.sfx('swing2', 0.7, 1.0); }],
        [4.06, L => { L.sfx('clang', 0.9, 0.6); L.sfx('hitBlunt', 0.8, 0.8); L.shake(12); const fx = L.joints('s').lFoot.x; L.crack(fx, 30, { col: red, life: 200 }); L.debris(fx, G - 2, 10, { v: 3, kind: 'spark', col: '#ffb070', r: 2, life: 18, g: 0.2 }); }],
        [4.32, L => { L.sfx('heavyHit', 1, 0.8); L.shake(18); L.impact(2); const h = L.joints('s').lHand; L.ring(h.x, h.y, 80, { col: red, w: 6, life: 22 }); L.streaks(h.x, h.y, 16, 80, { col: '#ffb09a', dir: 0, spread: 60, life: 16 }); }],
        // Into his wall.
        [4.6, L => {
          L.sfx('heavyHit2', 1, 0.7); L.sfx('hitZap', 0.8, 0.6); L.shake(20); L.flash(red, 0.2, 8);
          const x = DX + 212; L.add({ t: 'draw', life: 40, fn: (c, k) => { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - k; c.strokeStyle = '#ffb090'; c.shadowColor = red; c.shadowBlur = 20; c.lineWidth = 3;
            for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(x, G - 50); c.lineTo(x + Math.cos(i * 0.9) * 26 * (0.5 + k), G - 50 + Math.sin(i * 0.9) * 40 * (0.5 + k)); c.stroke(); } } });
          L.debris(x, G - 50, 16, { v: 4, kind: 'spark', col: '#ff7040', r: 2, life: 20, g: 0.15, dir: 180, spread: 120 });
        }],
        // The flurry.
        [5.45, L => clang(L, 1.0, 1.0)], [5.62, L => clang(L, 1.1, 0.9)], [5.82, L => clang(L, 1.0, 1.05)],
        // The guard breaks: the blade is struck out of the pattern and goes back to light.
        [6.03, L => { clang(L, 1.3, 0.7); L.impact(2); L.shake(22); L.disperse('k', cyan, 1.0); L.sfx('soulRip', 0.6, 1.0); }],
        [6.12, L => { L.sfx('hitSlash', 1.1, 0.8); const J = L.joints('k'); L.slash(J.shoulder.x, J.shoulder.y, 46, 120, -60, { sq: 0.5, col: red, w: 14, life: 16 }); L.burst(J.shoulder.x, J.shoulder.y, 20, '#9feaff'); }],
        // Through the wall, off the roof.
        [6.52, L => { L.surge('s', red, 1.2); L.sfx('superActivate', 0.7, 0.6); }],
        [6.64, L => {
          L.sfx('heavyHit', 1.3, 0.55); L.sfx('explosion', 1, 0.9); L.sfx('stingImpact', 1, 0.55);
          L.impact(3, { tint: '#ff3311' }); L.shake(30);
          const x = DX + 212; L.ring(x, G - 50, 160, { col: red, w: 10, life: 34 }); L.streaks(x, G - 50, 34, 160, { col: '#ffb09a', dir: 0, spread: 90, life: 24, w: 2.6 });
          L.debris(x, G - 50, 30, { v: 7, col: '#3a0a08', r: 4, dir: 0, spread: 90, g: 0.25 });
          L.lines(30, { dir: 0, n: 50, col: '#ffd0c0' });
        }],
        [7.6, L => { L.sfx('stingLow', 0.7, 0.6); }],
      ],
      each: (L, c) => {
        if (c > 6.12 && c < 7.3 && L.D.f % 5 === 0) { const J = L.joints('k'); L.debris(J.shoulder.x, J.shoulder.y + 10, 1, { v: 0.8, col: '#7fe6ff', kind: 'spark', r: 1.8, life: 22, g: 0.04, dir: 180, spread: 60 }); }
        if (c > 5.4 && c < 6.6 && L.D.f % 4 === 0) L.debris(DX + 212, G - 20 - Math.random() * 80, 1, { v: 1, kind: 'spark', col: '#ff5533', r: 1.6, life: 14, g: 0.05, dir: 180, spread: 90 });
      },
    });
    // His reads: the dash, the leap, the sweep.
    L.ghost('k', 2.12, 2.44, 0.3);
    L.ghost('k', 2.85, 3.08, 0.25);
    L.ghost('k', 3.62, 3.88, 0.25);
  },
  tick: function (H) { FILM.tick(H); },
};
