'use strict';
// Act 2, the brawl. He stops looking at his arm and comes down to do it properly. Three of him on the floor (Shadow
// Clones: "only one of me is the problem"). Kael cuts the wrong one and is hit from behind by the right one. Second split:
// Kael shuts his eyes and lets the interference go out. It passes through two of them and rings on the third (canon:
// same frequency), and the blade goes back past his own hip into the arm that was coming. Then an even fight with the off
// hand and the feet, and these blows land and clear crust. Kicked through a rift, he goes on hitting out of rifts
// (warp); Kael takes three, catches the fourth by the wrist, hauls him out through it and kicks him up and away.
module.exports = {
  arena: 'void', frames: 780, endC: 9.8,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff';
    CA.stage();
    const c1f = CA.proxy(CA.blue), c2f = CA.proxy(CA.blue);
    const SPLIT = 1.05, CUT1 = 1.62, HIT0 = 1.92, SPLIT2 = 2.5, EYES = 2.72, PING = 3.0, BACK = 3.34;
    const JB = 3.78, XOVER = 3.96, PALM = 4.08, HKB = 4.42, ELB = 4.56, KB = 4.76, VAULT = 4.98, LAND = 5.42, KICK = 5.55, GONE = 5.88;
    const R1 = 6.45, R2 = 6.72, R3 = 7.0, R4 = 7.32, YANK = 7.56, HEEL = 7.78, END = 9.8;
    const crustK = [[0, 0.26], [BACK + 0.05, 0.26], [BACK + 0.07, 0.252, 'lin'], [PALM + 0.05, 0.252], [PALM + 0.07, 0.247, 'lin'], [HEEL + 0.05, 0.247], [HEEL + 0.07, 0.24, 'lin']];
    const keptK = [[0, 0.75], [SPLIT, 0.2], [BACK, 0.2], [BACK + 0.04, 0.8, 'lin'], [BACK + 0.4, 0.25], [PALM, 0.25], [PALM + 0.04, 0.8, 'lin'], [PALM + 0.4, 0.25], [HEEL, 0.25], [HEEL + 0.04, 1, 'lin'], [END, 0.5]];
    const noiseK = [[0, 0.4], [EYES, 0.3], [PING, 1, 'out'], [BACK + 0.2, 0.6], [R1, 0.4], [R4, 1, 'out'], [END, 0.5]];
    const chest = (L) => { const J = L.joints('k'); return { x: (J.shoulder.x + J.hip.x) / 2, y: (J.shoulder.y + J.hip.y) / 2 }; };
    // [hit time, rift x, rift height, what it hits, rift rotation]. Rifts stand within an arm of Kael.
    const rifts = [[R1, 620, 94, 'head', 0], [R2, 590, 66, 'chest', 0], [R3, 526, 160, 'head', 90], [R4, 462, 76, 'lHand', 0]];
    const clone = (f, spec) => CA.actor(Object.assign({ f, neb: [[0, 0.55]], crust: [[0, 0.26]], headCrust: [[0, 1]], aura: [[0, 0.2]], eyes: [[0, 1]], z: 0.5 }, spec));
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true,
      speed: CA.hitch([[HIT0 + 0.05, 0.35, 0.12], [BACK + 0.05, 0.25, 0.26], [PALM + 0.05, 0.25, 0.2], [ELB + 0.05, 0.35, 0.08], [KICK + 0.05, 0.3, 0.12], [R3 + 0.05, 0.35, 0.1], [R4 + 0.05, 0.3, 0.16], [HEEL + 0.05, 0.25, 0.22]]),
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.75 });
        CA.floor(c);
        // The rift he goes through.
        CA.rift(c, 420, G - 66, 130, L.curve([[0, 0], [KICK, 0], [KICK + 0.12, 1, 'out'], [GONE - 0.08, 1], [GONE + 0.1, 0, 'in']], t)[0], t, { w: 34 });
        for (const [hit, x, h, on, rot] of rifts) {
          const hold = hit === R4 ? YANK + 0.14 : hit + 0.2;
          const k = L.curve([[0, 0], [hit - 0.26, 0], [hit - 0.12, 1, 'out'], [hold, 1], [hold + 0.16, 0, 'in']], t)[0];
          if (k <= 0.01) continue;
          c.save(); c.translate(x, G - h); c.rotate(rot * Math.PI / 180); c.translate(-x, -(G - h));
          CA.rift(c, x, G - h, 74, k, t, { w: 18 }); c.restore();
        }
      },
      actors: {
        k: {
          beats: [[0, 'guard', 'io', { headTilt: -14 }], [SPLIT, 'guard'], [1.4, 'guard'], [1.5, 'windBack'], [CUT1, 'slashOut', 'xout'], [CUT1 + 0.14, 'follow', 'out'], [HIT0, 'follow'],
            [HIT0 + 0.05, 'folded', 'xout', { torso: 24, rLeg: 130, rShin: 170, lLeg: 90, lShin: 100, headTilt: -22, rArm: 160, rFore: 190 }], [HIT0 + 0.3, 'crouchLand', 'out'], [SPLIT2 - 0.05, 'guard'],
            [EYES, 'readyOpen', 'io', { headTilt: 12 }], [PING, 'readyOpen', 'io', { headTilt: 16 }], [BACK - 0.12, 'readyOpen'], [BACK, 'thrustBack', 'xout'], [BACK + 0.22, 'thrustBack'],
            [JB - 0.12, 'kOpen'], [JB, 'kBlock', 'xout'], [JB + 0.1, 'kBlock'], [XOVER, 'kSlip', 'xout'], [PALM - 0.03, 'kSlip'], [PALM, 'palmK', 'xout'], [PALM + 0.2, 'palmK'], [HKB - 0.08, 'kOpen'],
            [HKB, 'kBlock', 'xout'], [ELB - 0.04, 'kOpen'], [ELB, 'elbow', 'xout'], [ELB + 0.08, 'elbow'], [KB - 0.04, 'kBlock'], [KB + 0.06, 'kBlock', 'xout', { torso: -12, hipDrop: 16 }],
            [VAULT - 0.08, 'crouch'], [VAULT + 0.08, 'tuck', 'out'], [LAND - 0.1, 'tuck'], [LAND, 'crouchLand', 'xout'], [KICK - 0.04, 'kOpen'], [KICK, 'frontKick', 'xout'], [KICK + 0.16, 'frontKick'], [GONE, 'guard'], [R1 - 0.1, 'guard', 'io', { headTilt: -4 }],
            [R1 + 0.05, 'headSnap', 'xout'], [R2 - 0.06, 'guard', 'in', { headTilt: -6 }], [R2 + 0.05, 'folded', 'xout', { rArm: 150, rFore: 170 }], [R3 - 0.05, 'crouch', 'io'], [R3 + 0.05, 'kneel', 'xout', { rArm: 130, rFore: 160, torso: 40, headTilt: 30 }],
            [R4 - 0.1, 'rising', 'io', { rArm: 130, rFore: 160 }], [R4, 'catchWrist', 'xout'], [YANK - 0.04, 'catchWrist'], [YANK, 'yank', 'xout'], [HEEL - 0.08, 'crouch', 'io', { rArm: 130, rFore: 170 }], [HEEL, 'heelKick', 'xout'], [HEEL + 0.28, 'heelKick'],
            [8.5, 'crouchLand', 'in'], [8.9, 'guard'], [END, 'guard', 'io', { headTilt: -14 }]],
          face: [[0, 1], [SPLIT2 + 0.2, -1], [JB - 0.18, 1], [VAULT + 0.2, -1], [R4 - 0.1, -1], [HEEL - 0.08, 1]], trail: [[VAULT, LAND, 3, 0.03, 0.35], [HEEL - 0.1, HEEL + 0.1, 3, 0.02, 0.35]],
          aura: [[0, 0.7]], glowK: [[0, 0.6]], eyes: [[0, 1], [EYES, 1], [EYES + 0.05, 0], [BACK + 0.2, 0], [BACK + 0.25, 1]], expr: [[0, 'intense'], [HIT0 + 0.05, 'hurt'], [SPLIT2, 'intense'], [R1 + 0.05, 'hurt'], [R4, 'intense']],
          blinks: [],
          post: (c, L) => CA.noise(c, chest(L).x, chest(L).y, L.curve(noiseK, L.D.c)[0], L.D.c),
        },
        c1: clone(c1f, {
          beats: [[0, 'boxGuard'], [1.3, 'boxGuard'], [1.42, 'runA'], [CUT1, 'cross', 'out'], [2.4, 'cross'], [SPLIT2 + 0.1, 'boxGuard'], [2.9, 'boxGuard'], [3.05, 'runA'], [3.2, 'runB'], [BACK, 'cross']],
          pos: [[0, 610, 0], [1.25, 610, 0], [CUT1, 580, 0, 'in'], [2.4, 580, 0], [2.41, 442, 0, 'hold'], [2.9, 442, 0], [BACK, 492, 0, 'in']],
          face: [[0, -1], [2.41, 1]], hidden: [[0, true], [SPLIT, false], [CUT1 + 0.1, true], [SPLIT2, false], [BACK + 0.05, true]],
          alphaK: [[0, 0], [SPLIT, 0], [SPLIT + 0.14, 0.85], [CUT1 + 0.04, 0.85], [CUT1 + 0.1, 0, 'lin'], [SPLIT2, 0], [SPLIT2 + 0.12, 0.85], [BACK, 0.85], [BACK + 0.05, 0, 'lin']],
        }),
        c2: clone(c2f, {
          beats: [[0, 'boxGuard'], [1.5, 'boxGuard'], [1.65, 'runA'], [1.85, 'runB'], [2.2, 'boxGuard'], [2.9, 'boxGuard'], [3.0, 'crouch'], [3.15, 'airHigh'], [BACK, 'axeHand']],
          pos: [[0, 700, 0], [1.5, 700, 0], [2.2, 640, 0, 'lin'], [2.41, 640, 0], [2.42, 480, 0, 'hold'], [3.0, 480, 0], ...CA.arc(3.0, 480, 0, BACK, 510, 30, 70)],
          face: [[0, -1], [2.42, 1]], hidden: [[0, true], [SPLIT, false], [2.3, true], [SPLIT2, false], [BACK + 0.05, true]],
          alphaK: [[0, 0], [SPLIT, 0], [SPLIT + 0.14, 0.85], [2.2, 0.85], [2.3, 0, 'lin'], [SPLIT2, 0], [SPLIT2 + 0.12, 0.85], [BACK, 0.85], [BACK + 0.05, 0, 'lin']],
        }),
        s: CA.actor({
          beats: [[0, 'caLookArm', 'io', { headTilt: 30 }], [0.6, 'caFloat', 'io', { headTilt: 0 }], [SPLIT - 0.1, 'boxGuard'], [1.5, 'boxGuard'], [1.72, 'runA'], [HIT0 - 0.04, 'boxGuard'], [HIT0, 'cross', 'xout'], [HIT0 + 0.2, 'cross'], [SPLIT2, 'boxGuard'],
            [PING + 0.05, 'boxGuard'], [3.16, 'runA'], [BACK - 0.06, 'cross'], [BACK, 'caGuard', 'xout', { rArm: 110, rFore: 140, rLeg: 118, rShin: 106, lLeg: 62, lShin: 88, hipDrop: 8, torso: 6 }], [BACK + 0.25, 'caRecoil', 'out', { torso: -8, rLeg: 100, rShin: 90, lLeg: 60, lShin: 76 }],
            [JB - 0.1, 'boxGuard'], [JB, 'jab', 'xout'], [JB + 0.1, 'boxGuard', 'in'], [XOVER, 'cross', 'xout'], [PALM - 0.02, 'cross'], [PALM + 0.07, 'caRecoil', 'xout', { rLeg: 118, rShin: 104, lLeg: 64, lShin: 84 }], [PALM + 0.24, 'caRecoil', 'io', { rLeg: 118, rShin: 104, lLeg: 64, lShin: 84 }],
            [HKB - 0.06, 'boxGuard'], [HKB, 'hook', 'xout'], [HKB + 0.1, 'hook'], [ELB + 0.07, 'caRecoil', 'xout', { rLeg: 118, rShin: 104, lLeg: 64, lShin: 84, torso: -14 }], [KB - 0.06, 'boxGuard'], [KB, 'sideKick', 'xout'], [KB + 0.14, 'sideKick'], [VAULT + 0.12, 'boxGuard'], [VAULT + 0.28, 'slipBack', 'io'], [LAND - 0.05, 'boxGuard'], [KICK, 'boxGuard'],
            [KICK + 0.07, 'caRecoil', 'xout', { rLeg: 40, rShin: 90, lLeg: 20, lShin: 70 }], [GONE, 'caRecoil'], [YANK, 'caRecoil', 'hold'], [HEEL, 'caGrab', 'out', { rot: -40 }], [HEEL + 0.08, 'caRecoil', 'xout', { torso: -30, rLeg: 40, rShin: 90, lLeg: 20, lShin: 70 }], [8.8, 'caRecoil', 'out', { torso: -6 }], [9.4, 'caFloat', 'io', { headTilt: 10 }], [END, 'caFloat', 'io', { headTilt: 12 }]],
          face: [[0, -1], [SPLIT, 1], [2.41, -1], [VAULT + 0.16, 1], [GONE, -1], [HEEL + 0.1, -1]],
          hidden: [[0, false], [SPLIT - 0.06, true], [SPLIT, false], [HIT0 + 0.3, true], [SPLIT2, false], [GONE, true], [YANK, false]],
          blinks: [SPLIT, SPLIT2, YANK, GONE],
          crust: crustK, headCrust: [[0, 1]], kept: keptK, keptFace: [[0, 0]], neb: [[0, 1], [SPLIT, 0.55], [8.6, 0.55], [9.4, 1]], aura: [[0, 0.5]], eyes: [[0, 1]],
        }),
      },
      cam: [
        // He looks up from the arm.
        [0, 694, 136, 3.8], [0.8, 694, 136, 4.0, 'sine'],
        // Three of him round Kael, wide.
        [SPLIT, 560, 94, 1.65, 'hold'], [1.5, 548, 86, 1.8, 'sine'], [CUT1, 546, 82, 2.5, 'out'], [HIT0, 540, 82, 2.7, 'sine'], [HIT0 + 0.3, 560, 80, 2.5, 'sine'],
        // The eyes close.
        [EYES, 556, 96, 4.6, 'hold'], [PING - 0.02, 556, 98, 4.9, 'sine'], [PING, 545, 90, 1.7, 'hold'], [BACK - 0.02, 560, 86, 2.1, 'sine'], [BACK, 610, 84, 3.1, 'hold'], [BACK + 0.22, 612, 84, 3.3, 'sine'],
        // Close enough to count the blows.
        [JB - 0.1, 600, 84, 3.1, 'sine'], [KB + 0.1, 594, 84, 3.2, 'sine'], [VAULT + 0.2, 606, 128, 1.9, 'sine'], [LAND, 590, 90, 2.3, 'sine'], [KICK + 0.1, 540, 80, 2.5, 'sine'], [GONE, 480, 80, 2.0, 'out'],
        // Alone, then the rifts.
        [GONE + 0.3, 556, 84, 2.3, 'sine'], [R1 - 0.3, 562, 90, 2.7, 'sine'], [R3, 552, 92, 2.9, 'sine'], [R4 - 0.1, 510, 88, 3.0, 'sine'], [YANK, 512, 90, 3.0, 'sine'],
        [HEEL, 552, 92, 2.7, 'sine'], [HEEL + 0.5, 610, 110, 1.9, 'out'], [8.8, 620, 118, 1.75, 'sine'], [END, 620, 120, 1.8, 'sine'],
      ],
      ev: [
        [0.7, L => { L.sfx('stingLow', 0.8, 0.55); }],
        [SPLIT - 0.06, L => { const J = L.joints('s'); CA.blink(L, J.hip.x, J.hip.y - 20); L.sfx('soulRip', 0.7, 0.8); }],
        [SPLIT, L => { for (const k of ['c1', 'c2', 's']) { const J = L.joints(k); CA.blink(L, J.hip.x, J.hip.y - 20, { quiet: true }); } L.shake(6); }],
        [1.5, L => { L.sfx('swingHeavy', 0.9, 0.95); }],
        [CUT1 + 0.04, L => { L.sfx('hitSlash', 0.8, 1.1); L.sfx('hitZap', 0.5, 0.6); const J = L.joints('c1'); L.debris(J.neck.x, J.hip.y - 20, 22, { col: '#05030a', v: 3.2, r: 3.5, g: 0, spread: 360, life: 34 }); L.debris(J.neck.x, J.hip.y - 20, 12, { kind: 'spark', col: star, v: 3, r: 1.6, g: 0, spread: 360, life: 24 }); }],
        [HIT0 + 0.3, L => { const J = L.joints('s'); CA.blink(L, J.hip.x, J.hip.y - 20); }],
        [2.22, L => { const J = L.joints('c2'); CA.blink(L, J.hip.x, J.hip.y - 20, { quiet: true }); }],
        [SPLIT2, L => { for (const k of ['c1', 'c2', 's']) { const J = L.joints(k); CA.blink(L, J.hip.x, J.hip.y - 20, { quiet: true }); } L.sfx('soulRip', 0.7, 0.9); L.shake(5); }],
        // The ping: the ring goes through two and rings on the third.
        [PING, L => {
          const p = chest(L); L.sfx('shieldUp', 1, 0.6); L.sfx('iaiMark', 0.8, 0.7); L.ring(p.x, p.y, 240, { col: cyan, w: 3, life: 42, sq: 0.9 });
          const J = L.joints('s'); L.add({ t: 'ring', x: J.neck.x, y: (J.neck.y + J.hip.y) / 2, r0: 10, r1: 56, life: 22, w: 4, sq: 1, col: cyan, c0: PING + 0.1 });
          L.sfx('hitZap', 0.6, 1.2);
        }],
        [BACK - 0.08, L => { L.sfx('swingHeavy', 1, 1.1); }],
        [BACK + 0.05, L => {
          const t = L.tip('k'); L.sfx('heavyHit', 1, 0.55); L.sfx('hitPierce', 1, 0.8); L.shake(14); L.impact(1, { tint: '#bfe8ff' }); L.burst(t.x, t.y, 16, star); L.ring(t.x, t.y, 30, { col: cyan, w: 3, life: 10 });
          for (const k of ['c1', 'c2']) { const J = L.joints(k); L.debris(J.neck.x, J.hip.y - 20, 22, { col: '#05030a', v: 3.2, r: 3.5, g: 0, spread: 360, life: 34 }); }
          L.D.log.back = { tip: [Math.round(t.x), Math.round(t.y)] };
        }],
        [XOVER - 0.02, L => { L.sfx('swing', 0.9, 0.9); }], [PALM - 0.03, L => { L.sfx('swingLight', 0.8, 1); }], [KB - 0.04, L => { L.sfx('swing', 0.9, 0.8); }],
        [VAULT, L => { L.sfx('jump', 0.7, 0.9); }], [LAND, L => { L.sfx('land', 0.7, 1); L.dust(L.joints('k').hip.x, 5, 40, { col: '#9fb4ff', a: 0.12, r: 4 }); }],
        [GONE, L => { L.sfx('portalOpen', 0.9, 0.7); L.sfx('stingLow', 0.5, 0.6); }],
        ...rifts.map(([hit, x, h], i) => [hit - 0.26, L => { L.sfx('portalOpen', 0.7, 1 + i * 0.15); L.add({ t: 'ring', x, y: G - h, r0: 46, r1: 3, life: 10, w: 2, sq: 1, col: star }); }]),
        ...rifts.slice(0, 3).map(([hit, x, h, on], i) => [hit + 0.05, L => {
          const p = CA.point('k', on, hit + 0.05); CA.blowFx(L, { by: 'k', with: 'head', kind: i === 2 ? 'heavy' : 'jab' });
        }]),
        [R3 + 0.05, L => { L.sfx('landHard', 0.7, 0.8); L.ring(L.joints('k').hip.x, G, 80, { sq: 0.18, col: star, w: 3, life: 20 }); L.crack(L.joints('k').hip.x, 60, { col: '#9fb4ff', life: 300 }); }],
        [R4 + 0.05, L => { L.sfx('parry', 1, 0.8); L.sfx('hitBlunt', 1, 0.7); L.shake(7); const p = L.joints('k').lHand; L.ring(p.x, p.y, 22, { col: cyan, w: 2.5, life: 10 }); }],
        [YANK, L => { L.sfx('swingHeavy', 1, 0.7); L.sfx('portalOpen', 1, 1.3); L.lines(10, { dir: 0 }); }],
        [HEEL - 0.05, L => { L.sfx('swingHeavy', 1, 1); }],
      ],
      each: (L, c) => { /* */ },
    });
    const k = L.actors.k, s = L.actors.s;
    // Spacing keys for the fight proper (both are on the floor).
    k.pos = [[0, 520, 0], [1.4, 520, 0], [CUT1, 534, 0, 'out'], [HIT0, 534, 0], ...CA.arc(HIT0 + 0.05, 534, 0, HIT0 + 0.32, 568, 0, 16), [SPLIT2, 568, 0],
      [BACK, 566, 0], [JB - 0.1, 568, 0], [PALM, 584, 0, 'out'], [ELB, 590, 0], [KB, 588, 0], [VAULT, 560, 0, 'out'], ...CA.arc(VAULT, 560, 0, LAND, 656, 0, 118), [KICK, 642, 0], [GONE, 626, 0, 'io'], [R1, 600, 0],
      [R1 + 0.1, 584, 0, 'out'], [R2, 584, 0], [R2 + 0.1, 556, 0, 'out'], [R3, 544, 0], [R4, 530, 0], [YANK, 530, 0], [YANK + 0.14, 522, 0, 'out'], [HEEL, 522, 0], [END, 522, 0]];
    s.pos = [[0, 690, 60], [SPLIT - 0.06, 690, 60], [SPLIT, 450, 0, 'hold'], [1.5, 450, 0], [HIT0 - 0.04, 488, 0, 'in'], [HIT0 + 0.3, 490, 0], [SPLIT2, 700, 0, 'hold'], [PING + 0.05, 700, 0], [BACK - 0.06, 666, 0, 'in'],
      [BACK + 0.25, 672, 0, 'out'], [JB - 0.1, 618, 0, 'io'], [PALM, 618, 0], [PALM + 0.12, 632, 0, 'out'], [HKB - 0.1, 624, 0], [KB, 622, 0], [VAULT + 0.2, 618, 0], [KICK + 0.05, 606, 0],
      ...CA.arc(KICK + 0.05, 606, 0, GONE, 420, 26, 40), [YANK, 462, 40, 'hold']];
    // Hauled out through the rift, over Kael's head.
    s.pos.push(...CA.arc(YANK, 462, 40, HEEL + 0.05, 556, 22, 64), ...CA.arc(HEEL + 0.05, 556, 22, 8.8, 690, 60, 118), [END, 690, 60]);
    // Blows. The reverse thrust: his guard forearm meets the tip of the blade.
    const tipAt = (c) => { const t = L.tip('k', undefined, c); return { x: t.x, y: t.y }; };
    const list = [
      { t: HIT0, by: 's', with: 'rHand', on: 'k', at: 'chest', kind: 'heavy' },
      { t: BACK, by: 's', with: 'lHand', point: tipAt(BACK + 0.06), kind: 'none' },
      { t: JB, by: 's', with: 'lHand', on: 'k', at: 'lFore', kind: 'block' },
      { t: PALM, by: 'k', with: 'lHand', on: 's', at: 'chest', kind: 'heavy', impact: true, col: cyan },
      { t: HKB, by: 's', with: 'rHand', on: 'k', at: 'lFore', kind: 'block' },
      { t: ELB, by: 'k', with: 'lElbow', on: 's', at: 'chest', kind: 'jab', col: cyan },
      { t: KB, by: 's', with: 'lFoot', on: 'k', at: 'lFore', kind: 'heavy' },
      { t: KICK, by: 'k', with: 'lFoot', on: 's', at: 'gut', kind: 'heavy', col: cyan },
      { t: R4, by: 'k', with: 'lHand', point: { x: 500, y: G - 70 }, kind: 'none' },
      { t: HEEL, by: 'k', with: 'lFoot', on: 's', at: 'lThigh', kind: 'heavy', impact: true, col: cyan },
    ];
    CA.blows(L, list);
    // The rift arms: straight from the lens to the body, at the moment it lands. The fourth stays in Kael's hand until the haul.
    const RIFT = rifts.map(([hit, x, h, on]) => { const p = on === 'lHand' ? L.joints('k', R4 + 0.06).lHand : CA.point('k', on, hit + 0.05); return { hit, x, y: G - h, fx: p.x, fy: p.y, keep: on === 'lHand' }; });
    L.add({ t: 'draw', life: 100000, fn: (c) => {
      const t = L.D.c;
      for (const r of RIFT) {
        const end = r.keep ? YANK : r.hit + 0.16;
        const u = t < r.hit - 0.05 ? 0 : t < r.hit + 0.05 ? (t - (r.hit - 0.05)) / 0.1 : t < end ? 1 : Math.max(0, 1 - (t - end) / 0.08);
        if (u <= 0.01) continue;
        CA.riftArm(c, r.x, r.y, r.x + (r.fx - r.x) * u, r.y + (r.fy - r.y) * u, 1, t);
      }
    } });
  },
  tick: function (H) { FILM.tick(H); },
};
