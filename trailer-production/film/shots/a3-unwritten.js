'use strict';
// Act 3, not in the file. Kael fights as himself (canon: the one thing forty-five thousand years of records cannot
// contain is a being acting against its own record). Each red read shows what one of the ninety-four would have
// done; Kael does something else and the read breaks. Sovereign expands Absolute Dominion again; Kael answers
// with his own domain, Death's Dojo, and the ring drives the walls back. His blade forms mid-swing, and the cuts
// that land wait in the air (the dojo's rule: every cut waits).
module.exports = {
  arena: 'city', frames: 600, endC: 7.0,
  install: function (H) {
    const L = FILM, G = H.D.G;
    const red = '#ff3311', cyan = '#00d4ff', pale = '#ccccff', white = '#ffffff';
    const clang = (L, g, r) => {
      const a = L.tip('k'), b = L.tip('s'), x = (a.x + b.x + a.hand.x + b.hand.x) / 4, y = (a.y + b.y + a.hand.y + b.hand.y) / 4;
      L.sfx('clang', g, r); L.sfx('parry', 0.4 * g, r * 1.2); L.shake(10);
      L.burst(x, y, 16); L.ring(x, y, 40, { col: '#fff4c0', w: 3, life: 14 }); L.streaks(x, y, 8, 30, { col: '#ffd890', life: 10, w: 1.6 });
    };
    // A cut from the air stopped on his raised blade (his high block angled up into it, above his head).
    const KS = { rFore: -6, rArm: -10 }, SB = { rFore: -64 };
    const mark = (L, joint, ang, len) => {
      const J = L.joints('s'), p = J[joint];
      L.cutMark(p.x, p.y, ang, len, 's', joint); L.sfx('hitSlash', 1, 1.1); L.sfx('iaiMark', 0.6, 1.3); L.shake(10);
      L.streaks(p.x, p.y, 10, 40, { col: '#e6e6ff', life: 12, w: 1.8 });
    };
    L.setup(H, {
      tempo: 0.92, vignette: 0.6, domX: 550, dojoX: 520,
      backdrop: (c, L) => { L.paintCity(c, { street: G, left: 120, right: 850, leftTop: G - 1600, rightTop: G - 1500 }); crater(c); },
      dominion: [[0, 900, 0], [3.4, 900, 0], [3.65, 230, 1, 'xout'], [3.95, 230, 1], [4.3, 430, 0.35, 'xout'], [7.0, 440, 0.3]],
      dojo: [[0, 0, 0], [3.9, 0, 0], [4.25, 300, 1, 'xout'], [7.0, 300, 1]],
      speed: [[0, 1], [1.28, 1], [1.3, 0.25, 'xout'], [1.4, 1, 'in'], [2.23, 1], [2.25, 0.2, 'xout'], [2.4, 1, 'in'], [3.94, 1], [3.96, 0.2, 'xout'], [4.2, 1, 'in']],
      actors: {
        k: {
          beats: [[0, 'openHand'], [0.85, 'openHand'],
            // Under the blade he was expected to block.
            [0.95, 'sweepLow', 'xout', { lArm: 120, lFore: 140 }], [1.1, 'sweepLow', 'lin', { lArm: 120, lFore: 140 }], [1.18, 'crouch', 'io'], [1.3, 'elbow', 'xout'], [1.5, 'elbow'],
            [1.65, 'openHand', 'io'],
            // Onto the blade he was expected to duck.
            [1.82, 'crouch', 'xout'], [1.92, 'crouch', 'lin', { hipDrop: 30 }], [2.05, 'tuck', 'out'], [2.25, 'heelKick', 'xout'], [2.4, 'heelKick'], [2.5, 'crouchLand', 'in'],
            [2.8, 'openHand', 'io'],
            [3.7, 'openHand'], [3.9, 'palmK', 'xout'], [4.3, 'palmK'],
            // The blade forms mid-swing.
            [4.4, 'windBack', 'io'], [4.55, 'slashOut', 'xout'], [4.7, 'guard', 'io'], [4.85, 'slashOut', 'xout', { rot: 0 }], [4.95, 'follow', 'out'],
            [5.1, 'guard', 'io'], [5.2, 'block', 'xout'], [5.32, 'guard', 'io'], [5.45, 'upperCut', 'xout'], [5.62, 'highGuard', 'out'], [5.8, 'cutStop', 'xout', KS], [5.86, 'cutStop', 'lin', KS],
            [5.94, 'crouch', 'io'],
            // Over him, and the back of the knee.
            [6.05, 'tuck', 'out'], [6.2, 'crouchLand', 'in'], [6.28, 'sweepLow', 'xout'], [6.4, 'sweepLow'], [6.62, 'iaido', 'io'], [7.0, 'iaido', 'lin', { headTilt: 4 }]],
          pos: [[0, 480, 0], [0.85, 480, 0], [1.05, 340, 0, 'xout'], [1.18, 330, 0], [1.3, 440, 0, 'xout'], [1.5, 446, 0], [1.65, 450, 0],
            [1.82, 466, 0], [1.9, 470, 54, 'xout'], [1.98, 474, 54], [2.1, 492, 92, 'out'], [2.25, 506, 82, 'out'], [2.5, 498, 0, 'in'], [2.8, 494, 0],
            [3.7, 494, 0], [4.3, 494, 0], [4.55, 520, 0, 'xout'], [4.85, 650, 0, 'xout'], [4.95, 660, 0], [5.1, 650, 0],
            [5.45, 630, 0, 'xout'], [5.8, 624, 66, 'out'], [5.86, 624, 62], [5.94, 630, 0, 'in'], [6.05, 560, 104, 'out'], [6.2, 486, 0, 'in'], [6.28, 492, 0, 'xout'], [6.4, 494, 0], [6.62, 430, 0, 'io'], [7.0, 430, 0]],
          face: [[0, -1], [1.05, 1], [4.86, -1], [6.12, 1]],
          weapon: [[0, false], [4.42, true]],
          wAlphaK: [[0, 0], [4.42, 0], [4.55, 1, 'out']],
          eyes: [[0, 0.9]],
          aura: [[0, 0.45], [3.85, 0.45], [4.0, 1.0], [4.6, 0.55]],
          trail: [[0.9, 1.1, 5, 0.02, 0.45], [1.2, 1.32, 4, 0.02, 0.4], [1.9, 2.3, 4, 0.03, 0.35], [4.75, 4.9, 6, 0.012, 0.55], [5.95, 6.22, 4, 0.03, 0.35]],
          expr: [[0, 'intense']],
          arcColor: pale,
        },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: [[0, 'sovReady'], [0.82, 'sovReady'], [0.9, 'lunge', 'xout'], [1.02, 'slashOut', 'xout'], [1.28, 'slashOut'],
            [1.32, 'skid', 'xout', { torso: 40, headTilt: 20 }], [1.55, 'skid', 'lin', { torso: 30 }], [1.62, 'sovReady', 'io'],
            [1.7, 'windBack', 'out'], [1.86, 'sweepLow', 'xout', { rot: 0 }], [2.0, 'sweepLow'], [2.1, 'sovReady', 'io'],
            [2.25, 'hitBack', 'xout', { headTilt: -40 }], [2.6, 'skid', 'out'], [2.95, 'sovReady', 'io'],
            [3.2, 'sovReady'], [3.38, 'sovRaise', 'out'], [3.7, 'sovRaise'], [3.96, 'hitBack', 'xout'], [4.25, 'sovReady', 'io'],
            [4.45, 'block', 'xout'], [4.6, 'block'], [4.8, 'sovReady', 'io'], [4.86, 'hitBack', 'xout', { torso: -10 }], [5.0, 'sovReady', 'io'],
            [5.1, 'windBack', 'out'], [5.2, 'slashOut', 'xout'], [5.3, 'sovReady', 'io'], [5.46, 'hitBack', 'xout'], [5.62, 'sovReady', 'io'],
            [5.75, 'blockHigh', 'xout', SB], [5.85, 'blockHigh', 'lin', SB], [6.05, 'sovReady', 'io'],
            // Cut from behind: thrown forward, then he turns.
            [6.28, 'skid', 'xout', { torso: 40, headTilt: 20 }], [6.5, 'skid', 'lin', { torso: 30 }], [6.66, 'guard', 'io'], [7.0, 'guard']],
          pos: [[0, 286, 0], [0.82, 286, 0], [1.02, 470, 0, 'xout'], [1.28, 474, 0], [1.32, 540, 0, 'xout'], [1.6, 548, 0],
            [2.1, 548, 0], [2.25, 556, 0], [2.6, 620, 0, 'xout'], [2.95, 624, 0], [3.95, 624, 0], [4.1, 640, 0, 'xout'], [4.45, 600, 0, 'out'],
            [4.86, 604, 0], [5.0, 592, 0], [5.46, 548, 0], [5.62, 548, 0], [6.28, 546, 0], [6.5, 652, 0, 'xout'], [7.0, 664, 0]],
          face: [[0, 1], [1.6, -1], [4.86, 1], [6.58, -1]],
          trail: [[0.86, 1.05, 6, 0.015, 0.5]],
          aura: [[0, 0.45], [3.3, 0.45], [3.5, 1.0], [3.96, 0.5]],
          auraColor: red,
          eyes: [[0, 0.6], [2.5, 0.9]],
        },
      },
      cam: [
        [0, 383, 66, 2.3], [0.8, 386, 66, 2.4, 'sine'], [1.05, 420, 68, 2.4, 'out'], [1.3, 470, 66, 2.6, 'out'], [1.6, 500, 70, 2.5, 'sine'],
        [2.0, 512, 86, 2.4, 'sine'], [2.3, 540, 80, 2.6, 'out'], [2.8, 560, 70, 2.2, 'sine'],
        [3.3, 560, 76, 2.0, 'sine'], [3.6, 556, 100, 1.55, 'xout'], [4.3, 560, 90, 1.65, 'sine'],
        [4.5, 560, 70, 2.3, 'out'], [5.0, 620, 68, 2.4, 'sine'], [5.6, 580, 70, 2.4, 'sine'], [6.1, 560, 84, 2.1, 'sine'], [7.0, 545, 64, 2.1, 'sine'],
      ],
      ev: [
        [0.1, L => { L.sfx('stingLow', 0.5, 0.9); }],
        [0.88, L => { L.sfx('swing', 1, 1.1); }],
        [0.98, L => { L.shatter('k', 'block', 470 - L.joints('k').hip.x); L.sfx('hitZap', 0.7, 0.7); L.slash(470, G - 64, 56, 200, 330, { sq: 0.35, col: red, w: 12, life: 12 }); }],
        [1.3, L => {
          L.sfx('heavyHit', 1.1, 0.85); L.sfx('hitBlunt', 0.8, 0.9); L.shake(18); L.impact(2, { tint: '#9ad8ff' });
          const p = L.joints('k').lElbow; L.ring(p.x, p.y, 90, { col: cyan, w: 6, life: 22 }); L.streaks(p.x, p.y, 18, 80, { col: '#cfefff', dir: 0, spread: 70, life: 16 });
        }],
        [1.72, L => { L.sfx('swing3', 1, 0.9); }],
        [1.88, L => { L.shatter('k', 'crouch', 0); L.sfx('hitZap', 0.7, 0.75); L.sfx('clang', 0.6, 1.4); L.slash(510, G - 30, 70, 200, 340, { sq: 0.2, col: red, w: 10, life: 12 }); }],
        [2.25, L => {
          L.sfx('heavyHit', 1.2, 0.8); L.sfx('hitSnap', 0.8, 0.8); L.shake(22); L.impact(2, { tint: '#9ad8ff' });
          const f = L.joints('k').lFoot; L.ring(f.x, f.y, 110, { col: cyan, w: 7, life: 24 }); L.streaks(f.x, f.y, 22, 100, { col: '#cfefff', dir: 0, spread: 80, life: 18 });
        }],
        [2.5, L => { L.sfx('land', 0.8); L.dust(498, 8, 60); L.catalogue('k', 1.1, { expand: true }); L.sfx('soulRip', 0.4, 1.4); }],
        // Absolute Dominion, again.
        [3.4, L => { L.surge('s', red, 1.5); L.sfx('superActivate', 0.8, 0.55); }],
        [3.65, L => { L.impact(2, { tint: '#ff3311' }); L.shake(30); L.sfx('explosion', 1, 0.6); L.sfx('heavyHit', 1, 0.5); L.flash(red, 0.3, 12); }],
        // Death's Dojo.
        [3.9, L => { L.surge('k', pale, 1.6); L.sfx('superActivate', 0.8, 1.0); L.sfx('iaiMark', 1, 0.7); }],
        [3.96, L => {
          L.impact(3, { tint: '#ccccff' }); L.shake(32); L.sfx('explosion', 1, 0.8); L.sfx('stingImpact', 1, 0.8);
          L.ring(520, G, 320, { sq: 0.12, col: pale, w: 10, life: 40 }); L.ring(520, G - 60, 260, { col: pale, w: 6, life: 34 });
          L.lines(36, { n: 60, col: '#e6e6ff' });
          // Where the ring meets his walls, they break.
          for (const wx of [550 - 230, 550 + 230]) L.debris(wx, G - 120, 40, { v: 6, col: '#7a1206', r: 4, spread: 360, g: 0.2, life: 70 });
        }],
        // The blade, already swinging when it arrives.
        [4.42, L => { L.manifest('k', pale, 0.25); L.sfx('phaseUp', 0.5, 1.4); }],
        [4.55, L => clang(L, 1.1, 1.0)],
        [4.7, L => { L.sfx('swing3', 1, 1.1); }],
        [4.86, L => mark(L, 'hip', -30, 46)],
        [5.2, L => clang(L, 1.0, 0.95)],
        [5.46, L => mark(L, 'shoulder', 60, 40)],
        [5.82, L => clang(L, 1.1, 0.9)], [5.94, L => { L.sfx('land', 0.5); L.dust(630, 6, 40); }],
        [6.29, L => mark(L, 'rKnee', 10, 36)],
        [5.93, L => { L.sfx('jump', 0.6); }], [6.2, L => { L.sfx('land', 0.6); L.dust(486, 6, 40); }],
        [6.6, L => { L.sfx('iaiMark', 1, 0.8); L.sfx('stingRise', 0.8, 0.8); }],
      ],
    });
    function crater(c) {
      c.fillStyle = '#0c0c14'; c.beginPath(); c.ellipse(480, G + 3, 110, 16, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#3a3a50'; c.lineWidth = 3; c.beginPath(); c.ellipse(480, G + 3, 110, 16, 0, Math.PI, 0); c.stroke();
    }
    // His reads: what the ninety-four would have done.
    L.ghostPose('k', 0.6, 0.98, 'block', { dx: 0 });
    L.ghostPose('k', 1.6, 1.88, 'crouch', { dx: 0 });
    L.ghostPose('k', 4.65, 4.86, 'thrust', { dx: -10 });
  },
  tick: function (H) { FILM.tick(H); },
};
