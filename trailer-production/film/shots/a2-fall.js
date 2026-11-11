'use strict';
// Act 2, the fall. Down the alley between two towers. Sovereign steps off the roof after him. Kael's blade comes
// back to his hand mid-air; they fight falling, kicking off the window ledges, until Sovereign gets above him
// and drives him into the street.
//
// Positions are authored relative to a frame that drops by spec.fall (h is height in that frame), so the fight is
// staged like any other and the alley streams past.
module.exports = {
  arena: 'city', frames: 620, endC: 7.8,
  install: function (H) {
    const L = FILM, G = H.D.G;
    const red = '#ff3311', cyan = '#00d4ff', white = '#ffffff';
    const STREET = G + 2600, SPIKE = 5.85;
    // The frame's drop: a step, then accelerating, then a steady fall; it stops when Kael hits the street.
    const fallAt = c => c < 0.5 ? 30 * Math.pow(c / 0.5, 3) : c < 1.6 ? 30 + 390 * Math.pow((c - 0.5) / 1.1, 2) : 420 + 403 * (c - 1.6);
    const FALL = []; for (let c = 0; c <= SPIKE + 0.001; c += 0.05) FALL.push([+c.toFixed(2), fallAt(c), 'lin']);
    FALL.push([9, fallAt(SPIKE)]);
    const ROAD = fallAt(SPIKE) - 2600;   // Kael's height in the frame when he is on the street
    const clang = (L, g, r) => {
      const a = L.tip('k'), b = L.tip('s'), x = (a.x + b.x + a.hand.x + b.hand.x) / 4, y = (a.y + b.y + a.hand.y + b.hand.y) / 4;
      L.sfx('clang', g, r); L.sfx('parry', 0.4 * g, r * 1.2); L.shake(10);
      L.burst(x, y, 16); L.ring(x, y, 40, { col: '#fff4c0', w: 3, life: 14 }); L.streaks(x, y, 8, 30, { col: '#ffd890', life: 10, w: 1.6 });
    };
    L.setup(H, {
      tempo: 0.92, fall: FALL, vignette: 0.6,
      backdrop: (c, L) => {
        L.paintCity(c, { street: STREET, left: 960, right: 1330, leftTop: G, rightTop: G - 280, rainStretch: 16 });
        // The crater, under the bodies (he lies in it).
        if (L.D.c >= SPIKE) {
          const x = 1160, y = STREET, g2 = Math.min(1, (L.D.c - SPIKE) * 60 / 5);
          c.fillStyle = '#0c0c14'; c.beginPath(); c.ellipse(x, y + 3, 110 * g2, 16 * g2, 0, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#3a3a50'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y + 3, 110 * g2, 16 * g2, 0, Math.PI, 0); c.stroke();
          c.strokeStyle = 'rgba(0,212,255,0.5)'; c.lineWidth = 1.6;
          for (let i = 0; i < 9; i++) { const an = Math.PI * (0.05 + i * 0.11); c.beginPath(); c.moveTo(x + Math.cos(an) * 110 * g2, y + 3); c.lineTo(x + Math.cos(an) * 170 * g2, y + 3 + (i % 2 ? 2 : -1)); c.stroke(); }
        }
      },
      speed: [[0, 1], [3.73, 1], [3.75, 0.18, 'xout'], [3.95, 0.18], [4.2, 1, 'in'], [SPIKE - 0.02, 1], [SPIKE, 0.2, 'xout'], [SPIKE + 0.15, 0.2], [SPIKE + 0.45, 1, 'in']],
      actors: {
        k: {
          beats: [[0, 'flyBack', 'lin', { rot: -200 }], [0.6, 'flyBack', 'lin', { rot: -420 }], [1.0, 'tuck', 'out', { rot: -360 }], [1.4, 'airHigh', 'io', { rot: -360 }],
            [1.7, 'airHigh', 'lin', { rot: -360 }], [1.8, 'blockHigh', 'xout', { rot: -330 }], [2.05, 'tuck', 'out', { rot: -300 }],
            // The ledge on the far tower, and the strike.
            [2.3, 'crouch', 'out', { rot: -270 }], [2.4, 'crouch', 'lin', { rot: -270 }], [2.5, 'airHigh', 'xout', { rot: -360 }], [2.62, 'airCut', 'xout', { rot: -360 }],
            // Over his spin.
            [2.85, 'tuck', 'out', { rot: -360 }], [3.1, 'tuck', 'lin', { rot: -720 }],
            // The near tower, and the clash.
            [3.4, 'crouch', 'out', { rot: -630 }], [3.5, 'crouch', 'lin', { rot: -630 }], [3.62, 'lunge', 'xout', { rot: -720 }], [3.75, 'clash', 'xout', { rot: -720, rFore: -76 }],
            [4.2, 'clash', 'lin', { rot: -720, rFore: -76 }],
            // The spiral.
            [4.3, 'windBack', 'out', { rot: -720 }], [4.4, 'slashOut', 'xout', { rot: -720 }], [4.55, 'highGuard', 'out', { rot: -720 }], [4.65, 'cutDown', 'xout', { rot: -720 }],
            [4.8, 'windBack', 'out', { rot: -720 }], [4.9, 'slashOut', 'xout', { rot: -720 }], [5.05, 'guard', 'out', { rot: -720 }], [5.15, 'thrust', 'xout', { rot: -720 }],
            // Under him. The block that becomes the spike.
            [5.3, 'blockHigh', 'out', { rot: -720 }], [5.6, 'blockHigh', 'lin', { rot: -720, hipDrop: 12 }], [5.67, 'blockHigh', 'lin', { rot: -720, hipDrop: 18 }], [5.74, 'flyBack', 'xout', { rot: -760 }],
            [SPIKE, 'fallen', 'xin', { rot: -808, rArm: 98, rFore: 62 }], [7.8, 'fallen', 'lin', { rot: -808, rArm: 98, rFore: 62 }]],
          pos: [[0, 990, -10], [0.6, 1060, -40], [1.0, 1100, -40, 'out'], [1.7, 1120, -10],
            [1.8, 1130, -16, 'xout'], [2.05, 1200, 10, 'out'], [2.3, 1312, 20, 'out'], [2.4, 1312, 20], [2.5, 1220, 40, 'xout'], [2.62, 1160, 30, 'xout'],
            [2.85, 1150, 80, 'out'], [3.1, 1060, 60], [3.4, 978, 30, 'out'], [3.5, 978, 30], [3.62, 1036, 30, 'xout'], [3.75, 1053, 28, 'xout'], [4.2, 1055, 22],
            [4.4, 1062, 40, 'xout'], [4.65, 1070, 10, 'xout'], [4.9, 1058, 30, 'xout'], [5.15, 1080, 0, 'xout'],
            [5.3, 1150, -10, 'out'], [5.6, 1152, -30], [5.67, 1152, -36], [5.74, 1156, -120, 'in'], [SPIKE, 1160, ROAD + 40, 'in'], [7.8, 1160, ROAD + 40]],
          face: [[0, 1], [1.0, -1], [2.48, -1], [3.48, 1], [5.25, -1]],
          weapon: [[0, false], [1.15, true], [SPIKE + 0.04, false]],
          wAlphaK: [[0, 0], [1.15, 0], [1.6, 1, 'in']],
          trail: [[2.45, 2.65, 4, 0.025, 0.4], [3.5, 3.76, 5, 0.02, 0.45], [5.7, SPIKE + 0.05, 8, 0.012, 0.55]],
          aura: [[0, 0], [1.2, 0.35], [3.7, 0.9], [4.2, 0.4], [SPIKE, 0]],
          expr: [[0, 'hurt'], [1.0, 'angry'], [5.7, 'hurt']],
        },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: [[0, 'sovWalkA'], [0.25, 'sovWalkB', 'sine'], [0.5, 'sovReady', 'sine'],
            // The dive: head first, blade first.
            [0.7, 'thrust', 'out', { rot: 80 }], [1.7, 'thrust', 'lin', { rot: 70 }], [1.8, 'thrust', 'xout', { rot: 50 }], [2.05, 'tuck', 'out', { rot: 0 }],
            [2.4, 'sovReady', 'out'], [2.52, 'blockHigh', 'xout'], [2.7, 'blockHigh'],
            [2.78, 'windBack', 'out', { rot: 0 }], [2.95, 'slashOut', 'xout', { rot: 360 }], [3.3, 'sovReady', 'out', { rot: 360 }],
            [3.6, 'sovReady', 'lin', { rot: 360 }], [3.75, 'clash', 'xout', { rot: 360, rFore: -50 }], [4.2, 'clash', 'lin', { rot: 360, rFore: -50 }],
            [4.3, 'block', 'out', { rot: 360 }], [4.4, 'block', 'lin', { rot: 360 }], [4.55, 'blockHigh', 'out', { rot: 360 }], [4.65, 'blockHigh', 'lin', { rot: 360 }],
            [4.8, 'block', 'out', { rot: 360 }], [4.9, 'block', 'lin', { rot: 360 }], [5.05, 'sovLean', 'out', { rot: 360 }], [5.15, 'sovLean', 'lin', { rot: 360 }],
            // Above him.
            [5.3, 'highGuard', 'out', { rot: 360 }], [5.55, 'highGuard', 'lin', { rot: 360 }], [5.65, 'cutDown', 'xout', { rot: 360 }], [6.4, 'cutDown', 'lin', { rot: 360 }],
            [6.75, 'crouchLand', 'in', { rot: 360 }], [7.3, 'sovReady', 'io', { rot: 360 }], [7.8, 'sovReady', 'lin', { rot: 360 }]],
          pos: [[0, 900, 0], [0.5, 945, fallAt(0.5)], [0.55, 955, fallAt(0.55)], [1.0, 1000, 220, 'out'], [1.7, 1080, 60, 'in'],
            [1.8, 1100, 20, 'xout'], [2.05, 1090, -50, 'out'], [2.4, 1100, -40], [2.52, 1110, -40], [2.7, 1110, -46],
            [2.95, 1110, -20, 'out'], [3.3, 1130, -10], [3.6, 1164, 26], [3.75, 1161, 28, 'xout'], [4.2, 1163, 22],
            [4.4, 1166, 30, 'xout'], [4.65, 1172, 0, 'xout'], [4.9, 1160, 34, 'xout'], [5.15, 1178, 6, 'xout'],
            [5.3, 1150, 80, 'out'], [5.55, 1146, 90], [5.65, 1158, 52, 'xout'], [6.4, 1080, ROAD + 160, 'in'], [6.75, 1080, ROAD, 'in'], [7.8, 1080, ROAD]],
          face: [[0, 1], [3.3, -1], [6.5, 1]],
          trail: [[0.7, 1.75, 5, 0.03, 0.4], [5.65, 6.8, 4, 0.04, 0.3]],
          aura: [[0, 0.3], [0.6, 0.6], [3.7, 1.0], [4.2, 0.4], [5.3, 0.8], [6.0, 0.3]],
          auraColor: red,
        },
      },
      // Camera keys are in the falling frame too.
      cam: [
        [0, 960, 40, 2.2], [0.6, 1000, 0, 2.0, 'sine'], [1.2, 1080, 60, 1.75, 'sine'],
        [1.7, 1110, 30, 2.1, 'sine'], [2.3, 1180, 30, 1.9, 'sine'], [2.7, 1150, 20, 2.1, 'sine'],
        [3.2, 1080, 40, 1.9, 'sine'], [3.6, 1080, 40, 2.1, 'sine'], [3.75, 1107, 70, 2.3, 'xout'], [4.2, 1107, 68, 2.4, 'sine'],
        [4.4, 1115, 40, 2.35, 'xout'], [5.2, 1140, 44, 2.0, 'sine'], [5.55, 1150, 40, 1.75, 'sine'],
        [5.7, 1150, 0, 2.2, 'in'], [SPIKE, 1150, ROAD + 70, 1.8, 'in'], [6.6, 1130, ROAD + 90, 1.7, 'sine'], [7.8, 1120, ROAD + 70, 2.0, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('swingHeavy', 0.5, 0.6); }],
        [0.55, L => { L.sfx('swing', 0.8, 0.6); L.lines(60, { dir: -90, n: 40, col: '#c8d4ff' }); }],
        [1.15, L => { L.manifest('k', cyan, 0.5); L.sfx('phaseUp', 0.5, 1.0); }],
        [1.6, L => { L.lines(200, { dir: -90, n: 34, col: '#c8d4ff' }); }],
        [1.8, L => { clang(L, 1.1, 0.85); }],
        [2.3, L => {
          // The ledge: his feet hit the far tower; glass goes.
          L.sfx('landHard', 0.7, 1.1); L.sfx('hitSnap', 0.6, 1.2); L.shake(8);
          const J = L.joints('k'); L.debris(1330, J.hip.y, 18, { v: 4, col: '#bfe6ff', kind: 'spark', r: 2.4, life: 40, g: 0.2, dir: 180, spread: 120 });
        }],
        [2.62, L => { clang(L, 1.0, 1.05); }],
        [2.95, L => { L.sfx('swing3', 0.9, 0.9); const J = L.joints('s'); L.slash(J.hip.x, J.hip.y - 10, 70, 0, 360, { sq: 0.35, col: red, w: 12, life: 16 }); }],
        [3.4, L => { L.sfx('landHard', 0.7, 1.0); const J = L.joints('k'); L.debris(960, J.hip.y, 14, { v: 4, col: '#bfe6ff', kind: 'spark', r: 2.4, life: 40, g: 0.2, dir: 0, spread: 120 }); }],
        [3.75, L => {
          clang(L, 1.3, 0.75); L.sfx('heavyHit', 1, 0.7); L.sfx('stingImpact', 0.8, 0.8);
          L.impact(3, { tint: '#9ad8ff' }); L.shake(24); L.surge('k', cyan, 1.0); L.surge('s', red, 1.0);
          const a = L.tip('k'), b = L.tip('s'), x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
          L.ring(x, y, 150, { col: white, w: 8, life: 30 }); L.streaks(x, y, 30, 140, { col: '#d8eaff', life: 22, w: 2.2 });
        }],
        [4.4, L => clang(L, 1.0, 1.0)], [4.65, L => clang(L, 1.0, 1.1)], [4.9, L => clang(L, 1.0, 0.95)], [5.15, L => clang(L, 0.9, 1.15)],
        [5.3, L => { L.sfx('stingRise', 0.6, 0.9); L.surge('s', red, 0.9); }],
        [5.66, L => { clang(L, 1.3, 0.6); L.shake(20); L.lines(24, { dir: 90, n: 50, col: '#ffd0c0' }); L.sfx('swingHeavy', 1, 0.6); }],
        [SPIKE, L => {
          // The street.
          L.sfx('explosion', 1.2, 0.7); L.sfx('landHard', 1.2, 0.7); L.sfx('heavyHit', 1.2, 0.5); L.sfx('stingImpact', 1, 0.5);
          L.impact(3, { tint: '#9ad8ff' }); L.shake(38);
          L.disperse('k', cyan, 0.8);   // the blade goes back to light (it forms again in his hand in Act 3)
          const x = 1160, y = STREET;
          L.ring(x, y, 220, { sq: 0.16, col: cyan, w: 10, life: 40 }); L.ring(x, y - 20, 120, { col: white, w: 5, life: 26 });
          L.debris(x, y - 4, 40, { v: 9, spread: 130, col: '#2c2c3a', r: 5 });
          L.dust(x, 30, 320, { v: 6, life: 90, y, r: 16, a: 0.6, col: '#4a4858' });
          L.streaks(x, y - 10, 20, 100, { col: '#cfefff', dir: -90, spread: 140, life: 18, w: 2.4 });
        }],
        [6.75, L => { L.sfx('land', 0.8, 0.8); L.dust(1080, 8, 50, { y: STREET }); }],
        [7.2, L => { L.sfx('stingLow', 0.6, 0.6); }],
      ],
      each: (L, c) => {
        if (c > 0.6 && c < SPIKE && L.D.f % 18 === 0) L.lines(26, { dir: -90, n: 26, col: '#c8d4ff' });
      },
    });
    L.ghost('k', 2.12, 2.42, 0.25);
    L.ghost('k', 3.25, 3.52, 0.25);
  },
  tick: function (H) { FILM.tick(H); },
};
