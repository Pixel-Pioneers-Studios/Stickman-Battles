'use strict';
// Down through the roof and every floor, back into the bottom room (count 1, TYRANT). Kael gets up with everything the
// fragment has; Sovereign is reciting now, so every answer is already there. The sword goes through him. His light goes
// out from the hands in, the katana goes to light, and he goes down. Sovereign turns his back on him and walks to the
// screen; the recordings go back to losing on their loops. Fade out: the film looks over.
module.exports = {
  arena: 'city', frames: 819, endC: 10.8,
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    AS.stage(); AS.mini = CA.proxy(AS.red, 'katana'); CR.veins = [];
    const red = AS.red, cyan = AS.cyan;
    const LAND = 0.36, UP = 3.0, C1 = 3.62, C2 = 3.86, RUN = 4.16, OUT = 5.4, TURN = 7.1;
    const near = [470, 610, 1180, 1320].map((x, i) => ({ x, seed: i * 7 + 53 }));
    const lampK = [[0, 0.34], [UP - 0.4, 0.34], [UP, 0.2], [RUN, 0.2], [RUN + 0.05, 0.42], [10.8, 0.42]];
    const kVeinK = [[0, 0.5], [1.6, 0.5], [UP, 1.6, 'out'], [RUN, 1.6], [RUN + 1.2, 0, 'in']];
    let memo = null;
    const ahead = () => {
      if (memo && memo.c === L.D.c) return memo;
      const s = L.state(L.actors.k, L.D.c + 0.32), q = Object.assign({}, s.q);
      memo = { c: L.D.c, q: Math.abs(q.rot || 0) > 0.3 ? L.resolve('kneel') : (q.rot = 0, q), face: s.face };
      return memo;
    };
    L.setup(H, {
      tempo: 1, vignette: 0.62, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c, v = L.view(), A = ahead(), lamp = L.curve(lampK, t)[0];
        AS.paintLab(c, {
          near, redK: 1, lamp: () => lamp, mon: { x: 1000, n: 1, label: 'TYRANT', k: 1 },
          // Reciting: every recording a beat ahead of him; once he is down, back to their own loops.
          colState: () => t < TURN ? { stop: 1, mimicQ: A.q, mimicFace: A.face, look: 0 } : { stop: Math.max(0, 1 - (t - TURN) / 0.8) },
        });
        c.save(); c.fillStyle = '#0a0d0e'; c.fillRect(v.x0 - 40, v.y0 - 40, v.x1 - v.x0 + 80, Math.max(0, G - 372 - (v.y0 - 40)));
        c.fillStyle = 'rgba(160,190,185,0.08)'; c.fillRect(770, G - 400, 100, 28); c.restore();
      },
      actors: {
        k: { scale: 1, z: 2, beats: [[0, 'heldUp', 'io', { rot: -60 }]], pos: [[0, 800, 360]], face: [[0, -1]], weapon: [[0, false]],
          aura: [[0, 0.4], [1.6, 0.4], [UP, 1.3, 'out'], [RUN, 1.3], [RUN + 0.6, 0, 'in']],
          glowK: [[0, 0.3], [1.6, 0.3], [UP, 1, 'out'], [RUN, 1], [RUN + 0.5, 0, 'in']],
          eyes: [[0, 1], [RUN + 0.6, 1], [RUN + 1.0, 0, 'in']], expr: [[0, 'hurt'], [2.4, 'angry'], [RUN, 'hurt'], [OUT, 'neutral']],
          post: (c, L) => AS.bodyVeins(c, L, 'k', L.curve(kVeinK, L.D.c)[0], AS.ARMS, 11, 1.4) },
        s: { scale: 1.08, z: 1, wAbs: true, wkey: [[0, AS.COUNTER.katana]], weapon: [[0, true]], beats: [[0, 'sovCatch']], pos: [[0, 840, 400]], face: [[0, -1]],
          aura: [[0, 0.5], [TURN, 0.3]], auraColor: red, eyes: [[0, 1]], eyeColor: red, expr: [[0, 'neutral']],
          post: (c, L) => { AS.wound(c, L, 's', 1); AS.wound(c, L, 's', 1, red, 0.15, 0.3); AS.reach(c, L, 's', L.curve([[0, 0.5], [UP, 0.3], [TURN, 0]], L.D.c)[0]); } },
      },
      cam: [[0, 820, 160, 1.6]],
      ev: [],
    });
    const a = L.actors, K = AS.kit(L), { kb, sb, kp, sp, karc, sarc, sfx, swish, whoosh, clash, hit } = K, ev = L.spec.ev;
    K.kf(0, -1); K.sf(0, -1);

    // ── down through the hole, into the floor ──
    for (let i = 0; i < 4; i++) ev.push([0.02 + i * 0.05, l => l.debris(780 + Math.random() * 80, G - 390, 8, { col: '#2a3335', v: 2, r: 3, g: 0.4, dir: 90, spread: 60, life: 60 })]);
    kb(LAND, 'fallen', 'in'); kp(LAND, 790, 0, 'in'); sb(LAND, 'crouchLand', 'xout', { lArm: 70, lFore: 90 }); sp(LAND, 840, 0, 'in');
    K.stops.push([LAND, 0.15, 0.12]);
    ev.push([LAND, l => { l.sfx('explosion', 0.9, 0.55); l.sfx('landHard', 1.1, 0.6); l.shake(26); l.impact(2, { tint: '#ffb0a0' }); l.dust(800, 12, 180, { a: 0.35 }); l.debris(800, G - 2, 24, { col: '#202a2c', v: 5.4, r: 3 }); l.ring(800, G, 160, { sq: 0.15, col: '#ffe9a0', w: 4, life: 24 }); }]);
    kb(LAND + 0.2, 'fallen', 'io', { headTilt: -20 });
    // He lets go and steps back to his distance.
    sb(0.9, 'sovReady', 'io'); K.SB.push(...AS.walk(1.1, 1.6, 0.25, null, 'sovWalkA', 'sovWalkB')); sp(1.1, 840); sp(1.6, 876, 0, 'lin'); K.sf(1.08, 1); K.sf(1.62, -1); a.s.pivot = 0.1;
    sb(1.7, 'sovReady', 'io', { headTilt: 4 });

    // ── up with everything it has ──
    kb(1.4, 'pushUp', 'io', { headTilt: -20 }); kb(2.0, 'kneel', 'io', { headTilt: -10 }); kb(2.5, 'rising', 'io'); kb(UP, 'guard', 'out'); K.kf(1.9, 1); kp(1.4, 790); kp(2.5, 760, 0, 'io');
    sfx(1.7, 'stingRise', 0.7, 0.7); sfx(2.4, 'hitZap', 0.5, 0.6);
    ev.push([UP - 0.05, l => { l.surge('k', cyan, 1.4); l.sfx('phaseUp', 0.8, 0.7); l.sfx('stingImpact', 0.7, 0.9); l.shake(8); l.crack(760, 200, { col: cyan, life: 90 }); l.ring(760, G, 220, { sq: 0.15, col: cyan, w: 4, life: 26 }); }]);
    const KW = [[0, 'katana']], KWON = [[0, false], [UP, true]], KA = [[0, 0], [UP, 0], [UP + 0.3, 1, 'in']];
    ev.push([UP, l => l.manifest('k', cyan, 0.4)]);
    // Two cuts, both already answered; the thrust, and his sword is through him first.
    kb(3.3, 'runA', 'out'); kb(3.42, 'runB'); kp(3.3, 760); kp(3.56, 812, 0, 'in'); whoosh(3.32);
    kb(3.5, 'windBack', 'out', { rArm: -160, rFore: -140 }); kb(C1, 'slashOut', 'xout', { rArm: -30, rFore: -22 }); swish(C1 - 0.05);
    sb(3.3, 'sovBlock', 'out', { rFore: -84, rArm: 30 }); sb(C1, 'sovBlock', 'io', { rFore: -84, rArm: 30 }); clash(C1, 0.3, cyan);
    kb(3.74, 'highGuard', 'out'); kb(C2, 'cutDown', 'xout', { rArm: -10, rFore: 14, torso: 14 }); swish(C2 - 0.05, 0.9);
    sb(3.72, 'sovLean', 'xout'); sp(3.7, 876); sp(C2, 892, 0, 'out'); sb(C2 + 0.1, 'sovLean', 'io');
    kb(4.0, 'guard', 'in'); kb(RUN, 'thrust', 'xout', { rArm: -16, rFore: -16 }); kp(C2, 820); kp(RUN, 836, 0, 'xout');
    sb(4.02, 'sovReady', 'out', { rArm: 140, rFore: 160, torso: -4 }); sb(RUN, 'thrust', 'xout', { rArm: 0, rFore: 0 }); sp(RUN, 904, 0, 'xout'); sfx(RUN - 0.05, 'swingHeavy', 0.9, 0.8);
    K.stops.push([RUN + 0.01, 0.16, 0.3]);
    ev.push([RUN + 0.02, l => {
      const J = l.joints('k'), p = { x: J.shoulder.x * 0.6 + J.hip.x * 0.4, y: J.shoulder.y * 0.6 + J.hip.y * 0.4 };
      const b = l.onBlade('s', p, RUN + 0.02); (l.D.log.cuts || (l.D.log.cuts = {})).through = b.d;
      l.sfx('hitPierce', 1, 0.6); l.sfx('stingImpact', 1, 0.45); l.sfx('soulRip', 0.6, 0.6); l.shake(16); l.impact(2, { tint: '#ffb0a0' });
      l.debris(p.x, p.y, 16, { kind: 'spark', col: '#ff8060', v: 3.4, r: 1.6, g: 0.1, spread: 80, dir: 180, life: 30 });
      l.disperse('k', cyan, 1.2);
    }]);
    KWON.push([RUN + 0.03, false]);
    // His light goes out from the hands in; motes leaving him.
    for (let i = 0; i < 5; i++) ev.push([RUN + 0.3 + i * 0.22, l => { const J = l.joints('k'); l.debris(J.shoulder.x, J.shoulder.y, 4, { kind: 'spark', col: cyan, v: 0.8, r: 1.4, g: -0.02, spread: 120, dir: -90, life: 50 }); l.sfx('hitZap', 0.18 - i * 0.03, 0.5); }]);
    kb(RUN + 0.06, 'thrust', 'io', { rArm: 40, rFore: 70, torso: 20, headTilt: 20 }); kb(5.0, 'folded', 'io', { headTilt: 30 });
    sb(RUN + 0.3, 'thrust', 'io', { rArm: 2, rFore: 2, headTilt: 6 }); sb(5.1, 'thrust', 'io', { rArm: 2, rFore: 2, headTilt: 10 });
    // Out. Knees; down.
    sb(OUT, 'sovReady', 'out', { rArm: 120, rFore: 150 }); sp(OUT, 904); sp(5.7, 916, 0, 'out'); sfx(OUT, 'hitSlash', 0.6, 0.6);
    kb(OUT + 0.08, 'kneel', 'in', { headTilt: 30, torso: 40 }); kp(OUT, 836); kp(6.0, 812, 0, 'io');
    sfx(5.6, 'landHard', 0.5, 0.9);
    kb(6.2, 'kneel', 'io', { headTilt: 40, torso: 50 }); kb(6.7, 'fallen', 'in'); kp(6.7, 700, 6, 'in'); sfx(6.7, 'landHard', 0.7, 0.75);
    ev.push([6.7, l => { l.dust(710, 8, 80, { a: 0.24 }); l.shake(4); }]); kb(10.8, 'fallen');
    // He looks; turns his back; walks to the screen.
    sb(6.2, 'sovLook', 'io', { headTilt: 24 }); sb(6.9, 'sovLook', 'io', { headTilt: 30 });
    K.sf(TURN, 1); sb(TURN + 0.2, 'sovReady', 'io');
    K.SB.push(...AS.walk(TURN + 0.3, 8.7, 0.34, null, 'sovWalkA', 'sovWalkB')); sp(TURN + 0.3, 916); sp(8.7, 1000, 0, 'lin'); sb(8.9, 'sovReady', 'io', { headTilt: -10 });
    sfx(TURN + 0.2, 'stingLow', 0.5, 0.5);
    a.k.wkey = KW; a.k.weapon = KWON; a.k.wAlphaK = KA; a.k.trail = [[3.3, 3.6, 5, 0.03, 0.25], [C2, RUN + 0.05, 4, 0.03, 0.22]]; a.k.trailColor = cyan;
    a.k.below = [0, LAND]; a.s.below = [0, LAND];
    // Falling in from the hole above.
    K.KP.unshift([0, 800, 360], ...CA.arc(0, 800, 360, LAND - 0.01, 792, 4, 360, 6));
    K.SP.unshift([0, 836, 400], ...CA.arc(0, 836, 400, LAND - 0.01, 840, 4, 400, 6));
    K.finish();
    K.solveClash(C1, 's', 40);
    // The thrust: his blade through the middle of Kael.
    {
      const bt = a.s.beats.find(q => Math.abs(q[0] - RUN) < 1e-6), base0 = Object.assign({}, L.POSES.stand, L.POSES.thrust, bt[3]); let best = null;
      for (let d0 = -40; d0 <= 40; d0 += 3) for (let d1 = -40; d1 <= 40; d1 += 3) {
        bt._q = L.resolve(bt[1], Object.assign({}, bt[3], { rArm: base0.rArm + d0, rFore: base0.rFore + d1 }));
        const J = L.joints('k', RUN + 0.02), p = { x: J.shoulder.x * 0.6 + J.hip.x * 0.4, y: J.shoulder.y * 0.6 + J.hip.y * 0.4 }, b = L.onBlade('s', p, RUN + 0.02);
        const cost = b.d + (b.u < 0.4 || b.u > 0.8 ? 30 : 0) + 0.03 * (Math.abs(d0) + Math.abs(d1));
        if (!best || cost < best.cost) best = { d0, d1, cost, d: b.d, u: b.u };
      }
      bt[3] = Object.assign({}, bt[3], { rArm: base0.rArm + best.d0, rFore: base0.rFore + best.d1 }); bt._q = null;
      for (const nb of a.s.beats) if (nb !== bt && nb[1] === 'thrust') { nb[3] = Object.assign({}, nb[3], { rArm: bt[3].rArm, rFore: bt[3].rFore }); nb._q = null; }
      L.D.log.thrust = best;
    }
    CA.blows(L, K.blows);
    L.spec.speed = CA.hitch(K.stops.sort((p, r) => p[0] - r[0]));
    L.spec.fade = [[0, 0.6], [0.3, 0, 'out'], [9.6, 0], [10.5, 1, 'in']];
    L.spec.cam = [
      [0, 820, 300, 1.5, 'hold'], [LAND, 810, 80, 1.8, 'in'], [1.2, 810, 70, 2.0, 'sine'],
      [2.0, 790, 76, 2.3, 'sine'], [UP, 780, 84, 2.5, 'sine'],
      ...CA.follow(L, 'k', 's', 3.2, RUN, { zMax: 2.5, zMin: 1.9, lift: 18, cut: false }),
      // Close on it.
      [RUN + 0.05, 852, 92, 3.4, 'hold'], [OUT, 852, 88, 3.6, 'sine'],
      [OUT + 0.3, 800, 70, 2.2, 'sine'], [6.9, 760, 50, 2.4, 'sine'],
      // Him walking away from it; the room.
      [TURN, 820, 90, 1.8, 'sine'], [8.8, 880, 110, 1.45, 'sine'], [10.8, 880, 120, 1.35, 'sine'],
    ];
  },
  tick: function (H) { FILM.tick(H); },
};
