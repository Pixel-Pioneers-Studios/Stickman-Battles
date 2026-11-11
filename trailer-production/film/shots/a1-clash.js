'use strict';
// Act 1, the first exchange. Both dash; the blades meet in slow motion. Kael throws five attacks and a red ghost
// shows each one before it comes: Sovereign leans, steps, blocks without looking, hops, then catches the fastest
// draw-cut between two fingers. One palm strike throws Kael across the roof. Sovereign walks after him.
module.exports = {
  arena: 'city', frames: 700, endC: 11.8,
  install: function (H) {
    const L = FILM, G = H.D.G;
    const red = '#ff3311', cyan = '#00d4ff', white = '#ffffff';
    // Kael's walk-in for the last beat: none; Sovereign's slow walk with the blade dragging.
    // Blades meeting: sparks where the two blades are, a clang.
    const clang = (L, g, r) => {
      const a = L.tip('k'), b = L.tip('s'), x = (a.x + b.x + a.hand.x + b.hand.x) / 4, y = (a.y + b.y + a.hand.y + b.hand.y) / 4;
      L.sfx('clang', g, r); L.sfx('parry', 0.4 * g, r * 1.2); L.shake(10);
      L.burst(x, y, 16); L.ring(x, y, 40, { col: '#fff4c0', w: 3, life: 14 }); L.streaks(x, y, 8, 30, { col: '#ffd890', life: 10, w: 1.6 });
    };
    // The bind: both blades raised so they cross in an X between the two of them.
    const KC = { rFore: -76 }, SC = { rFore: -50 };
    // The draw-cut arrives rising at his throat, its point in Sovereign's fingers.
    const KT = { rot: -360, rFore: -39 }, SK = { lArm: -10, lFore: -48 };
    // A cut from the air stopped on his raised blade; his high block angled up into it, above his head.
    const KS = { rFore: -6, rArm: -10 }, SB = { rFore: -64 };
    // Where the two blades cross (falls back to the midpoint between the hands).
    const bind = L => {
      const a = L.tip('k'), b = L.tip('s'), p = a.hand, q = b.hand, rx = a.x - p.x, ry = a.y - p.y, sx = b.x - q.x, sy = b.y - q.y;
      const d = rx * sy - ry * sx, t = d ? ((q.x - p.x) * sy - (q.y - p.y) * sx) / d : -1;
      return t >= 0 && t <= 1 ? { x: p.x + rx * t, y: p.y + ry * t } : { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    };
    const sovWalk = []; for (let i = 0, t = 9.3; t < 11.8; i++, t += 0.42) sovWalk.push([t, i % 2 ? 'sovWalkB' : 'sovWalkA', 'sine']);
    L.setup(H, {
      tempo: 0.92,
      speed: [[0, 1], [0.84, 1], [0.86, 0.15, 'xout'], [1.3, 0.15], [1.65, 1, 'in'],
        [2.92, 1], [2.98, 0.35, 'out'], [3.1, 1, 'in'],
        [7.19, 1], [7.2, 0.12, 'xout'], [7.4, 0.12], [7.65, 1, 'in'],
        [8.19, 1], [8.2, 0.14, 'xout'], [8.35, 0.14], [8.65, 1, 'in']],
      actors: {
        k: {
          beats: [[0, 'iaido'], [0.62, 'iaido'], [0.7, 'lunge', 'xout'], [0.84, 'lunge'], [0.86, 'clash', 'xout', KC], [1.85, 'clash', 'lin', Object.assign({}, KC, { torso: 30 })],
            // He answers: three cuts. Kael blocks two and vaults the third into a cut of his own.
            [2.0, 'guard', 'xout'], [2.15, 'guard'], [2.3, 'block', 'xout'], [2.44, 'block'], [2.54, 'blockHigh', 'out'], [2.66, 'blockHigh', 'lin', { hipDrop: 18 }],
            [2.76, 'crouch', 'io'], [2.88, 'tuck', 'out'], [3.02, 'airHigh', 'io'], [3.14, 'cutStop', 'in', KS], [3.2, 'cutStop', 'lin', KS], [3.32, 'guard', 'out'],
            [3.5, 'clash', 'out', KC], [3.85, 'clash', 'lin', Object.assign({}, KC, { torso: 32 })],
            [4.2, 'guard', 'xout'], [4.5, 'guard'], [4.62, 'windBack', 'out'], [4.78, 'slashOut', 'xout'], [4.95, 'slashOut'],
            [5.06, 'guard', 'io'], [5.2, 'thrust', 'xout'], [5.34, 'thrust'],
            [5.46, 'crouch', 'io'], [5.6, 'airHigh', 'out'], [5.78, 'cutStop', 'in', KS], [5.86, 'cutStop', 'lin', KS],
            [6.06, 'hitBack', 'xout'], [6.2, 'guard', 'io'],
            [6.3, 'windBack', 'out'], [6.34, 'windBack', 'lin', { rot: 0 }], [6.5, 'sweepLow', 'out', { rot: -360 }], [6.65, 'sweepLow', 'lin', { rot: -360 }],
            [6.82, 'iaido', 'io', { rot: -360 }], [7.14, 'iaido', 'lin', { rot: -360, headTilt: 0 }], [7.18, 'thrust', 'xout', KT], [8.05, 'thrust', 'lin', KT],
            [8.2, 'thrust', 'lin', KT], [8.25, 'flyBack', 'xout', { rot: -380 }], [8.7, 'flyBack', 'lin', { rot: -700 }], [8.82, 'crouchLand', 'xout', { rot: -720 }],
            [9.2, 'kneel', 'io', { rot: -720 }], [10.1, 'kneel', 'lin', { rot: -720 }], [10.6, 'kneelLook', 'io', { rot: -720 }], [11.8, 'kneelLook', 'lin', { rot: -720 }]],
          pos: [[0, 330, 0], [0.62, 330, 0], [0.84, 394, 0, 'xin'], [1.85, 396, 0], [2.0, 400, 0, 'xout'], [2.15, 400, 0], [2.38, 384, 0, 'xout'], [2.5, 384, 0], [2.66, 372, 0, 'xout'], [2.76, 372, 0],
            [2.88, 392, 40, 'out'], [3.02, 394, 86, 'out'], [3.14, 399, 70, 'in'], [3.2, 400, 66], [3.32, 404, 0, 'in'], [3.5, 398, 0, 'out'], [3.85, 396, 0], [4.2, 388, 0, 'xout'],
            [4.5, 392, 0], [4.78, 476, 0, 'xout'], [4.95, 478, 0], [5.06, 470, 0], [5.2, 500, 0, 'xout'], [5.34, 500, 0],
            [5.46, 492, 0], [5.6, 482, 92, 'out'], [5.78, 486, 72, 'in'], [5.86, 487, 66], [5.96, 490, 0, 'in'],
            [6.06, 474, 0, 'xout'], [6.2, 480, 0], [6.5, 524, 0, 'out'], [6.65, 524, 0],
            [6.82, 410, 0, 'xout'], [7.15, 410, 0], [7.19, 480, 0, 'xout'], [8.2, 480, 0],
            [8.4, 380, 64, 'out'], [8.7, 250, 10, 'in'], [8.82, 236, 0, 'in'], [9.2, 200, 0, 'xout'], [11.8, 200, 0]],
          face: [[0, 1]],
          trail: [[0.62, 0.86, 5, 0.03, 0.5], [4.6, 4.82, 3, 0.03, 0.4], [5.55, 5.92, 3, 0.03, 0.35], [6.3, 6.52, 4, 0.025, 0.45], [7.14, 7.28, 8, 0.012, 0.6], [8.2, 8.8, 5, 0.035, 0.4]],
          aura: [[0, 0.45], [6.8, 0.45], [7.1, 0.9], [7.25, 0.3], [8.2, 0], [9.2, 0], [11.8, 0.15]],
          glowK: [[0, 0.3], [6.8, 0.3], [7.14, 0.9], [7.4, 0.2], [8.2, 0]],
          expr: [[0, 'intense'], [7.25, 'neutral'], [8.2, 'hurt'], [10.6, 'angry']],
        },
        s: {
          scale: 1.08, z: 1,
          beats: [[0, 'sovReady'], [0.62, 'sovReady'], [0.7, 'lunge', 'xout'], [0.84, 'lunge'], [0.86, 'clash', 'xout', SC], [1.85, 'clash', 'lin', Object.assign({}, SC, { torso: 20 })],
            [2.0, 'sovReady', 'xout'], [2.15, 'sovReady'], [2.25, 'windBack', 'out'], [2.38, 'slashOut', 'xout'], [2.46, 'slashOut'],
            [2.52, 'highGuard', 'out'], [2.62, 'cutDown', 'xout'], [2.7, 'cutDown'], [2.8, 'guard', 'io'], [2.9, 'sweepLow', 'xout'], [3.04, 'sweepLow'],
            [3.12, 'blockHigh', 'out', SB], [3.22, 'blockHigh', 'lin', SB], [3.5, 'clash', 'out', SC], [3.85, 'clash', 'lin', Object.assign({}, SC, { torso: 22 })],
            [4.2, 'sovReady', 'xout'], [4.62, 'sovReady'], [4.7, 'sovLean', 'xout'], [5, 'sovLean'], [5.12, 'sovReady', 'io'],
            [5.15, 'sovReady'], [5.24, 'sovLean', 'xout', { torso: -16 }], [5.4, 'sovReady', 'io'],
            [5.64, 'sovReady'], [5.72, 'blockHigh', 'xout', Object.assign({ headTilt: 24 }, SB)], [6, 'blockHigh', 'lin', Object.assign({ headTilt: 24 }, SB)], [6.18, 'sovReady', 'io'],
            [6.36, 'sovReady'], [6.42, 'tuck', 'xout'], [6.56, 'tuck'], [6.66, 'sovReady', 'out'],
            [7.14, 'sovReady'], [7.19, 'sovCatch', 'xout', SK], [7.8, 'sovCatch', 'lin', SK], [7.95, 'sovCatch', 'io', Object.assign({ headTilt: 22, torso: 8 }, SK)],
            [8.08, 'sovCatch', 'lin', Object.assign({ headTilt: 22, torso: 8 }, SK)], [8.19, 'sovPalm', 'xout'], [8.8, 'sovPalm'], [9.15, 'sovReady', 'io']].concat(sovWalk),
          pos: [[0, 560, 0], [0.62, 560, 0], [0.84, 506, 0, 'xin'], [1.85, 504, 0], [2.0, 520, 0, 'xout'], [2.15, 520, 0], [2.38, 452, 0, 'xout'], [2.5, 452, 0], [2.62, 440, 0, 'xout'], [2.8, 440, 0],
            [2.9, 448, 0, 'xout'], [3.12, 476, 0, 'out'], [3.5, 502, 0, 'out'], [3.85, 504, 0], [4.2, 522, 0, 'xout'],
            [4.62, 522, 0], [4.7, 530, 0, 'xout'], [5.12, 530, 0], [5.15, 532, 0], [5.24, 566, 0, 'xout'], [5.64, 572, 0],
            [5.72, 576, 0], [6.36, 576, 0], [6.42, 590, 30, 'out'], [6.52, 600, 52, 'out'], [6.66, 612, 0, 'in'],
            [8.08, 612, 0], [8.19, 524, 0, 'xout'], [9.15, 524, 0], [9.3, 524, 0], [11.8, 420, 0, 'lin']],
          face: [[0, -1]],
          trail: [[0.62, 0.86, 5, 0.03, 0.45], [2.2, 2.4, 3, 0.03, 0.35], [8.08, 8.22, 6, 0.015, 0.55]],
          aura: [[0, 0.3], [7.15, 0.3], [7.2, 0.7], [7.7, 0.3], [8.1, 0.9], [8.6, 0.35]],
          auraColor: red,
          expr: [[0, 'neutral']],
        },
      },
      cam: [
        [0, 340, 52, 3.3], [0.49, 346, 54, 3.4, 'sine'],
        [0.5, 448, 70, 2.05, 'hold'], [0.84, 450, 66, 2.25, 'in'], [0.86, 450, 62, 3.0, 'xout'], [1.85, 450, 60, 3.35, 'sine'],
        [2.0, 440, 68, 2.6, 'xout'], [2.7, 420, 72, 2.55, 'sine'], [3.05, 430, 100, 1.95, 'sine'], [3.3, 436, 92, 2.05, 'sine'], [3.5, 452, 62, 3.0, 'xout'], [3.85, 455, 60, 3.2, 'sine'],
        [4.2, 455, 68, 2.4, 'xout'], [4.9, 505, 70, 2.5, 'sine'], [5.5, 520, 108, 1.85, 'sine'], [5.9, 528, 94, 2.0, 'sine'],
        [6.6, 548, 66, 2.45, 'sine'], [7.14, 520, 62, 2.3, 'sine'],
        [7.19, 560, 70, 3.4, 'hold'], [8.05, 560, 70, 3.8, 'sine'],
        [8.06, 520, 66, 2.6, 'hold'], [8.2, 510, 64, 2.6], [8.8, 300, 62, 2.2, 'out'], [9.2, 260, 56, 2.35, 'sine'],
        [9.8, 260, 56, 2.35], [9.81, 330, 58, 2.45, 'hold'], [11.8, 315, 56, 2.6, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingRise', 0.6, 1.1); }],
        [0.66, L => { L.sfx('swing', 0.8, 0.8); L.sfx('swing', 0.7, 0.7, 0.4); L.dust(330, 6, 40, { v: -2 }); L.dust(560, 6, 40, { v: 2 }); }],
        [0.86, L => {
          L.sfx('clang', 1.2, 0.8); L.sfx('heavyHit', 1, 0.7); L.sfx('stingImpact', 0.8);
          L.impact(3); L.shake(22);
          const b = bind(L);
          L.ring(b.x, b.y, 150, { col: white, w: 9, life: 30 }); L.ring(b.x, b.y, 90, { col: cyan, w: 5, life: 24 });
          L.ring(450, G, 160, { sq: 0.16, col: '#b9c6d6', w: 6, life: 30 });
          L.streaks(b.x, b.y, 34, 140, { col: '#d8eaff', life: 22, w: 2.4 });
          L.lines(40, { col: '#ffffff', n: 46 });
          L.burst(b.x, b.y, 30, '#ffe9a0'); L.dust(450, 18, 160, { v: 4.5, life: 60 });
        }],
        [0.87, L => { L.surge('k', cyan, 1.2); L.surge('s', red, 1.2); L.sfx('superActivate', 0.6, 0.7); }],
        [1.0, L => { L.sfx('parry', 0.5, 0.6); }], [1.3, L => { L.sfx('parry', 0.5, 0.55); }],
        [1.86, L => { L.sfx('swingHeavy', 0.8, 0.9); L.shake(8); const b = bind(L); L.burst(b.x, b.y, 16); L.dust(396, 6, 40, { v: -2 }); L.dust(504, 6, 40, { v: 2 }); }],
        // His three cuts.
        [2.26, L => { L.sfx('swingHeavy', 0.8, 1.1); }],
        [2.38, L => { clang(L, 1.0, 0.95); L.slash(440, G - 70, 48, 340, 190, { sq: 0.4, col: red, w: 12, life: 12 }); }],
        [2.53, L => { L.sfx('swingHeavy', 0.8, 0.95); }],
        [2.62, L => { clang(L, 1.2, 0.85); L.crack(372, 34, { col: '#8a8796', life: 160 }); L.dust(372, 8, 50, { v: 2 }); }],
        [2.9, L => { L.sfx('swing2', 0.8, 1.0); L.slash(430, G - 14, 64, 200, 330, { sq: 0.2, col: red, w: 10, life: 14 }); L.debris(410, G - 2, 8, { v: 3, kind: 'spark', col: '#ff8a50', r: 2, life: 16, g: 0.2 }); }],
        [2.9, L => { L.sfx('jump', 0.6, 1.1); }],
        [3.16, L => { clang(L, 1.1, 1.05); }], [3.32, L => { L.sfx('land', 0.5); L.dust(404, 6, 40); }],
        [3.5, L => { clang(L, 1.0, 0.8); L.shake(14); const b = bind(L); L.ring(b.x, b.y, 70, { col: white, w: 4, life: 18 }); }],
        [3.86, L => { L.sfx('swingHeavy', 0.7, 0.9); L.shake(8); L.dust(396, 6, 40, { v: -2 }); L.dust(504, 6, 40, { v: 2 }); }],
        // 1. The cut at his head; he has already leaned out of it.
        [4.63, L => { L.sfx('swing', 0.9, 1.05); }],
        [4.7, L => { L.slash(486, G - 66, 52, 200, 345, { sq: 0.38, col: cyan, w: 14, life: 14 }); }],
        // 2. The thrust; he is already a step back.
        [5.1, L => { L.sfx('swingLight', 0.9, 1.1); }],
        [5.2, L => { L.streaks(560, G - 60, 10, 40, { col: '#bfeaff', dir: 0, spread: 20, life: 10, w: 2 }); }],
        // 3. From the air; he blocks it one-handed, looking at the ground.
        [5.5, L => { L.sfx('jump', 0.6); }],
        [5.8, L => { L.sfx('clang', 1, 1.1); L.sfx('hitBlunt', 0.6); L.shake(12); const b = bind(L), x = b.x, y = b.y; L.burst(x, y, 18); L.ring(x, y, 46, { col: '#fff4c0', w: 4, life: 16 }); L.streaks(x, y, 8, 28, { col: '#ffd890', life: 10, w: 1.6 }); }],
        [5.96, L => { L.sfx('land', 0.6); L.dust(490, 8, 60); }],
        // 4. The spinning sweep at his legs; he hops it.
        [6.34, L => { L.sfx('swing2', 0.9, 0.9); }],
        [6.44, L => { L.slash(530, G - 18, 70, 160, 380, { sq: 0.22, col: cyan, w: 12, life: 16 }); L.dust(530, 10, 140, { v: 3, life: 30, a: 0.35 }); }],
        [6.66, L => { L.sfx('land', 0.5); L.dust(612, 6, 40); }],
        // 5. The draw-cut, his fastest. Caught between two fingers.
        [6.82, L => { L.sfx('iaiMark', 0.9, 1.1); L.sfx('stingRise', 0.5, 1.4); }],
        [7.15, L => { L.sfx('iaiSheathe', 1, 1.2); L.sfx('swing3', 0.9); L.lines(18, { dir: 180, n: 40, col: '#cfefff' }); L.dust(420, 10, 60, { v: -4 }); }],
        [7.2, L => {
          L.sfx('parry', 1.2, 0.7); L.sfx('stingImpact', 0.9, 0.8); L.sfx('hitZap', 0.6, 0.6);
          const S = L.joints('s'), p = S.lHand; L.D.log.catch = { hand: [Math.round(p.x), Math.round(p.y)], tip: (t => [Math.round(t.x), Math.round(t.y)])(L.tip('k', 80)) };
          L.impact(2, { tint: '#ff6a50' }); L.shake(14);
          L.ring(p.x, p.y, 70, { col: red, w: 6, life: 30 }); L.ring(p.x, p.y, 40, { col: white, w: 3, life: 20 });
          L.streaks(p.x, p.y, 20, 60, { col: '#ffb09a', life: 18, w: 2 });
          L.debris(p.x, p.y, 10, { v: 3, kind: 'spark', col: '#ffcf9a', r: 2, life: 24, g: 0.12 });
        }],
        [7.9, L => { L.sfx('stingLow', 0.7, 0.9); }],
        [8.1, L => { L.surge('s', red, 1.5); L.sfx('superActivate', 0.7, 0.6); }],
        // The palm.
        [8.08, L => { L.sfx('swingHeavy', 0.7, 0.7); }],
        [8.2, L => {
          L.sfx('heavyHit', 1.2, 0.6); L.sfx('explosion', 0.8, 1.2); L.sfx('stingImpact', 1, 0.6);
          const S = L.joints('s'), p = S.lHand;
          L.impact(3, { tint: '#ff3311' }); L.shake(26); L.flash(red, 0.25, 12);
          L.ring(p.x, p.y, 170, { col: red, w: 10, life: 34 }); L.ring(p.x, p.y, 100, { col: white, w: 5, life: 26 });
          L.streaks(p.x, p.y, 30, 150, { col: '#ff9a80', dir: 180, spread: 110, life: 22, w: 2.6 });
          L.lines(30, { col: '#ffd6cc', n: 50 });
          L.dust(p.x, 14, 120, { v: -3.5, life: 50 });
          L.surge('k', cyan, 0.7);
        }],
        [8.7, L => { L.sfx('landHard', 1); L.shake(12); L.dust(250, 10, 60, { v: -3 }); L.crack(250, 40, { col: '#7d7a88', life: 200 }); }],
        [8.82, L => { L.sfx('hitBlunt', 0.6, 0.8); }],
        [9.6, L => { L.sfx('stingLow', 0.6, 0.7); }],
      ],
      each: (L, c) => {
        // The lock: sparks grinding out of the crossed blades.
        if (c > 3.5 && c < 3.85 && L.D.f % 4 === 0) L.debris(bind(L).x, bind(L).y, 2, { v: 3, kind: 'spark', col: '#ffd27a', r: 2, life: 18, g: 0.15, spread: 160 });
        if (c > 0.86 && c < 1.85 && L.D.f % 3 === 0) L.debris(bind(L).x, bind(L).y, 2, { v: 3, kind: 'spark', col: '#ffd27a', r: 2, life: 18, g: 0.15, spread: 160 });
        // The flight: a dust trail under him.
        if (c > 8.7 && c < 9.2 && L.D.f % 3 === 0) L.dust(L.joints('k').hip.x, 1, 0, { v: 0, life: 30, a: 0.4 });
        // The drag: the blade's point scraping sparks off the roof.
        if (c > 9.3) { const t = L.tip('s'); if (L.D.f % 2 === 0) L.debris(t.x, Math.min(t.y, G - 2), 2, { v: 2.2, kind: 'spark', col: '#ff7040', r: 2, life: 16, g: 0.2, dir: -60, spread: 60 }); }
      },
    });
    L.ghost('k', 2.84, 3.1, 0.25);
    // Sovereign's reads: each attack a beat before it comes.
    L.ghost('k', 4.32, 4.64, 0.28);
    L.ghost('k', 4.86, 5.12, 0.3);
    L.ghost('k', 5.3, 5.6, 0.3);
    L.ghost('k', 6.08, 6.34, 0.3);
    L.ghost('k', 6.7, 7.17, 0.42, { dx: 0 });
  },
  tick: function (H) { FILM.tick(H); },
};
