'use strict';
// Act 1, hands. He comes down and stands on the floor for the first time, and raises his fists: before he was anything
// he was a man who got robbed on a street and kept winning (canon). Kael's cut is taken inside the arc, the katana
// chopped out of his hand. Then a boxing lesson. Kael's bare hands: the palm slipped, the kick parried, the fist caught.
// Hook, knee, elbow. Then the game's moves: the strike mark, the three-point blink (teleportCombo), the grasp that hauls
// Kael out of a jump, the chain slam (front floor, back floor, front floor) and the throw. Kael slides to the blade
// standing in the floor, pulls it out and gets up. He goes back to floating: he only wanted to see.
module.exports = {
  arena: 'void', frames: 860, endC: 10.8,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star;
    CA.stage();
    const CUT = 2.0, DIS = 2.18, J1 = 2.3, J2 = 2.46, CR = 2.64, STICK = 3.28, PALM = 3.62, KICK = 3.84, FIST = 4.02, HOOK = 4.25, KNEE = 4.48, ELB = 4.7, DOWN = 4.82;
    const MARK = 5.05, B1 = 5.36, B2 = 5.58, B3 = 5.8, FLOOR = 5.97, HOP = 6.5, GR = 6.72, LK = 7.0, S1 = 7.7, S2 = 8.15, REL = 8.6, LAND = 9.15, GRIP = 9.8, PULL = 10.12, END = 10.8;
    const SLAM_X = 580;
    let blade = null;
    const kBase = { pos: [[0, 500, 0], [1.2, 500, 0], [1.8, 584, 0, 'lin'], [CUT, 590, 0], [DIS, 588, 0], [J1 + 0.05, 582, 0, 'out'], [J2 + 0.05, 572, 0, 'out'], [CR + 0.05, 564, 0, 'out'],
      ...CA.arc(CR + 0.05, 564, 0, 3.0, 508, 0, 16), [3.32, 508, 0], [PALM, 556, 0, 'io'], [KICK, 562, 0], [FIST, 560, 0], [HOOK + 0.05, 560, 0], [KNEE + 0.05, 560, 2],
      [KNEE + 0.14, 566, 22, 'out'], [ELB + 0.05, 566, 24], [DOWN, 562, 0, 'in'], [B1 + 0.05, 562, 0],
      ...CA.arc(B1 + 0.05, 562, 0, B2 + 0.05, 650, 34, 42), ...CA.arc(B2 + 0.05, 650, 34, B3 + 0.05, 596, 112, 118), [FLOOR, SLAM_X, 0, 'in'], [HOP, SLAM_X, 0],
      ...CA.arc(HOP, SLAM_X, 0, GR, 530, 40, 44)] };
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true,
      speed: CA.hitch([[CUT + 0.05, 0.3, 0.1], [DIS + 0.05, 0.3, 0.14], [CR + 0.05, 0.3, 0.12], [FIST + 0.05, 0.35, 0.14], [KNEE + 0.05, 0.3, 0.1], [ELB + 0.05, 0.3, 0.12], [B3 + 0.05, 0.3, 0.1], [S1 + 0.06, 0.25, 0.12], [S2 + 0.06, 0.25, 0.14]]),
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.75 });
        CA.floor(c);
        CA.crater(c, 478, 160, 18, 1);
        CA.crater(c, SLAM_X, 110, 12, L.curve([[0, 0], [FLOOR - 0.01, 0], [FLOOR + 0.03, 1, 'out']], t)[0]);
        const J = L.joints('s');
        CA.pull(c, J.rHand.x, J.rHand.y, L.curve([[0, 0], [GR, 0], [GR + 0.06, 1, 'lin'], [LK, 1], [LK + 0.1, 0, 'lin']], t)[0], t);
        // The blade out of Kael's hand: spinning on its arc, then standing where it stuck.
        if (blade && t >= DIS && t < GRIP + 0.02) {
          const u = Math.min(1, (t - DIS) / (STICK - DIS)), x = blade.x0 + (blade.x1 - blade.x0) * u, h = blade.path(u);
          const ang = u < 1 ? blade.a0 + (blade.a1 - blade.a0) * u : blade.a1;
          CA.loose(c, L.actors.k.f, x, G - h, ang, 1, G);
        }
      },
      actors: {
        k: {
          beats: [[0, 'rising', 'io', { headTilt: -20 }], [0.7, 'guard'], [1.2, 'guard'], [1.35, 'runA'], [1.5, 'runB'], [1.65, 'runA'], [1.8, 'highGuard'], [CUT, 'cutCaught', 'in'], [CUT + 0.06, 'cutCaught', 'out', { rArm: -66, rFore: -120 }],
            [DIS, 'cutCaught', 'io', { rArm: -66, rFore: -120 }], [DIS + 0.05, 'cutCaught', 'out', { rArm: -20, rFore: 30 }], [J1 + 0.05, 'headSnap', 'xout'], [J2 - 0.02, 'headSnap', 'io', { headTilt: -20, torso: -8 }], [J2 + 0.05, 'headSnap', 'xout', { headTilt: -40 }],
            [CR, 'headSnap', 'io', { torso: -6, headTilt: -24 }], [CR + 0.05, 'folded', 'xout'], [CR + 0.14, 'knockedBack', 'out'], [3.0, 'crouchLand', 'in'], [3.2, 'openHand'],
            // Three bare-hand answers; none lands.
            [3.45, 'openHand'], [PALM, 'palmK', 'xout'], [PALM + 0.1, 'openHand'], [KICK, 'frontKick', 'xout'], [KICK + 0.08, 'frontKick'], [FIST - 0.05, 'openHand', 'io'], [FIST, 'cross', 'xout'],
            [HOOK, 'cross', 'lin', { hipDrop: 22, rLeg: 128, rShin: 150, torso: 18, headTilt: -14 }], [HOOK + 0.06, 'folded', 'xout'], [KNEE, 'folded'], [KNEE + 0.06, 'folded', 'xout', { rLeg: 120, rShin: 130, lLeg: 60, lShin: 110, torso: 56, headTilt: 30 }],
            [ELB, 'folded', 'io', { rLeg: 120, rShin: 130, lLeg: 60, lShin: 110, torso: 50 }], [ELB + 0.06, 'folded', 'xout', { torso: 70, headTilt: 40, rLeg: 128, lLeg: 50 }], [DOWN, 'kneel', 'in', { torso: 60, headTilt: 30 }],
            [MARK - 0.1, 'pushUp'], [B1, 'rising', 'io', { torso: 12 }],
            // The three points. From behind: thrown forward. From in front and below: up and back. From above: down.
            [B1 + 0.05, 'folded', 'xout', { torso: 26, rArm: 150, rFore: 170, lArm: 160, lFore: 180, rLeg: 140, rShin: 170, lLeg: 130, lShin: 160, headTilt: -24 }],
            [B2 + 0.05, 'headSnap', 'xout', { rot: -30, rLeg: 60, rShin: 100, lLeg: 34, lShin: 90 }], [B3 + 0.05, 'knockedBack', 'xout', { rot: 50 }], [FLOOR, 'fallen', 'xout'],
            [6.2, 'fallen'], [6.42, 'pushUp', 'io'], [HOP, 'crouch', 'out'], [HOP + 0.1, 'tuck'], [GR, 'braceBack', 'out', { rLeg: 90, rShin: 130, lLeg: 44, lShin: 100, hipDrop: -6 }],
            // On the collar. The pull turns him with the arm (rotFn); here only his limbs.
            [LK, 'heldUp', 'out'], [7.5, 'heldUp', 'io', { rLeg: 80, rShin: 130, lLeg: 60, lShin: 120 }], [S1, 'heldUp', 'io', { rArm: 150, rFore: 170, lArm: -60, lFore: -80, rLeg: 96, rShin: 102, lLeg: 86, lShin: 90 }],
            [S2 - 0.2, 'heldUp', 'io', { rLeg: 70, rShin: 130, lLeg: 60, lShin: 110 }], [S2, 'heldUp', 'io', { rArm: 150, rFore: 170, lArm: -60, lFore: -80, rLeg: 96, rShin: 102, lLeg: 86, lShin: 90 }],
            [REL, 'heldUp', 'io', { rLeg: 70, rShin: 130, lLeg: 50, lShin: 110 }], [REL + 0.08, 'knockedBack', 'out'], [LAND - 0.1, 'tuck'], [LAND, 'skid', 'xout'], [9.45, 'skid'], [9.6, 'crouchLand', 'io'],
            [GRIP, 'reachHilt', 'out'], [PULL - 0.05, 'reachHilt', 'io', { headTilt: -8 }], [PULL + 0.05, 'guard', 'xout', { hipDrop: 14 }], [10.45, 'rising', 'io', { headTilt: -20 }], [END, 'rising', 'io', { headTilt: -20 }]],
          face: [[0, 1]], trail: [[B1, B3 + 0.2, 3, 0.03, 0.35], [REL, LAND, 3, 0.03, 0.35]], weapon: [[0, true], [DIS + 0.05, false], [GRIP, true]], below: [FLOOR - 0.05, 6.45],
          sink: [[0, false], [GRIP, true], [PULL, false]],
          aura: [[0, 0.4], [DIS, 0.2], [9.8, 0.3], [PULL, 0.6]], glowK: [[0, 0.3]], eyes: [[0, 0], [PULL, 0], [PULL + 0.1, 1]], expr: [[0, 'intense'], [J1 + 0.05, 'hurt'], [3.2, 'intense'], [HOOK + 0.05, 'hurt'], [GRIP, 'intense']],
          blinks: [],
        },
        s: CA.actor({
          beats: [[0, 'caFloat'], [1.0, 'caFloat', 'io', { headTilt: 4 }], [1.4, 'boxGuard'], [CUT - 0.1, 'boxGuard'], [CUT, 'parry', 'xout'], [CUT + 0.08, 'parry'], [DIS - 0.06, 'parry', 'io', { rArm: -30, rFore: -80 }], [DIS, 'axeHand', 'xout'], [J1 - 0.06, 'boxGuard'],
            [J1, 'jab', 'xout'], [J1 + 0.1, 'boxGuard', 'in'], [J2, 'jab', 'xout'], [J2 + 0.1, 'boxGuard', 'in'], [CR, 'cross', 'xout'], [CR + 0.3, 'cross'], [3.3, 'boxGuard'],
            [PALM - 0.05, 'boxGuard'], [PALM, 'slipBack', 'xout'], [PALM + 0.12, 'boxGuard'], [KICK, 'parry', 'xout'], [KICK + 0.09, 'parry'], [FIST - 0.03, 'boxGuard'], [FIST, 'parry', 'xout'], [HOOK - 0.05, 'parry'],
            [HOOK, 'hook', 'xout'], [HOOK + 0.1, 'hook'], [KNEE - 0.06, 'boxGuard'], [KNEE, 'kneeUp', 'xout'], [KNEE + 0.1, 'kneeUp'], [ELB - 0.06, 'boxGuard', 'io', { rArm: -40, rFore: 130 }], [ELB, 'elbowDown', 'xout'], [DOWN + 0.12, 'elbowDown'], [MARK, 'boxGuard'],
            // Two fingers' worth of arithmetic, then gone: each arrival already swinging.
            [B1 - 0.14, 'boxGuard'], [B1, 'cross', 'xout'], [B1 + 0.04, 'cross'], [B2 - 0.04, 'boxGuard', 'lin'], [B2, 'cross', 'xout'], [B2 + 0.04, 'cross'], [B3 - 0.04, 'boxGuard', 'lin', { rArm: -60, rFore: -100 }], [B3, 'axeHand', 'xout'],
            [B3 + 0.1, 'axeHand'], [6.2, 'boxGuard'], [GR - 0.06, 'boxGuard'], [GR, 'caGrab', 'xout'], [LK, 'caGrab'], [7.2, 'caGrab', 'io', { rArm: 20, rFore: 10, torso: 14, hipDrop: 8 }],
            [7.48, 'swingOver', 'in'], [S1, 'slamBack', 'xout', { rArm: -226, rFore: -236 }], [S1 + 0.14, 'slamBack', 'lin', { rArm: -226, rFore: -236 }], [7.95, 'swingOver', 'io'], [S2, 'slamDown', 'xout'], [S2 + 0.14, 'slamDown'], [8.4, 'swingOver', 'io'],
            [REL, 'cross', 'in', { rArm: 8, rFore: 2 }], [8.85, 'cross', 'out', { rArm: 14, rFore: 6 }], [9.3, 'boxGuard'], [10.2, 'caFloat', 'io'], [END, 'caFloat', 'io', { headTilt: 6 }]],
          pos: [[0, 640, 14], [1.0, 640, 0, 'sine'], [1.5, 640, 0], [CUT, 628, 0, 'out'], [J1, 626, 0], [J2, 620, 0, 'out'], [CR, 612, 0, 'out'], [3.3, 606, 0], [FIST, 604, 0], [KNEE, 604, 0], [B1 - 0.1, 604, 0],
            // The blinks are 'hold' keys: he is simply elsewhere.
            [B1 - 0.09, 516, 0, 'hold'], [B2 - 0.09, 516, 0], [B2 - 0.08, 692, 30, 'hold'], [B3 - 0.09, 692, 30], [B3 - 0.08, 610, 122, 'hold'], [B3 + 0.12, 610, 114], ...CA.arc(B3 + 0.12, 610, 114, 6.18, 625, 0), [LK, 625, 0], [S1, 625, 0], [REL, 620, 0], [9.2, 616, 0], [10.3, 640, 14, 'io'], [END, 640, 14]],
          face: [[0, -1], [B1 - 0.09, 1], [B2 - 0.08, -1]], hidden: [[0, false], [5.2, true], [B1 - 0.09, false]], blinks: [B1 - 0.09, B2 - 0.08, B3 - 0.08],
          trail: [[B1 - 0.09, B3 + 0.1, 3, 0.02, 0.35]],
          neb: [[0, 1], [0.9, 0.55], [9.6, 0.55], [10.3, 1]], crust: [[0, 0.45]], headCrust: [[0, 1]], aura: [[0, 0.4], [1, 0.15], [B1 - 0.1, 0.8], [6.3, 0.4], [10.3, 0.4]], eyes: [[0, 1]],
        }),
      },
      cam: [
        [0, 560, 90, 1.9], [0.98, 570, 86, 2.0, 'sine'],
        // His feet touching the floor.
        [1.0, 640, 58, 3.8, 'hold'], [1.3, 640, 62, 3.9, 'sine'],
        // The rush: side on, right up against them.
        [1.31, 540, 82, 2.2, 'hold'], [1.95, 606, 82, 2.9, 'out'], [CR, 600, 84, 3.2, 'sine'], [3.0, 566, 84, 2.5, 'out'], [PALM, 586, 84, 3.0, 'sine'], [FIST + 0.1, 588, 88, 3.4, 'sine'],
        [HOOK, 588, 88, 3.5, 'sine'], [KNEE + 0.14, 588, 92, 3.6, 'sine'], [DOWN, 586, 70, 3.1, 'out'],
        // The mark on his back, low.
        [MARK, 570, 50, 3.4, 'hold'], [B1 - 0.1, 570, 50, 3.6, 'sine'],
        [B1 - 0.09, 590, 90, 2.0, 'hold'], [B3 + 0.1, 620, 120, 1.8, 'sine'], [FLOOR, 590, 80, 2.2, 'out'],
        [HOP, 570, 76, 2.3, 'sine'], [GR, 590, 90, 2.2, 'sine'], [LK, 610, 96, 2.05, 'sine'],
        // The chain slam, wide enough for the whole arc overhead.
        [7.2, 625, 108, 1.75, 'sine'], [S1, 648, 80, 2.0, 'out'], [7.95, 622, 110, 1.75, 'sine'], [S2, 590, 76, 2.1, 'out'], [8.4, 610, 108, 1.75, 'sine'], [REL, 580, 90, 1.8, 'sine'],
        [LAND, 490, 72, 2.1, 'sine'], [9.45, 470, 66, 2.3, 'out'],
        // The hand on the hilt.
        [9.46, 450, 56, 3.8, 'hold'], [PULL, 450, 62, 4.0, 'sine'],
        [PULL + 0.01, 540, 92, 1.9, 'hold'], [END, 540, 92, 1.95, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingLow', 0.5, 0.6); }],
        [1.0, L => { L.sfx('land', 0.6, 0.45); L.ring(640, G, 80, { sq: 0.18, col: star, w: 3, life: 26 }); }],
        [1.42, L => { L.sfx('swingLight', 0.5, 0.6); }],
        [1.25, L => { L.sfx('jump', 0.5, 0.9); }], [1.82, L => { L.sfx('swingHeavy', 0.9, 1); }],
        [DIS + 0.05, L => { L.sfx('clang', 0.9, 1.3); L.sfx('throwSpin', 0.8, 1); }],
        [STICK, L => { if (blade) { L.sfx('hitPierce', 0.8, 0.7); L.sfx('clang', 0.5, 0.6); L.debris(blade.x1, G - 2, 8, { kind: 'spark', col: star, v: 3, r: 1.6, g: 0.2 }); } }],
        [3.0, L => { L.sfx('land', 0.6, 1); }], [PALM - 0.05, L => { L.sfx('swingLight', 0.8, 1); }], [KICK - 0.05, L => { L.sfx('swingLight', 0.8, 0.9); }], [FIST - 0.05, L => { L.sfx('swing', 0.8, 1.1); }],
        [DOWN, L => { L.sfx('landHard', 0.8, 0.9); L.shake(9); L.ring(562, G, 70, { sq: 0.18, col: star, w: 3, life: 20 }); L.dust(562, 6, 50, { col: '#9fb4ff', a: 0.14, r: 4 }); }],
        [MARK, L => { L.sfx('iaiMark', 0.8, 1.4); }], [B1 - 0.14, L => { const J = L.joints('s'); CA.blink(L, J.hip.x, J.hip.y - 20); }],
        [B1 - 0.09, L => { L.sfx('portalOpen', 0.5, 1.7); }], [B2 - 0.08, L => { const J = L.joints('s'); CA.blink(L, J.hip.x, J.hip.y - 20); }], [B3 - 0.08, L => { const J = L.joints('s'); CA.blink(L, J.hip.x, J.hip.y - 20); }],
        [FLOOR, L => {
          L.sfx('landHard', 1, 0.6); L.sfx('explosion', 0.8, 0.5); L.shake(20);
          L.crack(SLAM_X, 100, { col: '#9fb4ff', life: 400 }); L.ring(SLAM_X, G, 170, { sq: 0.16, col: star, w: 5, life: 26 }); L.debris(SLAM_X, G - 2, 22, { col: '#1a1a26', v: 6, r: 3.4 }); L.debris(SLAM_X, G - 2, 12, { kind: 'spark', col: star, v: 5, r: 2, g: 0.18 });
        }],
        [HOP, L => { L.sfx('jump', 0.6, 0.9); }],
        [GR, L => { L.sfx('stingImpact', 1, 0.5); L.sfx('soulRip', 0.7, 0.6); L.shake(10); const J = L.joints('s'); L.ring(J.rHand.x, J.rHand.y, 80, { col: star, w: 3, life: 18 }); }],
        [LK, L => { L.sfx('hitBlunt', 1, 0.8); L.shake(5); }],
        [7.3, L => { L.sfx('swingHeavy', 1, 0.55); }], [7.82, L => { L.sfx('swingHeavy', 1, 0.6); }], [8.3, L => { L.sfx('swingHeavy', 1, 0.65); }],
        ...[S1, S2].map(t => [t + 0.06, L => {
          const n = L.joints('k').neck; L.sfx('landHard', 1, 0.55); L.sfx('heavyHit', 1, 0.6); L.sfx('explosion', 0.7, 0.55); L.shake(20); L.impact(1, { tint: '#9fb4ff' });
          L.crack(n.x, 90, { col: '#9fb4ff', life: 300 }); L.ring(n.x, G, 150, { sq: 0.16, col: star, w: 5, life: 24 }); L.debris(n.x, G - 2, 18, { col: '#1a1a26', v: 6, r: 3.2 }); L.debris(n.x, G - 2, 10, { kind: 'spark', col: star, v: 5, r: 2, g: 0.18 });
        }]),
        [REL, L => { L.sfx('swingHeavy', 1, 0.8); L.lines(14, { dir: 180 }); }],
        [LAND, L => { L.sfx('landHard', 0.9, 0.8); L.shake(8); }],
        [GRIP, L => { L.sfx('pickup', 0.7, 0.7); }], [PULL, L => { L.sfx('iaiSheathe', 0.9, 1); L.debris(L.joints('k').rHand.x, G - 2, 8, { kind: 'spark', col: '#00d4ff', v: 3, r: 1.6, g: 0.2 }); }],
      ],
      each: (L, c) => {
        // Sparks off the floor while he skids on one foot.
        if (c > LAND && c < 9.5 && Math.random() < 0.5) { const J = L.joints('k'); L.debris(J.lFoot.x, G - 2, 1, { kind: 'spark', col: star, v: 3, r: 1.4, g: 0.2, dir: -60, spread: 40 }); }
      },
    });
    const k = L.actors.k, s = L.actors.s;
    // The strike mark, drawn over Kael's back where the first hit will land.
    L.add({ t: 'draw', life: 100000, fn: (c) => { const t = L.D.c; if (t < MARK || t > B1 + 0.05) return; const p = CA.point('k', 'chest', B1 + 0.06); CA.cross(c, p.x, p.y, (t - MARK) / 0.2); } });

    // Blows (aimed at the bodies, misses logged).
    const blows = [
      { t: CUT, by: 's', with: 'lHand', on: 'k', at: 'rFore', kind: 'block' },
      { t: DIS, by: 's', with: 'rHand', on: 'k', at: 'rHand', kind: 'jab', lead: 0.05 },
      { t: J1, by: 's', with: 'lHand', on: 'k', at: 'head', kind: 'jab' },
      { t: J2, by: 's', with: 'lHand', on: 'k', at: 'head', kind: 'jab' },
      { t: CR, by: 's', with: 'rHand', on: 'k', at: 'chest', kind: 'heavy' },
      { t: KICK, by: 's', with: 'lHand', on: 'k', at: 'lFoot', kind: 'block' },
      { t: FIST, by: 's', with: 'lHand', on: 'k', at: 'rHand', kind: 'catch', range: 150, step: 5 },
      { t: HOOK, by: 's', with: 'rHand', on: 'k', at: 'gut', kind: 'heavy' },
      { t: KNEE, by: 's', with: 'lKnee', on: 'k', at: 'gut', kind: 'heavy', range: 40 },
      { t: ELB, by: 's', with: 'rElbow', on: 'k', at: 'neck', kind: 'heavy' },
      { t: B1, by: 's', with: 'rHand', on: 'k', at: 'chest', kind: 'heavy' },
      { t: B2, by: 's', with: 'rHand', on: 'k', at: 'head', kind: 'heavy' },
      { t: B3, by: 's', with: 'rHand', on: 'k', at: 'chest', kind: 'heavy', impact: true },
    ];
    // Kael's collar on his fist: from the moment the pull arrives to the throw.
    const base = c => L.curve(k.pos, c) || [500, 0];
    k.pos = kBase.pos.slice();
    CA.blows(L, blows);
    // The floor slams: the fist driven at a point on the floor either side of him, Kael's neck there with it.
    const sb = t => s.beats.findIndex(q => Math.abs(q[0] - t) < 1e-6);
    L.D.log.slam = {
      S1: CA.aim('s', sb(S1), 'rHand', ['rArm', 'rFore'], { x: 672, y: G - 22 }, S1 + 0.08, { range: 50 }).d,
      S2: CA.aim('s', sb(S2), 'rHand', ['rArm', 'rFore'], { x: 574, y: G - 22 }, S2 + 0.08, { range: 50 }).d,
    };
    s.beats[sb(S1) + 1]._q = s.beats[sb(S1)]._q; s.beats[sb(S2) + 1]._q = s.beats[sb(S2)]._q;
    // Radial: the body flies out along the arm, flattening onto the floor when the arm comes low enough to put it there.
    const LEN = 62;
    const armWorld = c => 180 - L.pose(s, c).rArm * 180 / Math.PI;
    const radial = c => {
      let th = armWorld(c);
      const nh = G - L.joints('s', c).rHand.y, sinMax = Math.max(-1, Math.min(1, nh / LEN)), rad = th * Math.PI / 180;
      if (Math.sin(rad) > sinMax) { const base = Math.asin(sinMax) * 180 / Math.PI, n = Math.round((th - 90) / 360) * 360 + 90, cosSign = Math.cos(rad) > 0; th = n + (cosSign ? -90 + base : 90 - base); }
      return th - 90;
    };
    const REL_ROT = radial(REL);
    k.rotFn = c => {
      if (c < LK - 0.14) return 0;
      if (c < LK) return radial(LK) * L.EASE.io((c - (LK - 0.14)) / 0.14);
      if (c <= REL) return radial(c);
      if (c < LAND) return REL_ROT + (360 - REL_ROT) * ((c - REL) / (LAND - REL));
      return 0;
    };
    // The drag from the jump into his fist ends exactly on the collar, and the throw starts exactly from it.
    const lock = CA.lock(k, 'neck', 's', 'rHand', LK, REL, base);
    const atLK = lock(LK), atREL = lock(REL);
    k.pos = kBase.pos.concat([[LK, atLK[0], atLK[1], 'in'], [REL, atLK[0], atLK[1]]]);
    // Where he comes to rest: found from the hand on the hilt.
    const REST = 438;
    const atREL2 = (function () { k.pos = k.pos.slice(); const f = CA.lock(k, 'neck', 's', 'rHand', LK, REL, base); return f(REL); })();
    k.pos = k.pos.concat(CA.arc(REL, atREL2[0], atREL2[1], LAND, 470, 0, atREL2[1] + 14), [[9.5, REST, 0, 'out'], [END, REST, 0]]);
    k.posFn = CA.lock(k, 'neck', 's', 'rHand', LK, REL, base);
    // The blade comes to stand exactly where the hand will close on it.
    const JD = L.joints('k', DIS + 0.05), JG = L.joints('k', GRIP + 0.05);
    blade = { x0: JD.rHand.x, x1: JG.rHand.x, h0: G - JD.rHand.y, h1: G - JG.rHand.y, a0: JD.wAng, a1: Math.PI / 2 + Math.PI * 2 * 3 };
    const top = 150, ba = Math.sqrt(top - blade.h0), bb = Math.sqrt(top - blade.h1), us = ba / (ba + bb), A = (top - blade.h0) / (us * us);
    blade.path = u => top - A * (u - us) * (u - us);
    L.D.log.blade = { x: Math.round(blade.x1), h: Math.round(blade.h1), wAng: +(JG.wAng * 180 / Math.PI).toFixed(1), bLen: Math.round(JG.bLen) };
  },
  tick: function (H) { FILM.tick(H); },
};
