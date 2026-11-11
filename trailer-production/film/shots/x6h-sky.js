'use strict';
// Act 2, the sky. He takes the floor away (the game's "floor was a courtesy") and calls the meteors down ("Look up"). Kael
// goes up them, rock to rock, cuts through the big one and leaps for him. "I was already there": Reality Slash shears
// the whole sky, the palm hits Kael in the back and sends him down onto a rock. Galaxy Sweep: two arms of stars turning
// round him, shredding the rain; the arm that reaches Kael comes apart round his interference and he goes in along it.
// Hands in the air. Then "down" points up (canon): every rock and Kael fall upward. Kael lands feet-first on the belly
// of the big rock, runs along it hanging upside down, and pushes off, blade first, at the man who is holding the whole
// thing up. The hit breaks it: down is down, the floor is back, the rocks come down round them.
module.exports = {
  arena: 'void', frames: 800, endC: 11,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff';
    CA.stage();
    const LOOK = 0.3, WITHDRAW = 0.95, LEAP = 1.1, L1 = 1.62, J2 = 1.85, L2 = 2.3, BIG = 2.62, L3 = 2.98, J4 = 3.14, CUTAIR = 3.5, SLASH = 3.62, PALM = 3.8, L5 = 4.3;
    const GAL = 4.5, J6 = 4.86, L6 = 5.26, ARM = 5.5, RUN = 5.9, AIR = 6.3, A2 = 6.46, A3 = 6.6, A4 = 6.76, INV = 7.0, ROOF = 7.7, DIVE = 8.3, HIT = 8.62, BACK = 9.0, LAND = 9.72, END = 11;
    const crustK = [[0, 0.2]];
    // [born, x0, h0, vx, vy, r, seed]: rock paths are pure functions of time. Down turns round at INV and back at HIT.
    const rock = (b, x0, h0, vx, vy, r, sd, cut) => ({ b, x0, h0, vx, vy, r, sd, cut });
    const pos = (m, c) => {
      const d = Math.max(0, c - m.b), toInv = Math.min(d, Math.max(0, INV - m.b)), inv = Math.max(0, Math.min(c, HIT) - Math.max(INV, m.b)), af = Math.max(0, c - Math.max(HIT, m.b));
      let x = m.x0 + m.vx * d, h = m.h0 + m.vy * toInv, v = m.vy;
      h += v * inv + 0.5 * m.inv * inv * inv; v += m.inv * inv;
      h += v * af - 0.5 * 900 * af * af;
      return { x, h };
    };
    const vel = (m, c) => { const e = 0.01, a = pos(m, c), b = pos(m, c + e); return { vx: (b.x - a.x) / e, vy: -(b.h - a.h) / e }; };
    const steps = [
      // The ones he rides or cuts. A: first foothold. B: second. BIGR: the big one he cuts. D: launch for the leap. E: where the palm sends him. F: into the sweep.
      rock(0.55, 926, 396, -240, -240, 19, 1), rock(1.05, 930, 500, -160, -240, 18, 2), rock(1.7, 900, 610, -160, -270, 38, 3), rock(1.75, 860, 560, -120, -220, 19, 4),
      rock(3.3, 840, 400, -160, -280, 24, 5), rock(4.4, 760, 330, -180, -180, 22, 6),
      // The roof: the one that stops and hangs (decelerated to a stand almost exactly when Kael reaches it).
      rock(4.9, 1090, 895, -100, -150, 62, 7),
    ];
    const [A, B, BIGR, D, E, F, Z] = steps;
    const rain = [];
    { const r = CA.srand(808); for (let i = 0; i < 44; i++) { const b = 0.35 + r() * 5.9, sp = 270 + r() * 200, x0 = 520 + r() * 680, h0 = 460 + r() * 200; rain.push(rock(b, x0, h0, -sp * 0.6, -sp, 7 + r() * 13, 20 + i, b < SLASH && b + 2 > SLASH)); } }
    const all = steps.concat(rain);
    for (const m of all) m.inv = m === Z ? 200 : 620 + (m.sd * 37) % 400;
    const onTop = (m, c, dx) => { const p = pos(m, c); return [p.x + (dx || 0), p.h + m.r * 0.8]; };
    const ride = (m, c0, c1, dx) => { const o = []; for (let i = 0; i <= 6; i++) { const c = c0 + (c1 - c0) * i / 6, q = onTop(m, c, dx); o.push([c, q[0], q[1], 'lin']); } return o; };
    const zBelly = (c, dx) => { const p = pos(Z, c); return [p.x + (dx || 0), p.h - Z.r * 0.8]; };
    // Galaxy centre: at his chest. Keeps turning faster.
    const SX = 806, SH = 120, GALX = 770, GALH = 250;
    const galAng = c => { const d = Math.max(0, c - GAL); return -0.8 + d * 1.1 + d * d * 0.35; };
    const galK = c => L.curve([[0, 0], [GAL, 0], [GAL + 0.3, 1, 'out'], [AIR, 1], [AIR + 0.25, 0, 'in']], c)[0];
    const floorK = [[0, 0], [WITHDRAW, 0], [WITHDRAW + 0.6, 1, 'lin'], [HIT + 0.2, 1], [HIT + 0.7, 0, 'in']];
    const sl = { x: 0, y: 0 };
    const chest = (L) => { const J = L.joints('k'); return { x: (J.shoulder.x + J.hip.x) / 2, y: (J.shoulder.y + J.hip.y) / 2 }; };
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true,
      speed: CA.hitch([[BIG + 0.03, 0.35, 0.14], [SLASH, 0.3, 0.14], [PALM + 0.05, 0.3, 0.1], [ARM + 0.04, 0.4, 0.18], [INV, 0.4, 0.2], [HIT + 0.04, 0.2, 0.32]]),
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.75, galDy: 0 });
        // Rocks behind the fighters; the floor goes over them when it comes back.
        const big = BIGR;
        for (const m of all) {
          if (t < m.b) continue;
          const p = pos(m, t);
          if (p.h > 900 || (p.h < 0 && t > HIT + 0.7) || p.h < -60) continue;
          const v = vel(m, t), spin = m.sd + t * (1 + (m.sd % 3)) * (m.sd % 2 ? 1 : -1), heat = t > INV && t < HIT ? 0.3 : 1;
          if (m === big && t >= BIG) {
            // Cut through: two halves pushed apart across the line of the blade.
            const u = t - BIG; for (const sg of [-1, 1]) CA.rock(c, p.x + sg * (14 + u * 90), G - p.h + sg * u * 40, m.r * 0.66, m.sd + sg, spin + sg * u * 2, v.vx, v.vy, 0.7);
          } else if (m.cut && t >= SLASH) {
            const u = t - SLASH; for (const sg of [-1, 1]) CA.rock(c, p.x + sg * (3 + u * 50), G - p.h + sg * (3 + u * 30), m.r * 0.66, m.sd + sg, spin, v.vx, v.vy, heat);
          } else CA.rock(c, p.x, G - p.h, m.r, m.sd, m === Z ? 0.4 : (m === A || m === B || m === D || m === E || m === F) ? 0.2 : spin, v.vx, v.vy, heat);
        }
        CA.floorGone(c, 690, L.curve(floorK, t)[0]);
        const J = L.joints('s'), q = chest(L);
        const gk = galK(t);
        if (gk > 0.01) CA.galaxy(c, GALX, G - GALH, galAng(t), 460, gk, t, { gap: { x: q.x, y: q.y, r: 54 } });
        CA.realSlash(c, sl.x, sl.y, 26, (t - SLASH) / 0.32);
      },
      actors: {
        k: {
          beats: [[0, 'guard', 'io', { headTilt: -22 }], [LOOK + 0.2, 'guard', 'io', { headTilt: -34 }], [WITHDRAW, 'guard', 'io', { headTilt: -24 }], [LEAP - 0.05, 'crouch', 'io'], [LEAP + 0.1, 'airHigh', 'out'], [L1 - 0.1, 'tuck', 'lin'], [L1, 'crouchLand', 'xout'],
            [J2 - 0.04, 'crouch'], [J2 + 0.1, 'airHigh', 'out'], [L2 - 0.1, 'tuck', 'lin'], [L2, 'crouchLand', 'xout'], [BIG - 0.2, 'crouch', 'io'], [BIG - 0.1, 'highGuard', 'out', { rLeg: 40, rShin: 130, lLeg: 10, lShin: 100 }], [BIG, 'airCut', 'xout'], [L3 - 0.1, 'tuck', 'lin'], [L3, 'crouchLand', 'xout'],
            [J4 - 0.03, 'crouch'], [J4 + 0.12, 'airHigh', 'out'], [CUTAIR - 0.1, 'airHigh'], [CUTAIR, 'airCut', 'xout'], [SLASH, 'airCut'], [PALM, 'airCut', 'io', { torso: 30 }], [PALM + 0.05, 'folded', 'xout', { torso: 20, rLeg: 140, rShin: 170, lLeg: 120, lShin: 150, rArm: 160, rFore: 170, headTilt: -26 }],
            [L5 - 0.15, 'tuck', 'io', { rot: 300 }], [L5, 'crouchLand', 'xout'], [J6 - 0.06, 'crouch'], [J6 + 0.1, 'airHigh', 'out'], [L6 - 0.1, 'tuck', 'lin'], [L6, 'crouchLand', 'xout'], [ARM - 0.05, 'block', 'io'], [ARM + 0.04, 'block', 'xout', { torso: -14 }], [RUN - 0.05, 'block', 'io', { torso: -6 }],
            [RUN + 0.08, 'lunge', 'xout', { rLeg: 90, rShin: 150, lLeg: 30, lShin: 110 }], [AIR - 0.06, 'highGuard', 'io', { rLeg: 40, rShin: 130, lLeg: 10, lShin: 100 }], [AIR, 'cutCaught', 'in', { rLeg: 50, rShin: 120, lLeg: 20, lShin: 100 }], [A2 - 0.04, 'cutCaught', 'io', { rLeg: 50, rShin: 120, lLeg: 20, lShin: 100 }],
            [A2, 'kBlock', 'xout', { rLeg: 50, rShin: 120, lLeg: 20, lShin: 100 }], [A3 - 0.03, 'kBlock', 'io', { rLeg: 50, rShin: 120, lLeg: 20, lShin: 100 }], [A3, 'frontKick', 'xout', { rLeg: 90, rShin: 120 }], [A4 - 0.03, 'frontKick', 'io', { rLeg: 90, rShin: 120 }], [A4 + 0.05, 'headSnap', 'xout', { rLeg: 60, rShin: 100, lLeg: 34, lShin: 90 }],
            [INV + 0.2, 'knockedBack', 'io', { rot: -80 }], [ROOF - 0.18, 'tuck', 'io', { rot: -170 }], [ROOF, 'crouchLand', 'xout', { rot: -180 }], [ROOF + 0.12, 'runB', 'io', { rot: -180 }], [ROOF + 0.26, 'runA', 'io', { rot: -180 }], [ROOF + 0.4, 'runB', 'io', { rot: -180 }], [DIVE - 0.06, 'crouch', 'io', { rot: -180 }],
            [DIVE + 0.04, 'dive', 'xout', { rot: -180 }], [HIT, 'dive', 'lin', { rot: -180 }], [HIT + 0.3, 'knockedBack', 'out', { rot: -120 }], [LAND - 0.2, 'airCut', 'io', { rot: 0 }], [LAND, 'crouchLand', 'xout'], [10.2, 'crouchLand'], [END - 0.3, 'guard'], [END, 'guard', 'io', { headTilt: -22 }]],
          face: [[0, 1], [ROOF, -1], [HIT + 0.3, 1]], trail: [[LEAP, L1, 2, 0.03, 0.3], [J4, CUTAIR, 3, 0.03, 0.35], [PALM, L5, 3, 0.03, 0.35], [RUN, AIR, 3, 0.03, 0.4], [INV, ROOF, 3, 0.04, 0.3], [DIVE, HIT, 4, 0.025, 0.45]],
          below: [LAND - 0.1, LAND + 0.1], sink: [[0, false], [LAND - 0.02, true]],
          aura: [[0, 0.7], [BACK, 1], [END, 0.7]], glowK: [[0, 0.6], [DIVE, 1], [END, 0.6]], eyes: [[0, 1]], expr: [[0, 'intense'], [PALM + 0.05, 'hurt'], [L5, 'intense'], [A4 + 0.05, 'hurt'], [ROOF, 'intense']],
          post: (c, L) => CA.noise(c, chest(L).x, chest(L).y, L.curve([[0, 0.5], [ARM - 0.1, 0.5], [ARM, 1, 'out'], [RUN + 0.4, 0.6], [INV, 1, 'out'], [END, 0.5]], L.D.c)[0], L.D.c),
        },
        s: CA.actor({
          beats: [[0, 'caFloat', 'io', { headTilt: 12 }], [LOOK - 0.1, 'caFloat'], [LOOK + 0.2, 'caPalmUp', 'out'], [WITHDRAW - 0.1, 'caPalmUp'], [WITHDRAW, 'caPalmDown', 'xout'], [1.5, 'caPalmDown'], [2.2, 'caFloat'],
            [SLASH + 0.06, 'cross', 'xout', { rLeg: 94, rShin: 100, lLeg: 86, lShin: 96 }], [PALM - 0.04, 'caFloat', 'io'], [PALM, 'cross', 'xout', { rLeg: 94, rShin: 100, lLeg: 86, lShin: 96 }], [4.1, 'caFloat'],
            [GAL - 0.1, 'caFloat'], [GAL + 0.1, 'crSpread', 'out'], [AIR - 0.14, 'crSpread'], [AIR, 'parry', 'xout', { rLeg: 94, rShin: 100, lLeg: 86, lShin: 96 }], [A2 - 0.04, 'parry', 'io'], [A2, 'cross', 'xout', { rLeg: 94, rShin: 100, lLeg: 86, lShin: 96 }], [A2 + 0.09, 'cross', 'lin', { rLeg: 94, rShin: 100, lLeg: 86, lShin: 96 }], [A3 + 0.06, 'caRecoil', 'xout', { torso: -18 }], [A4 - 0.05, 'caFloat'], [A4, 'axeHand', 'xout', { rArm: -40, rFore: -60, rLeg: 94, rShin: 100, lLeg: 86, lShin: 96 }],
            [INV - 0.06, 'caFloat'], [INV, 'caPalmUp', 'xout'], [HIT - 0.02, 'caPalmUp'], [HIT + 0.14, 'caRecoil', 'xout', { torso: -30, headTilt: -24 }], [BACK + 0.2, 'caRecoil', 'out', { torso: -14 }], [10.2, 'caFloat', 'io', { headTilt: 10 }], [END, 'caFloat', 'io', { headTilt: 12 }]],
          face: [[0, -1], [SLASH - 0.1, 1], [PALM + 0.3, -1]], hidden: [[0, false], [CUTAIR - 0.1, true], [SLASH, false]], blinks: [CUTAIR - 0.1, SLASH, PALM + 0.3],
          crust: crustK, headCrust: [[0, 1]], kept: [[0, 0.9]], keptFace: [[0, 0]], neb: [[0, 1]], aura: [[0, 0.5], [GAL, 1], [AIR, 0.5], [INV, 1], [HIT, 0.4]], eyes: [[0, 1]],
        }),
      },
      cam: [
        [0, 750, 110, 1.5], [LOOK + 0.2, 750, 150, 1.4, 'sine'],
        // The rain arrives, then the floor goes from under Kael.
        [WITHDRAW - 0.15, 720, 60, 2.2, 'hold'], [LEAP, 720, 70, 2.1, 'sine'], [L1, 736, 120, 1.9, 'sine'], [L2, 770, 190, 1.8, 'sine'], [BIG, 770, 240, 1.9, 'sine'], [L3, 760, 260, 1.75, 'sine'],
        [CUTAIR, 790, 300, 2.0, 'sine'], [SLASH, 790, 296, 1.5, 'hold'], [PALM, 780, 280, 1.7, 'sine'], [L5, 700, 170, 1.7, 'out'],
        // The sweep: wide on the whole wheel, close on the block.
        [GAL, 730, 200, 1.05, 'hold'], [L6, 690, 196, 1.2, 'sine'], [ARM - 0.02, 640, 170, 1.7, 'sine'], [ARM, 630, 170, 2.6, 'hold'], [RUN, 630, 170, 2.8, 'sine'],
        [RUN + 0.01, 700, 190, 1.7, 'hold'], [AIR, 744, 226, 2.4, 'sine'], [A4, 744, 232, 2.8, 'sine'], [A4 + 0.1, 744, 240, 2.6, 'sine'],
        // Up: everything falling toward the top of the frame.
        [INV + 0.1, 750, 290, 1.5, 'out'], [ROOF, 770, 330, 1.55, 'sine'], [DIVE, 800, 310, 1.5, 'sine'], [HIT, 800, 260, 2.1, 'sine'], [HIT + 0.3, 800, 250, 2.3, 'sine'],
        [HIT + 0.31, 760, 150, 1.25, 'hold'], [LAND, 730, 100, 1.45, 'sine'], [END, 740, 110, 1.5, 'sine'],
      ],
      ev: [
        [LOOK, L => { L.sfx('stingRise', 0.7, 0.5); L.sfx('stingLow', 0.6, 0.5); }],
        [WITHDRAW, L => { L.sfx('stingImpact', 1, 0.4); L.sfx('explosion', 0.9, 0.3); L.shake(16); }], [LEAP, L => { L.sfx('jump', 0.8, 0.8); }],
        [L1, L => { L.sfx('land', 0.8, 0.8); L.debris(L.joints('k').hip.x, L.joints('k').lFoot.y, 8, { col: '#1a1a26', v: 3, r: 2.4 }); }], [J2, L => { L.sfx('jump', 0.6, 1); }], [L2, L => { L.sfx('land', 0.8, 0.9); L.debris(L.joints('k').hip.x, L.joints('k').lFoot.y, 8, { col: '#1a1a26', v: 3, r: 2.4 }); }],
        [BIG - 0.08, L => { L.sfx('swingHeavy', 1, 0.9); }],
        [BIG + 0.03, L => { const p = pos(BIGR, BIG); L.sfx('explosion', 1, 0.7); L.sfx('hitSlash', 1, 0.7); L.shake(12); L.burst(p.x, G - p.h, 24, '#ffe9c8'); L.debris(p.x, G - p.h, 18, { col: '#1a1a26', v: 7, r: 3.4, g: 0.12, spread: 360 }); L.D.log.big = L.onBlade('k', { x: p.x, y: G - p.h }); }],
        [L3, L => { L.sfx('land', 0.8, 1); }], [J4, L => { L.sfx('jump', 0.8, 0.9); L.lines(14, { dir: 0 }); }], [CUTAIR - 0.14, L => { const J = L.joints('s'); CA.blink(L, J.hip.x, J.hip.y - 20); }], [CUTAIR, L => { L.sfx('swingHeavy', 1, 0.8); }],
        [SLASH, L => { L.sfx('hitSlash', 1, 0.45); L.sfx('hitZap', 1, 0.5); L.sfx('soulRip', 0.8, 0.8); L.shake(14); L.flash('#e8eeff', 0.2, 8); const J = L.joints('s'); CA.blink(L, J.hip.x, J.hip.y - 20, { quiet: true }); }],
        [L5, L => { L.sfx('landHard', 0.9, 0.8); L.shake(9); const J = L.joints('k'); L.debris(J.hip.x, J.lFoot.y, 14, { kind: 'spark', col: star, v: 5, r: 2, g: 0.2 }); }],
        [GAL, L => { L.sfx('superActivate', 1, 0.5); L.sfx('stingRise', 0.8, 0.6); }],
        [J6, L => { L.sfx('jump', 0.7, 0.9); }], [L6, L => { L.sfx('land', 0.8, 0.8); }],
        [ARM + 0.04, L => { L.sfx('shieldUp', 1, 0.5); L.sfx('clang', 1, 0.6); L.shake(12); const q = chest(L); L.ring(q.x, q.y, 60, { col: cyan, w: 3, life: 16 }); L.debris(q.x + 26, q.y, 14, { kind: 'spark', col: star, v: 5, r: 2, g: 0.1, dir: -30, spread: 80 }); }],
        [RUN, L => { L.sfx('jump', 0.9, 0.7); L.sfx('swingHeavy', 1, 0.6); L.lines(18, { dir: 0 }); }],
        [INV, L => { L.sfx('stingImpact', 1, 0.35); L.sfx('soulRip', 0.8, 0.45); L.shake(14); const J = L.joints('s'); L.ring(J.rHand.x, J.rHand.y, 90, { col: star, w: 3, life: 18 }); }],
        [ROOF, L => { L.sfx('landHard', 0.9, 0.7); L.shake(8); const J = L.joints('k'); L.debris(J.lFoot.x, J.lFoot.y, 12, { col: '#1a1a26', v: 4, r: 3, g: -0.2, dir: 90, spread: 100 }); }],
        [DIVE, L => { L.sfx('jump', 1, 0.6); L.sfx('swingHeavy', 1, 0.5); const J = L.joints('k'); L.debris(J.lFoot.x, J.lFoot.y, 20, { col: '#1a1a26', v: 6, r: 3, g: -0.2, dir: 90, spread: 80 }); }],
        [HIT, L => {
          const t = L.tip('k'); L.sfx('heavyHit', 1, 0.4); L.sfx('hitPierce', 1, 0.5); L.sfx('explosion', 1, 0.45); L.sfx('stingImpact', 1, 0.5); L.shake(24); L.impact(1, { tint: '#bfe8ff' }); L.burst(t.x, t.y, 34, star); L.ring(t.x, t.y, 70, { col: cyan, w: 4, life: 14 }); L.lines(26, {});
          L.D.log.dive = { tip: [Math.round(t.x), Math.round(t.y)], chest: (() => { const p = CA.point('s', 'chest'); return [Math.round(p.x), Math.round(p.y)]; })() };
        }],
        [HIT + 0.26, L => { L.sfx('entranceCrash', 0.7, 0.7); }],
        [LAND, L => { L.sfx('landHard', 1, 0.7); L.shake(12); L.ring(690, G, 160, { sq: 0.18, col: star, w: 5, life: 26 }); L.crack(690, 70, { col: '#9fb4ff', life: 300 }); L.debris(690, G - 2, 14, { kind: 'spark', col: star, v: 5, r: 2, g: 0.15 }); }],
      ],
    });
    const k = L.actors.k, s = L.actors.s;
    // A rock coming down after the floor is back bursts on it, where and when it really lands.
    let bursts = 0;
    for (const m of all) {
      if (m.r < 10 && m !== Z) continue;
      for (let c = HIT + 0.7; c < END; c += 0.01) {
        const p = pos(m, c);
        if (c < m.b || p.h > 0) continue;
        if (pos(m, c - 0.01).h <= 0 || bursts >= 14) break;
        const big = m === Z; bursts++;
        L.spec.ev.push([c, L => { L.sfx('explosion', big ? 1.1 : 0.55, big ? 0.4 : 0.7); L.shake(big ? 18 : 5); L.ring(p.x, G, big ? 180 : 60 + m.r * 2, { sq: 0.16, col: '#ffe9c8', w: big ? 5 : 3, life: 20 }); L.debris(p.x, G - 2, big ? 34 : 10, { col: '#1a1a26', v: big ? 8 : 5, r: big ? 5 : 3 }); L.debris(p.x, G - 2, big ? 20 : 7, { kind: 'spark', col: '#ffe9c8', v: 5, r: 1.8, g: 0.18 }); if (big) L.crack(p.x, 110, { col: '#ffe9c8', life: 300 }); }]);
        break;
      }
    }
    L.D.log.bursts = bursts;
    // Kael's path, from rock to rock. Every landing is on where that rock is at that moment.
    const p1 = onTop(A, L1), j2 = onTop(A, J2), p2 = onTop(B, L2), b2 = onTop(B, BIG - 0.2), bj = pos(BIGR, BIG), p3 = onTop(D, L3), j4 = onTop(D, J4), p5 = onTop(E, L5), j6 = onTop(E, J6), p6 = onTop(F, L6), run = onTop(F, RUN);
    const air = [BIG, bj.x - 28, bj.h - 30];
    const Sair = [770, 196];
    k.pos = [[0, 690, 0], [LEAP, 690, 0], ...CA.arc(LEAP, 690, 0, L1, p1[0], p1[1], p1[1] + 32), ...ride(A, L1, J2),
      ...CA.arc(J2, j2[0], j2[1], L2, p2[0], p2[1], p2[1] + 34), ...ride(B, L2, BIG - 0.2), ...CA.arc(BIG - 0.2, b2[0], b2[1], BIG, air[1], air[2], air[2] + 6), ...CA.arc(BIG, air[1], air[2], L3, p3[0], p3[1], air[2] + 26), ...ride(D, L3, J4),
      ...CA.arc(J4, j4[0], j4[1], CUTAIR, 800, 294, 306), ...CA.arc(CUTAIR, 800, 294, PALM, 812, 282, 296)];
    k.pos.push(...CA.arc(PALM + 0.05, 812, 282, L5, p5[0], p5[1]), ...ride(E, L5, J6), ...CA.arc(J6, j6[0], j6[1], L6, p6[0], p6[1], p6[1] + 40), ...ride(F, L6, RUN), ...CA.arc(RUN, run[0], run[1], AIR, Sair[0] - 44, Sair[1] + 10, Sair[1] + 44),
      [A4, Sair[0] - 42, Sair[1] + 10, 'lin'], ...CA.arc(A4 + 0.02, Sair[0] - 42, Sair[1] + 10, INV, Sair[0] - 76, Sair[1] + 20));
    // Falling upward: gathering speed from INV to the belly of the roof rock (height allows for his being upside down).
    const FEET = 62, roof0 = zBelly(ROOF, -70), roofH = roof0[1] - FEET;
    k.pos.push(...[0.25, 0.5, 0.75, 1].map(u => [INV + (ROOF - INV) * u, Sair[0] - 76 + (roof0[0] - (Sair[0] - 76)) * u, Sair[1] + 20 + (roofH - Sair[1] - 20) * u * u, 'lin']));
    // Along the belly, hanging, to over his head; then the dive. The last key is corrected below so the tip lands on him.
    const roof1 = zBelly(DIVE, 30);
    k.pos.push([DIVE, roof1[0], roof1[1] - FEET, 'lin']);
    const hitKey = [HIT, 800, 260, 'lin'];
    k.pos.push(hitKey);
    const SPOS = [SX + 16, 252];
    k.pos.push(...CA.arc(HIT + 0.12, hitKey[1], hitKey[2], LAND, 690, 0, 300), [END, 690, 0]);
    s.pos = [[0, SX, SH], [2.2, GALX + 20, 222, 'io'], [CUTAIR - 0.1, GALX + 20, 222], [SLASH, 772, 288, 'hold'], [PALM, 772, 288], [PALM + 0.3, 772, 288], [PALM + 0.31, GALX, GALH - 60, 'hold'], [A4, GALX, GALH - 60, 'lin']];
    const SHIT = [SPOS[0], SPOS[1]];
    s.pos.push([INV, SHIT[0], SHIT[1], 'io'], [HIT, SHIT[0], SHIT[1]], ...CA.arc(HIT + 0.12, SHIT[0], SHIT[1], BACK + 0.4, SX + 14, SH + 10), [10.2, SX, SH, 'sine'], [END, SX, SH]);
    // Solve Kael's dive: put the tip of the katana on his chest at the moment of the hit, by moving the key itself.
    { const jt = HIT, ch = CA.point('s', 'chest', jt + 0.01), tp = L.tip('k', undefined, jt); hitKey[1] += ch.x - tp.x; hitKey[2] -= ch.y - tp.y; const tp2 = L.tip('k', undefined, jt); L.D.log.diveSolve = Math.round(Math.hypot(tp2.x - ch.x, tp2.y - ch.y)); }
    // The next arc starts from the corrected key.
    const arcFrom = k.pos.indexOf(hitKey) + 1, tail = CA.arc(HIT + 0.12, hitKey[1], hitKey[2], LAND, 690, 0, Math.max(hitKey[2] + 30, 300));
    k.pos.splice(arcFrom, tail.length, ...tail);
    // The line of the slash, through the point Kael is cutting.
    { const J = L.joints('k', SLASH); sl.x = J.hip.x; sl.y = J.hip.y - 30; }
    // Hands in the air.
    CA.blows(L, [
      { t: PALM, by: 's', with: 'rHand', on: 'k', at: 'chest', kind: 'heavy', impact: true },
      { t: AIR, by: 's', with: 'lHand', on: 'k', at: 'rFore', kind: 'block' },
      { t: A2, by: 's', with: 'rHand', on: 'k', at: 'lFore', kind: 'block' },
      { t: A3, by: 'k', with: 'lFoot', on: 's', at: 'gut', kind: 'jab', col: cyan },
      { t: A4, by: 's', with: 'rHand', on: 'k', at: 'head', kind: 'heavy' },
    ]);
    // The camera: keeps both in frame through the climb and the fall, with cuts in for the block and the hit.
    const ks = (c) => { const J = L.joints('k', c); return [J.hip.x, G - J.hip.y]; };
    const hp = (() => { const ch = CA.point('s', 'chest', HIT + 0.01), J = L.joints('k', HIT); return { x: (ch.x + J.hip.x) / 2, y: (ch.y + J.hip.y) / 2 }; })();
    L.spec.cam = [[0, 750, 110, 1.5], [LOOK + 0.2, 750, 150, 1.4, 'sine'],
      [WITHDRAW - 0.15, 700, 84, 1.45, 'hold'], [LEAP + 0.3, 704, 92, 1.4, 'sine'], ...CA.follow(L, 'k', 's', LEAP + 0.31, SLASH - 0.01, { zMax: 1.9, cut: false }), [SLASH, ks(SLASH)[0], ks(SLASH)[1], 1.25, 'hold'], [SLASH + 0.17, ks(SLASH)[0], ks(SLASH)[1], 1.3, 'sine'],
      ...CA.follow(L, 'k', 's', SLASH + 0.18, GAL - 0.01, { zMax: 1.9 }), [GAL, GALX - 40, GALH, 1.05, 'hold'], [L6, GALX - 60, GALH - 20, 1.15, 'sine'],
      ...CA.follow(L, 'k', 's', L6 + 0.01, ARM - 0.01, { cut: false, zMax: 1.7 }), [ARM, ks(ARM)[0], ks(ARM)[1], 2.6, 'hold'], [RUN, ks(RUN)[0] + 4, ks(RUN)[1], 2.8, 'sine'],
      ...CA.follow(L, 'k', 's', RUN + 0.01, INV, { zMax: 2.5 }), ...CA.follow(L, 'k', 's', INV + 0.1, DIVE, { zMax: 1.5, zMin: 1.1, lift: 46, cut: false }), ...CA.follow(L, 'k', 's', DIVE + 0.1, HIT - 0.01, { zMax: 1.8, cut: false }),
      [HIT, hp.x, G - hp.y, 2.5, 'hold'], [HIT + 0.3, hp.x, G - hp.y, 2.6, 'sine'],
      ...CA.follow(L, 'k', 's', HIT + 0.31, END, { zMax: 1.7 })];
    L.camera(true);
    // The arm reaches Kael: the shot's own numbers (logged): the gap in the arm passes round him at the block.
    L.D.log.arm = { ang: +galAng(ARM).toFixed(2) };
  },
  tick: function (H) { FILM.tick(H); },
};
