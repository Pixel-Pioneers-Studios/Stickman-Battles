'use strict';
// The long cut, after the katana breaks (z4 to c 3.5): the bottom room, count 1, Kael on one knee.
//   1. He does not form another arm. The fragment comes up through him instead, and his hands are enough.
//   2. Hands. Sovereign is still first to every one, until Kael starts reading him back (cyan, a beat ahead): the cross
//      lands, the elbow, the kick. It moves him a step. Nothing in his face changes.
//   3. Even again, and Sovereign's knee and kick put him on the floor. His palm on the floor: the fragment goes out
//      through it, and the arms come back (katana, hammer, katana). The last cut opens his chest. It does not finish.
//   4. He reaches back to an older draft (canon: rare, costly, only when a fight goes against him). No wind-up at all:
//      one palm and Kael is across the room. A door into the pocket opens behind him, and he is put through it.
module.exports = {
  arena: 'city', frames: 1225, endC: 14.0,
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    AS.stage(); AS.mini = CA.proxy(AS.red, 'katana'); CR.veins = [];
    const red = AS.red, cyan = AS.cyan;
    const near = [470, 610, 1180, 1320].map((x, i) => ({ x, seed: i * 7 + 53 }));
    // Beats.
    const WAKE = 0.9, READ = 2.38, CROSS = 2.86, KICK = 3.22, DOWN = 5.02, SLAP = 5.92, FORM = 6.32, HAM = 7.44, CUT = 8.42;
    const REACH = 9.4, PALM = 10.24, DOOR = 11.55, THROW = 12.18;
    const lampK = [[0, 0.5], [REACH, 0.5], [REACH + 0.5, 0.3, 'out'], [PALM + 0.05, 0.12], [PALM + 0.4, 0.34, 'io']];
    const woundK = [[0, 0], [CUT + 0.02, 0], [CUT + 0.06, 1, 'out']];
    const reachK = [[0, 0], [REACH, 0], [REACH + 0.6, 1, 'out'], [PALM + 0.2, 1], [13.0, 0.5, 'io']];
    const kVeinK = [[0, 0], [WAKE - 0.4, 0], [WAKE + 0.5, 1, 'out'], [PALM, 1], [PALM + 0.3, 0.4, 'out']];
    const doorK = [[0, 0], [DOOR, 0], [DOOR + 0.35, 1, 'out'], [12.75, 1], [13.1, 0, 'in']];
    const DOORX = 505;
    let memo = null;
    const ahead = () => {
      if (memo && memo.c === L.D.c) return memo;
      const s = L.state(L.actors.k, L.D.c + 0.32), q = Object.assign({}, s.q);
      const rolled = Math.abs(q.rot || 0) > 0.3;
      memo = { c: L.D.c, q: rolled ? L.resolve('kneel') : (q.rot = 0, q), face: s.face };
      return memo;
    };
    L.setup(H, {
      tempo: 1, vignette: 0.6, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c, v = L.view(), A = ahead(), lamp = L.curve(lampK, t)[0];
        AS.paintLab(c, {
          near, redK: 1, lamp: () => lamp * (t > REACH && t < PALM + 0.4 ? (Math.sin(t * 60) > -0.2 ? 1 : 0.5) : 1),
          mon: { x: 1000, n: 1, label: 'TYRANT', k: 1 },
          colState: x => t < WAKE ? { stop: 1, look: 860, mimic: 'reachHold' } : { stop: 1, mimicQ: A.q, mimicFace: A.face, look: 0 },
        });
        c.save(); c.fillStyle = '#0a0d0e'; c.fillRect(v.x0 - 40, v.y0 - 40, v.x1 - v.x0 + 80, Math.max(0, G - 372 - (v.y0 - 40)));
        c.fillStyle = 'rgba(160,190,185,0.08)'; c.fillRect(770, G - 400, 100, 28); c.restore();
        AS.door(c, DOORX, G, 150, L.curve(doorK, t)[0], t);
      },
      actors: {
        k: { scale: 1, z: 2, beats: [[0, 'kneel']], pos: [[0, 690, 0]], face: [[0, 1]], weapon: [[0, false]],
          aura: [[0, 0.55], [WAKE - 0.3, 0.55], [WAKE + 0.3, 1, 'out'], [3.6, 0.8], [PALM, 0.8], [PALM + 0.3, 0.35]],
          glowK: [[0, 0.4], [WAKE - 0.3, 0.4], [WAKE + 0.3, 0.9, 'out'], [3.6, 0.6], [PALM, 0.6], [PALM + 0.3, 0.2]],
          eyes: [[0, 1]],
          expr: [[0, 'intense'], [WAKE, 'angry'], [2.1, 'hurt'], [READ, 'intense'], [DOWN, 'hurt'], [SLAP, 'angry'], [CUT + 0.3, 'intense'], [PALM, 'hurt']],
          post: (c, L) => { AS.bodyVeins(c, L, 'k', L.curve(kVeinK, L.D.c)[0], AS.ARMS, 11, 1.4); } },
        s: { scale: 1.08, z: 1, wAbs: true, wkey: [[0, AS.COUNTER.katana]], weapon: [[0, true]], beats: [[0, 'sovReady']], pos: [[0, 852, 0]], face: [[0, -1]],
          aura: [[0, 0.24], [REACH, 0.24], [REACH + 0.5, 0.9, 'out'], [13, 0.5]], auraColor: red, eyes: [[0, 1]], eyeColor: red,
          expr: [[0, 'neutral']],
          post: (c, L) => { const t = L.D.c; AS.wound(c, L, 's', L.curve(woundK, t)[0]); AS.reach(c, L, 's', L.curve(reachK, t)[0]); } },
      },
      cam: [[0, 760, 80, 2.2]],
      ev: [],
    });
    const a = L.actors, K = AS.kit(L), { kb, sb, kp, sp, karc, sfx, swish, whoosh, clash, hit, block } = K, ev = L.spec.ev;

    // ── 1. the fragment instead of an arm ──
    kb(0.35, 'kneel', 'io', { headTilt: -6 }); kb(0.7, 'kneel', 'io', { headTilt: -14, torso: 18 });
    sb(0.4, 'sovReady', 'io', { headTilt: 4 }); sp(0, 852);
    sfx(0.55, 'stingRise', 0.5, 0.9); sfx(WAKE, 'phaseUp', 0.7, 0.8);
    ev.push([WAKE, l => { l.surge('k', cyan, 0.9); l.sfx('stingImpact', 0.5, 1.1); l.shake(5); l.ring(690, G, 120, { sq: 0.16, col: cyan, w: 3, life: 24 }); }]);
    kb(WAKE + 0.1, 'rising', 'out'); kb(1.25, 'boxGuard', 'io'); kp(1.25, 700);
    sb(1.0, 'sovReady', 'io', { headTilt: 8 });

    // ── 2. hands ──
    kb(1.32, 'runA', 'out'); kb(1.44, 'runB'); kp(1.3, 700); kp(1.52, 800, 0, 'in'); whoosh(1.34);
    // He is out of the jab before it, under the hook; the cross he turns aside; then his palm.
    sb(1.5, 'sovLean', 'out'); kb(1.58, 'jab', 'xout'); whoosh(1.55, 1.6); kb(1.66, 'boxGuard', 'io'); sp(1.5, 852); sp(1.6, 866, 0, 'out');
    kb(1.76, 'cross', 'xout'); sb(1.76, 'sovCatch', 'xout'); block(1.76, 's', 'lHand', 'k', 'rFore'); kp(1.76, 812, 0, 'out'); kb(1.86, 'boxGuard', 'io');
    kb(1.95, 'hook', 'xout'); sb(1.95, 'sovDuck', 'xout'); whoosh(1.92, 1.4); sb(2.05, 'sovDuck', 'io');
    sb(2.12, 'sovPalm', 'xout'); sp(2.12, 836, 0, 'out'); hit(2.12, 's', 'lHand', 'k', 'chest', 'heavy', 8); sb(2.3, 'sovReady', 'io');
    kb(2.18, 'headSnap', 'xout'); kb(2.3, 'slipBack', 'out'); kp(2.12, 812); kp(2.42, 756, 0, 'out');
    // Now he reads him back: cyan, a beat ahead.
    ev.push([READ, l => { l.sfx('hitZap', 0.5, 0.6); l.sfx('portalOpen', 0.25, 0.6); l.flash('#00d4ff', 0.12, 8); }]);
    L.ghost('s', READ, 3.36, 0.24, { col: cyan });
    kb(READ + 0.06, 'boxGuard', 'io', { headTilt: 6 });
    sp(2.5, 846); sp(2.72, 806, 0, 'out'); sb(2.58, 'sovReady', 'out'); sb(2.72, 'sovPalm', 'xout'); whoosh(2.68, 1.2);
    kb(2.7, 'slip', 'xout'); kp(2.7, 760, 0, 'out');
    kb(CROSS, 'cross', 'xout'); kp(CROSS, 778, 0, 'out'); hit(CROSS, 'k', 'rHand', 's', 'head', 'heavy', 9, cyan);
    sb(CROSS + 0.06, 'headSnap', 'xout'); sp(CROSS + 0.06, 812, 0, 'out'); sb(2.98, 'sovReady', 'io');
    kb(3.04, 'elbow', 'xout'); kp(3.04, 792, 0, 'out'); hit(3.04, 'k', 'lElbow', 's', 'chest', 'light', 6, cyan);
    sb(3.1, 'folded', 'xout', { torso: 20 }); sp(3.1, 816, 0, 'out');
    kb(KICK, 'sideKick', 'xout'); kp(KICK, 786, 0); hit(KICK, 'k', 'lFoot', 's', 'gut', 'heavy', 12, cyan);
    sb(KICK + 0.06, 'knockedBack', 'xout', { rLeg: 112, rShin: 104, lLeg: 66, lShin: 84, hipDrop: 8 }); sp(KICK + 0.06, 822); sp(3.6, 890, 0, 'out');
    ev.push([KICK + 0.1, l => l.dust(860, 6, 70, { a: 0.2 })]); sfx(KICK + 0.12, 'land', 0.4, 0.8);
    kb(3.4, 'boxGuard', 'io'); kp(3.4, 772);
    sb(3.66, 'sovReady', 'io', { headTilt: 2 }); sb(3.95, 'sovReady', 'io', { headTilt: -2 });

    // ── 3. even again; then down ──
    sp(3.98, 890); sp(4.16, 826, 0, 'out'); sb(4.18, 'sovKick', 'xout'); whoosh(4.12, 1);
    kb(4.18, 'kBlock', 'xout'); block(4.18, 'k', 'lHand', 's', 'lFoot'); kb(4.26, 'boxGuard', 'io'); kp(4.18, 768, 0, 'out');
    sb(4.32, 'sovReady', 'io');
    kb(4.4, 'upperK', 'xout'); kp(4.4, 784, 0, 'out'); sb(4.38, 'sovLean', 'xout'); whoosh(4.37, 1.5); sb(4.5, 'sovLean', 'io');
    sb(4.6, 'sovPalm', 'xout'); sp(4.6, 820, 0, 'out'); kb(4.6, 'parry', 'xout'); block(4.6, 'k', 'lHand', 's', 'lFore'); kb(4.7, 'boxGuard', 'io');
    sb(4.8, 'kneeUp', 'xout', { rArm: 110, rFore: 130 }); sp(4.8, 806, 0, 'out'); hit(4.8, 's', 'lKnee', 'k', 'gut', 'heavy', 9);
    kb(4.86, 'folded', 'xout'); sb(4.92, 'sovReady', 'io');
    sb(DOWN, 'sovKick', 'xout'); sp(DOWN, 808, 0); hit(DOWN, 's', 'lFoot', 'k', 'gut', 'heavy', 13);
    kb(DOWN + 0.06, 'flyBack', 'xout'); karc(DOWN + 0.04, 784, 0, 5.42, 640, 0, 34); kb(5.42, 'skid', 'xout'); kb(5.7, 'kneel', 'io'); kp(5.6, 628, 0, 'out');
    sfx(5.42, 'landHard', 0.7, 1); ev.push([5.42, l => l.dust(640, 8, 80, { a: 0.24 })]);
    sb(5.2, 'sovReady', 'io'); sp(5.3, 812);

    // ── the fragment through the floor; the arms come back ──
    kb(5.78, 'kneel', 'in', { rArm: 70, rFore: 86, torso: 40 }); kb(SLAP, 'plant', 'xout');
    K.stops.push([SLAP, 0.25, 0.08]);
    ev.push([SLAP, l => {
      l.sfx('stingImpact', 0.9, 0.8); l.sfx('explosion', 0.4, 1.3); l.sfx('hitZap', 0.6, 0.7); l.shake(14);
      l.ring(650, G, 260, { sq: 0.14, col: cyan, w: 5, life: 30 }); l.ring(650, G, 160, { sq: 0.14, col: '#ffffff', w: 2, life: 18 });
      l.crack(650, 160, { col: cyan, life: 70 }); l.debris(650, G - 2, 18, { kind: 'spark', col: '#5fe8ff', v: 4.4, r: 1.6, g: 0.14, spread: 120, life: 34 });
      l.flash('#00d4ff', 0.18, 10);
    }]);
    // Canon: the fragment as broadcast does nothing to him. The ring runs under his feet and on; he does not move.
    sb(SLAP + 0.2, 'sovReady', 'io', { headTilt: 18 }); sb(6.4, 'sovReady', 'io', { headTilt: 4 });
    kb(6.1, 'rising', 'out'); kb(6.42, 'guard', 'out'); kp(6.1, 634);
    // Arms: katana, then hammer for the floor, then katana for the cut.
    const KW = [[0, 'katana']], KWON = [[0, false], [FORM, true]], KA = [[0, 0], [FORM, 0], [FORM + 0.35, 1, 'in']];
    ev.push([FORM, l => { l.manifest('k', cyan, 0.45); l.sfx('phaseUp', 0.6, 1); }]);
    kb(6.62, 'runA', 'out'); kb(6.74, 'runB'); kp(6.6, 640); kp(6.86, 742, 0, 'in'); whoosh(6.64);
    kb(6.82, 'windBack', 'out', { rArm: -160, rFore: -140 }); kb(6.94, 'slashOut', 'xout', { rArm: -30, rFore: -22 }); swish(6.9, 1.1);
    sb(6.7, 'sovBlock', 'out', { rFore: -84, rArm: 30 }); sb(6.94, 'sovBlock', 'io', { rFore: -84, rArm: 30 }); clash(6.94, 0.3, cyan);
    // The katana goes to light and a hammer forms out of it on the way up.
    ev.push([7.06, l => { l.disperse('k', cyan, 0.4); }]); KA.push([7.06, 1], [7.1, 0], [7.16, 0], [7.3, 1, 'in']); KW.push([7.14, 'hammer']);
    ev.push([7.16, l => { l.manifest('k', cyan, 0.3); l.sfx('phaseUp', 0.5, 1.3); }]);
    kb(7.12, 'highGuard', 'out'); kb(HAM, 'cutDown', 'xout', { rArm: 30, rFore: 70, torso: 40 }); swish(HAM - 0.08, 0.7); kp(7.12, 750); kp(HAM, 770, 0, 'out');
    sb(7.22, 'sovLean', 'out'); sp(7.2, 812); sp(HAM - 0.04, 860, 0, 'out'); sb(HAM + 0.1, 'sovReady', 'io');
    K.stops.push([HAM, 0.22, 0.08]);
    ev.push([HAM + 0.02, l => { const tp = l.tip('k'); l.sfx('explosion', 0.6, 1); l.sfx('landHard', 0.8, 0.8); l.shake(16); l.ring(tp.x, G, 150, { sq: 0.15, col: cyan, w: 4, life: 24 }); l.crack(tp.x, 110, { col: cyan, life: 60 }); l.debris(tp.x, G - 2, 22, { col: '#202a2c', v: 5.4, r: 3 }); l.debris(tp.x, G - 2, 12, { kind: 'spark', col: '#5fe8ff', v: 4, r: 1.6, g: 0.16, spread: 140, life: 28 }); l.dust(tp.x, 8, 90, { a: 0.24 }); }]);
    // He answers the hammer with the spear from the pocket; then the katana again, and his sword.
    const SW = [[0, AS.COUNTER.katana]], SA = [[0, 1]];
    const pull = (t, wk) => { SA.push([t, 1], [t + 0.1, 0], [t + 0.2, 0], [t + 0.36, 1, 'in']); SW.push([t + 0.16, wk]); ev.push([t, l => AS.portal(l, 's', 0.5)]); };
    pull(7.5, AS.COUNTER.hammer);
    ev.push([7.66, l => { l.disperse('k', cyan, 0.4); }]); KA.push([7.66, 1], [7.7, 0], [7.76, 0], [7.9, 1, 'in']); KW.push([7.74, 'katana']);
    ev.push([7.76, l => { l.manifest('k', cyan, 0.3); l.sfx('phaseUp', 0.5, 1.1); }]);
    kb(7.7, 'guard', 'io');
    sb(7.82, 'sovReady', 'out', { rArm: 140, rFore: 160, torso: -4 }); sb(7.98, 'thrust', 'xout', { rArm: 0, rFore: 0 }); sp(7.98, 836, 0, 'xout'); swish(7.94, 1.2);
    kb(7.98, 'block', 'xout'); clash(7.98, 0.3); kp(7.98, 760, 0, 'out'); sb(8.12, 'sovReady', 'io');
    pull(8.06, AS.COUNTER.katana);
    // The cut that opens him.
    kb(8.16, 'iaido', 'out'); kb(CUT, 'slashOut', 'xout', { rArm: -10, rFore: 10 }); kp(8.16, 762); kp(CUT, 800, 0, 'out'); sfx(CUT - 0.06, 'swingHeavy', 0.9, 0.85);
    K.stops.push([CUT + 0.02, 0.12, 0.3]);
    ev.push([CUT + 0.03, l => {
      const p = AS.logCut(l, 'chest', 's', 'chest', CUT); AS.cutLine(l, p.x, p.y, -0.5, 30, '#ff7050');
      l.sfx('hitSlash', 1, 0.8); l.sfx('iaiMark', 0.8, 0.8); l.shake(10); l.impact(1, { tint: '#bfefff' });
      l.debris(p.x, p.y, 10, { kind: 'spark', col: '#ff8060', v: 3, r: 1.5, g: 0.08, spread: 120, dir: 0, life: 22 });
    }]);
    sb(CUT + 0.04, 'sovTakeBack', 'xout'); sp(CUT + 0.04, 844); sp(CUT + 0.3, 856, 0, 'out');
    // He looks down at it. It stays as it is.
    sb(8.9, 'sovLook', 'io', { headTilt: 34, lArm: 50, lFore: -20 }); sb(9.25, 'sovLook', 'io', { headTilt: 30, lArm: 50, lFore: -20 });
    kb(CUT + 0.3, 'slashOut', 'io', { rArm: -4, rFore: 16 }); kb(9.1, 'guard', 'io'); kp(9.1, 790);
    sfx(8.95, 'stingLow', 0.5, 0.7);

    // ── 4. an older draft ──
    sb(REACH, 'sovReady', 'io', { headTilt: -4 }); sb(9.9, 'sovReady', 'io', { headTilt: -6, hipDrop: 4 });
    sfx(REACH, 'soulRip', 0.5, 0.55); sfx(REACH + 0.1, 'stingLow', 0.8, 0.45); ev.push([REACH + 0.2, l => l.shake(4)]);
    // No wind-up: he is there, and the palm has already landed.
    sp(10.18, 856); sp(10.2, 804, 0, 'lin'); sb(10.18, 'sovReady'); sb(PALM, 'sovPalm', 'xout', { lArmLen: 1.2 });
    hit(PALM, 's', 'lHand', 'k', 'chest', 'heavy', 22); K.stops.push([PALM + 0.01, 0.1, 0.2]);
    ev.push([PALM + 0.02, l => { l.impact(2, { tint: '#ffb0a0' }); l.sfx('explosion', 0.6, 0.6); l.sfx('stingImpact', 0.9, 0.5); l.disperse('k', cyan, 0.6); l.lines(20, { col: '#ffd0c0' }); }]);
    KWON.push([PALM + 0.02, false]);
    kb(PALM + 0.04, 'flyBack', 'xout'); karc(PALM + 0.02, 790, 0, 10.9, 560, 0, 46); kb(10.9, 'fallen', 'xout'); kp(11.15, 540, 0, 'out');
    sfx(10.9, 'landHard', 0.9, 0.8); ev.push([10.9, l => { l.dust(560, 10, 110, { a: 0.3 }); l.shake(10); }]);
    sb(10.5, 'sovReady', 'io', { headTilt: 4 });
    // He walks to him; the door opens behind Kael.
    K.SB.push(...AS.walk(10.8, 11.5, 0.23, null, 'sovWalkA', 'sovWalkB')); sp(10.8, 830); sp(11.5, 640, 0, 'lin');
    kb(11.3, 'pushUp', 'io', { headTilt: -20 }); kb(11.7, 'kneel', 'io', { headTilt: -14 }); kp(11.7, 560);
    ev.push([DOOR, l => { l.sfx('portalOpen', 0.9, 0.6); l.sfx('stingLow', 0.6, 0.6); l.shake(4); }]);
    sb(11.6, 'sovReady', 'io', { headTilt: 14 }); sp(11.75, 578, 0, 'io');
    sb(12.0, 'sovReady', 'in', { lArm: 160, lFore: 176, headTilt: 4 }); sb(THROW, 'sovPalm', 'xout', { lArmLen: 1.15, torso: 24 }); hit(THROW, 's', 'lHand', 'k', 'chest', 'heavy', 10);
    kb(THROW + 0.04, 'flyBack', 'xout'); kp(THROW, 560); kp(12.42, DOORX + 4, 6, 'out');
    sb(12.4, 'sovReady', 'io');
    // Through, and he steps in after him; the door closes on an empty room.
    a.k.hidden = [[0, false], [12.42, true]];
    a.k.alphaK = [[0, 1], [12.3, 1], [12.42, 0, 'in']];
    ev.push([12.42, l => { l.sfx('portalOpen', 0.6, 0.45); l.ring(DOORX, G - 75, 60, { col: red, w: 3, life: 16 }); }]);
    K.SB.push(...AS.walk(12.5, 12.8, 0.15, null, 'sovWalkA', 'sovWalkB')); sp(12.5, 578); sp(12.8, DOORX + 6, 0, 'lin');
    a.s.hidden = [[0, false], [12.82, true]];
    a.s.alphaK = [[0, 1], [12.7, 1], [12.82, 0, 'in']];
    ev.push([13.1, l => { l.sfx('portalOpen', 0.4, 1.6); }]);
    kb(14, 'kneel'); sb(14, 'sovReady');

    a.k.wkey = KW; a.k.weapon = KWON; a.k.wAlphaK = KA; a.s.wkey = SW; a.s.wAlphaK = SA;
    K.finish();
    CA.blows(L, K.blows);
    a.k.trail = [[1.3, 1.6, 3, 0.03, 0.22], [2.66, 3.3, 3, 0.03, 0.22], [6.6, 6.98, 3, 0.03, 0.2], [7.1, 7.5, 2, 0.03, 0.2], [8.14, CUT + 0.1, 4, 0.025, 0.26], [PALM, 10.9, 3, 0.03, 0.22]];
    a.k.trailColor = cyan;
    a.s.trail = [[2.05, 2.2, 2, 0.04, 0.2], [3.9, 4.25, 2, 0.04, 0.2], [4.75, 5.1, 2, 0.04, 0.2], [10.12, 10.3, 4, 0.02, 0.3], [12.0, 12.25, 2, 0.04, 0.2]]; a.s.trailColor = red;
    a.s.blinks = [10.19];
    L.spec.speed = CA.hitch(K.stops.sort((p, r) => p[0] - r[0]));
    L.spec.cam = [
      // Where Tyrant left them; in on him as it comes up through him.
      [0, 760, 72, 2.2], [WAKE, 700, 60, 2.7, 'sine'], [WAKE + 0.4, 705, 64, 2.6, 'sine'],
      ...CA.follow(L, 'k', 's', 1.2, 5.0, { zMax: 2.6, zMin: 1.8, lift: 18, cut: false }),
      ...CA.follow(L, 'k', 's', 5.0, 5.8, { zMax: 2.0, zMin: 1.6, lift: 12, cut: false }),
      // The palm on the floor: wide enough for the ring to reach him.
      [SLAP, 720, 70, 1.75, 'sine'], [6.3, 715, 72, 1.85, 'sine'],
      ...CA.follow(L, 'k', 's', 6.4, CUT + 0.1, { zMax: 2.5, zMin: 1.8, lift: 16, cut: false }),
      // The wound: on him.
      [CUT + 0.35, 846, 74, 3.0, 'sine'], [9.3, 848, 76, 3.2, 'sine'],
      // His face as he reaches back.
      [REACH + 0.05, 850, 90, 3.6, 'hold'], [10.1, 850, 90, 3.8, 'sine'],
      // The palm, wide.
      [10.16, 760, 74, 2.1, 'hold'], [10.95, 640, 70, 1.9, 'sine'],
      [11.5, 600, 76, 1.9, 'sine'], [12.3, 560, 80, 2.0, 'sine'], [13.2, 545, 80, 2.15, 'sine'], [14, 545, 82, 2.2, 'sine'],
    ];
  },
  tick: function (H) { FILM.tick(H); },
};
