'use strict';
// Stage three (canon: DOMINATING, "he answers commitments you have not made"). No ghosts now: his answer comes first and
// Kael's attack arrives into it. The block is up before the cut, the foot is lifted before the sweep, the hand is open
// where the wrist will be. The small Kaels in the columns take each pose a beat before the real one does. Then he puts
// Kael through the floor, and through the floor below that. The count runs out on the bottom level: TYRANT, 1.
module.exports = {
  arena: 'city', frames: 1298, endC: 18.6,
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    AS.stage(); AS.mini = CA.proxy(AS.red, 'katana'); CR.veins = [];
    const red = AS.red, spark = '#ffe9a0', D = 400;
    // Levels: floor y of each, and its holes (x, half width, c it opens).
    const LV = [{ y: G, mon: 1330, lamp: 1 }, { y: G + D, mon: 1110, lamp: 0.72 }, { y: G + 2 * D, mon: 1000, lamp: 0.5 }];
    const SLAM = 6.55, CUT2 = 10.6;
    // The fragment beat on level one is inserted at INS: everything authored after it runs DUR later (M), except what
    // is written for the beat itself (RAW).
    const INS = 8.2, DUR = 3.4, PL = 9.08, PING = 10.2, VSP = 340; let RAW = false;
    const M = t => RAW || t < INS ? t : t + DUR;
    // Where the planted blade enters level one's floor, and how far the veins get toward him (solved after the beats).
    let VX = 880, CAPR = 100;
    const veinAt = x => x <= VX ? PL + (VX - x) / VSP : x <= VX + CAPR ? PL + (x - VX) / VSP : Infinity;
    LV[0].hole = { x: 978, w: 50, c: SLAM }; LV[1].hole = { x: 818, w: 52, c: M(CUT2 + 0.02) };
    LV[1].lampAt = x => { const td = veinAt(x), t = L.D.c; return t < td ? 0.72 : t < td + 0.25 ? 0.72 - 0.64 * (t - td) / 0.25 : 0.08; };
    LV[0].near = []; for (let i = 0; i < 6; i++) LV[0].near.push({ x: 362 + i * 137, seed: i * 5 + 2 });
    LV[1].near = [500, 637, 775, 1180, 1317].map((x, i) => ({ x, seed: i * 3 + 31 }));
    LV[2].near = [470, 610, 1180, 1320].map((x, i) => ({ x, seed: i * 7 + 53 }));
    const crackK = [[0, 0], [8.7, 0], [9.0, 1.2, 'out'], [PL, 1.8], [PL + 0.8, 1.2], [11.6, 0.7]];
    const noiseK = [[0, 0], [PING - 0.1, 0], [PING + 0.05, 1, 'out'], [10.85, 0.45], [11.6, 0]];
    const withG = (g, fn) => { const g0 = L.G; L.G = g; try { return fn(); } finally { L.G = g0; } };
    // The count, step by step, on every screen in the Lab.
    const COUNT = [[0, 12], [2.78, 9], [3.82, 7], [5.0, 6], [5.4, 5], [5.82, 4], [PL + 0.5, 3], [M(CUT2), 2], [M(13.3), 1]];
    const countAt = t => { let n = 12; for (const [c, v] of COUNT) if (t >= c) n = v; return n; };
    const levelOf = h => h > -D / 2 ? 0 : h > -1.5 * D ? 1 : 2;
    // The recorded Kaels a beat ahead of him.
    let memo = null;
    const ahead = () => {
      if (memo && memo.c === L.D.c) return memo;
      const s = L.state(L.actors.k, L.D.c + 0.32), q = Object.assign({}, s.q);
      const rolled = Math.abs(q.rot || 0) > 0.3;
      memo = { c: L.D.c, q: rolled ? L.resolve('kneel') : (q.rot = 0, q), face: s.face, lv: levelOf(L.state(L.actors.k, L.D.c).h) };
      return memo;
    };
    // The hole: a jagged top edge (what is left of the floor) and a rougher underside.
    const holePts = (hl, y, seed) => {
      const r = CA.srand(seed), top = [[hl.x - hl.w, y - 3]], bot = [];
      for (let i = 1; i < 8; i++) top.push([hl.x - hl.w + i * hl.w / 4, y - 4 + (i % 2 ? 4 + r() * 6 : 0)]);
      top.push([hl.x + hl.w, y - 3]); bot.push([hl.x + hl.w + 6 * (r() - 0.5), y + 34]);
      for (let i = 7; i >= 1; i--) bot.push([hl.x - hl.w + i * hl.w / 4, y + 34 - (i % 2 ? 3 + r() * 8 : 0)]);
      bot.push([hl.x - hl.w - 4, y + 34]);
      return { top, bot };
    };
    const holeShape = (c, hl, y, seed) => { const h = holePts(hl, y, seed); c.moveTo(h.top[0][0], h.top[0][1]); for (const p of h.top.concat(h.bot)) c.lineTo(p[0], p[1]); c.closePath(); };
    L.setup(H, {
      tempo: 1, vignette: 0.56, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c, v = L.view(), n = countAt(t), A = ahead();
        for (let i = LV.length - 1; i >= 0; i--) {
          const lv = LV[i], top = i ? LV[i - 1].y : v.y0 - 60, bot = lv.y + 28;
          if (bot < v.y0 || top > v.y1) continue;
          c.save(); c.beginPath(); c.rect(v.x0 - 30, top, v.x1 - v.x0 + 60, bot - top);
          if (lv.hole && t >= lv.hole.c) holeShape(c, lv.hole, lv.y, i * 13 + 5);
          c.clip('evenodd');
          withG(lv.y, () => AS.paintLab(c, {
            near: lv.near, redK: 1, backLimit: i === 0 ? 1125 : undefined, lamp: lv.lampAt || (() => lv.lamp),
            mon: { x: lv.mon, n, label: n <= 1 ? 'TYRANT' : 'DOMINATING' },
            colState: (x, nn) => {
              const broke = nn && nn.broke !== undefined ? nn.broke : i === 0 && Math.abs(x - 1047) < 2 ? -1 : i === 0 && Math.abs(x - 910) < 2 ? -1 : undefined;
              const dead = i === 1 && veinAt(x) < Infinity ? veinAt(x) : undefined;
              return A.lv === i ? { stop: 1, mimicQ: A.q, mimicFace: A.face, look: 0, broke, dead } : { stop: 1, look: 900, mimic: 'readyOpen', broke, dead };
            },
          }));
          if (i === 1) withG(lv.y, () => CR.drawVeins(c));
          c.restore();
          // The torn edge of the hole and the bars bent down into it.
          if (lv.hole && t >= lv.hole.c) {
            const hl = lv.hole, r = CA.srand(i * 7 + 2), k = Math.min(1, (t - hl.c) * 8);
            c.save(); c.strokeStyle = 'rgba(200,235,230,0.45)'; c.lineWidth = 1.4; c.beginPath(); const hp = holePts(hl, lv.y, i * 13 + 5); hp.top.forEach((p, j) => j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
            c.strokeStyle = '#2a3335'; c.lineWidth = 2.4;
            for (let j = 0; j < 6; j++) { const x = hl.x - hl.w + (j < 3 ? j * 9 : 2 * hl.w - (j - 3) * 9), dx = j < 3 ? 1 : -1; c.beginPath(); c.moveTo(x, lv.y + 4); c.quadraticCurveTo(x + dx * 10 * k, lv.y + 18, x + dx * (6 + r() * 10) * k, lv.y + (24 + r() * 26) * k); c.stroke(); }
            c.restore();
          }
        }
      },
      actors: {
        k: { scale: 1, z: 2, beats: [[0, 'pushUp']], pos: [[0, 768, 6]], face: [[0, 1]], weapon: [[0, true]], sink: [[0, true], [6.5, false], [6.92, 400], [M(10.62), false], [M(11.02), 800]],
          aura: [[0, 0.3], [8.7, 0.3], [9.0, 0.9, 'out'], [11.6, 0.55]], glowK: [[0, 0.15], [8.7, 0.15], [9.0, 0.7, 'out'], [11.6, 0.4]],
          eyes: [[0, 1], [PING - 0.08, 1], [PING - 0.03, 0], [10.85, 0], [10.9, 1]],
          expr: [[0, 'hurt'], [1.2, 'intense'], [3.82, 'hurt'], [4.6, 'angry'], [5.82, 'hurt'], [8.1, 'angry'], [8.7, 'intense'], [M(9.3), 'hurt'], [M(10.3), 'intense'], [M(10.62), 'hurt'], [M(12.6), 'intense']],
          // The fragment's light in the blade from the moment he calls it up; the interference round him with his eyes shut.
          post: (c, L) => {
            const t = L.D.c, J = L.joints('k');
            c.save(); if (t >= 6.92 && t < M(10.62)) { c.beginPath(); c.rect(-1e5, -1e5, 2e5, 1e5 + L.G + D); c.clip(); }
            CR.bladeCracks(c, 'k', L.curve(crackK, t)[0]); c.restore();
            CA.noise(c, (J.neck.x + J.hip.x) / 2, (J.neck.y + J.hip.y) / 2, L.curve(noiseK, t)[0], t);
          } },
        s: { scale: 1.08, z: 1, wAbs: true, wkey: [[0, AS.COUNTER.katana]], beats: [[0, 'sovReady']], pos: [[0, 892, 0]], face: [[0, -1]], aura: [[0, 0.24]], auraColor: red, eyes: [[0, 1]], eyeColor: red, expr: [[0, 'neutral']] },
      },
      cam: [[0, 840, 80, 2.2]],
      ev: [],
    });
    const a = L.actors, KB = [], SB = [], KP = [], SP = [], KF = [[0, 1]], SF = [[0, -1]], ev = L.spec.ev, blows = [], stops = [];
    const kb = (t, p, e, x) => KB.push([M(t), p, e || 'io', x]), sb = (t, p, e, x) => SB.push([M(t), p, e || 'io', x]);
    const kp = (t, x, h, e) => KP.push(e ? [M(t), x, h || 0, e] : [M(t), x, h || 0]), sp = (t, x, h, e) => SP.push(e ? [M(t), x, h || 0, e] : [M(t), x, h || 0]);
    const karc = (t0, x0, h0, t1, x1, h1, pk) => KP.push(...CA.arc(M(t0), x0, h0, M(t1), x1, h1, pk, 14));
    const sarc = (t0, x0, h0, t1, x1, h1, pk) => SP.push(...CA.arc(M(t0), x0, h0, M(t1), x1, h1, pk, 14));
    const sfx = (t, k, g, r) => ev.push([M(t), l => l.sfx(k, g, r)]);
    const swish = (t, r) => sfx(t, 'swingHeavy', 0.65, r || 1.15);
    // Particles that come to rest on their own level's floor.
    const debrisOn = (lv, x, y, n, o) => withG(LV[lv].y, () => L.debris(x, y, n, o));
    const clash = (t0, stop, lv) => {
      const t = M(t0);
      stops.push([t, stop || 0.3, 0.07]);
      ev.push([t + 0.015, l => {
        const x = AS.cross(l, 'k', 's', t + 0.03);
        (l.D.log.clash || (l.D.log.clash = {}))[t] = x.d;
        if (x.d > 16) (l.D.log.miss || (l.D.log.miss = [])).push(['clash', t, x.d]);
        l.sfx('clang', 0.9, 0.9 + Math.random() * 0.25); l.shake(6);
        debrisOn(lv, x.x, x.y, 12, { kind: 'spark', col: spark, v: 4.6, r: 1.7, g: 0.14, spread: 360, life: 22 });
        l.ring(x.x, x.y, 30, { col: spark, w: 2.4, life: 11 });
      }]);
    };
    const hit = (t0, by, wth, on, at, r, shake, lv) => {
      const t = M(t0);
      blows.push({ t, by, with: wth, on, at, kind: 'none', range: r || 90, lead: 0.02 }); stops.push([t, 0.3, 0.06]);
      ev.push([t + 0.05, l => { const p = CA.point(on, at, t + 0.06); l.sfx('heavyHit', 0.8, 0.95); l.sfx('hitBlunt', 0.6, 1); l.shake(shake || 8); debrisOn(lv || 0, p.x, p.y, 8, { kind: 'spark', col: spark, v: 3.4, r: 1.5, g: 0.08, spread: 360, life: 18 }); l.ring(p.x, p.y, 26, { col: spark, w: 2, life: 10 }); }]);
    };
    // A count dropping: a small dry tick off the screens.
    for (const [c] of COUNT.slice(1, -1)) ev.push([c + 0.04, l => l.sfx('hitZap', 0.18, 0.55)]);

    // ── up off the floor; he takes the point away and lets him ──
    kb(0, 'pushUp', 'io', { headTilt: -24, torso: 30 }); kp(0, 768, 6);
    sb(0, 'sovReady', 'io', { rArm: 12, rFore: 4, torso: 2, headTilt: 10 }); sp(0, 892, 0);
    sb(0.5, 'sovReady', 'io', { rArm: 12, rFore: 4, torso: 2, headTilt: 10 }); sb(1.05, 'sovReady', 'io');
    kb(0.55, 'pushUp', 'io', { headTilt: -30, torso: 30 }); kb(1.0, 'kneel', 'io', { headTilt: -6 }); kb(1.45, 'guard', 'out'); kp(1.0, 768, 0); kp(1.5, 724, 0, 'out');

    // ── his block is up before the cut is ──
    sb(1.7, 'sovBlock', 'out', { rFore: -84, rArm: 30 }); sb(2.75, 'sovBlock', 'io', { rFore: -84, rArm: 30 }); sfx(1.7, 'swing', 0.35, 0.7);
    kb(1.95, 'guard', 'io', { headTilt: 8 }); kb(2.1, 'runA', 'out'); kb(2.22, 'runB'); kp(2.1, 724); kp(2.3, 776, 0, 'in');
    kb(2.32, 'crouch', 'out'); kb(2.46, 'airHigh', 'out'); kb(2.66, 'airHigh', 'io'); kb(2.78, 'airCut', 'xout'); karc(2.34, 776, 0, 2.82, 818, 34, 74); sfx(2.34, 'jump', 0.6, 1); swish(2.7, 1);
    clash(2.78, 0.3, 0);
    kb(2.95, 'tuck', 'out'); kb(3.12, 'crouchLand', 'xout'); kb(3.32, 'guard', 'io'); karc(2.82, 818, 34, 3.12, 760, 0, 42); sfx(3.12, 'land', 0.7, 1);
    sb(2.95, 'sovReady', 'out');

    // ── the foot is off the floor before the sweep; down inside it, and the palm ──
    sp(3.3, 892); sb(3.3, 'sovReady', 'out', { lLeg: -36, lShin: 66, torso: 4, rLeg: 100, rShin: 98 }); sb(3.62, 'sovReady', 'io', { lLeg: -36, lShin: 66, torso: 4, rLeg: 100, rShin: 98 });
    kb(3.44, 'sweepLow', 'xout', { rArm: 30, rFore: 24 }); kp(3.44, 790, 0, 'xout'); swish(3.4, 0.9); kb(3.6, 'sweepLow', 'io', { rArm: 40, rFore: 30 });
    sb(3.72, 'sovReady', 'in'); sp(3.72, 812, 0, 'in'); sfx(3.72, 'land', 0.45, 1.2);
    sb(3.82, 'sovPalm', 'xout'); hit(3.82, 's', 'lHand', 'k', 'head', 90, 7, 0); kb(3.82, 'sweepLow', 'io', { rArm: 40, rFore: 30 }); kb(3.89, 'headSnap', 'xout'); sb(4.02, 'sovReady');
    kb(3.98, 'flyBack', 'xout'); karc(3.86, 790, 0, 4.24, 724, 0, 30); kb(4.24, 'skid', 'xout'); kb(4.6, 'guard', 'io'); kp(4.5, 714, 0, 'out'); sfx(4.24, 'landHard', 0.55, 1.1);

    // ── three: each answer before the attack ──
    // He leans out of it, then the thrust.
    sb(4.86, 'sovLean', 'out'); sp(4.7, 812); sp(4.9, 872, 0, 'out'); kb(4.88, 'guard'); kb(5.0, 'thrust', 'xout', { rArm: -16, rFore: -16 }); kp(4.88, 714); kp(5.0, 738, 0, 'xout'); swish(4.96, 1.3); sb(5.12, 'sovLean'); kb(5.14, 'thrust', 'io', { rArm: -16, rFore: -16 }); kp(5.14, 738); sb(5.2, 'sovReady', 'io');
    // He is under it, then the cut.
    sb(5.27, 'sovDuck', 'xout', { torso: 8, hipDrop: 36, rLeg: 122, rShin: 178, lLeg: 18, lShin: 96, headTilt: 16 }); kb(5.3, 'windBack', 'out', { rArm: -160, rFore: -140 }); kb(5.4, 'slashOut', 'xout', { rArm: -42, rFore: -26 }); kp(5.4, 738, 0, 'out'); swish(5.36, 1.1); sb(5.46, 'sovDuck', 'io', { torso: 8, hipDrop: 36, rLeg: 122, rShin: 178, lLeg: 18, lShin: 96, headTilt: 16 });
    // His hand is open where the wrist will be.
    sb(5.6, 'sovCatch', 'xout', { lArm: -10, lFore: -22, lArmLen: 1.15, torso: -6 }); kb(5.6, 'highGuard', 'out'); kb(5.82, 'cutDown', 'xout', { rArm: -10, rFore: 14, torso: 14 }); swish(5.74, 1);
    sb(5.82, 'sovCatch', 'io', { lArm: -10, lFore: -22, lArmLen: 1.15, torso: -6 }); kp(5.82, 796, 0);
    blows.push({ t: 5.82, by: 'k', with: 'rHand', on: 's', at: 'lHand', kind: 'none', range: 100, lead: 0.02 }); stops.push([5.82, 0.32, 0.08]);
    ev.push([5.86, l => { l.sfx('hitBlunt', 0.9, 1.3); l.shake(5); const J = l.joints('s'); l.ring(J.lHand.x, J.lHand.y, 16, { col: red, w: 2, life: 9 }); }]);

    // ── up by the wrist, over him, down through the floor ──
    sb(6.05, 'sovCatch', 'in', { lArm: -96, lFore: -100, torso: -10, headTilt: -16, hipDrop: -2 }); sb(6.3, 'sovCatch', 'lin', { lArm: -160, lFore: -168, torso: -22, headTilt: -10 });
    sb(6.52, 'sovCatch', 'out', { lArm: -214, lFore: -222, torso: -30, headTilt: 4, hipDrop: 8 }); sb(6.9, 'sovReady', 'io', { headTilt: 22 });
    kb(5.96, 'hangUp', 'in', { rot: 46, lArm: -40, lFore: 10, rLeg: 70, lLeg: 50 }); kb(6.14, 'hangUp', 'lin', { rot: 140, lArm: 10, lFore: 40 }); kb(6.32, 'hangUp', 'lin', { rot: 214, lArm: 30, lFore: 60, rLeg: 120, lLeg: 90 });
    kb(SLAM, 'fallen', 'in', { rot: 272 }); kb(SLAM + 0.08, 'fallen', 'out', { rot: 280, rArm: 190, lArm: -30, rLeg: 40, lLeg: 0 }); kb(6.9, 'fallen', 'io', { rot: 272 }); kb(6.902, 'fallen', 'hold');
    swish(6.0, 0.7); sfx(6.2, 'swingHeavy', 0.9, 0.6);
    stops.push([SLAM, 0.14, 0.14]);
    ev.push([SLAM, l => {
      l.sfx('landHard', 1.1, 0.7); l.sfx('explosion', 0.7, 0.75); l.sfx('heavyHit', 1, 0.55); l.sfx('stingImpact', 0.7, 0.6); l.shake(22); l.impact(2, { tint: '#ffb0a0' });
      const x = LV[0].hole.x; l.ring(x, G, 140, { sq: 0.16, col: spark, w: 5, life: 26 });
      debrisOn(1, x, G + 6, 30, { col: '#1e2628', v: 4, r: 4, g: 0.3, dir: 90, spread: 160, life: 90 });
      debrisOn(0, x, G - 2, 14, { col: '#2a3335', v: 5, r: 3, spread: 120 });
      debrisOn(1, x, G + 4, 14, { kind: 'spark', col: '#cfe8e4', v: 3, r: 1.6, g: 0.2, dir: 90, spread: 200, life: 60 });
      l.dust(x, 10, 160, { a: 0.3 });
    }]);
    ev.push([6.9, l => { l.sfx('landHard', 1, 0.8); l.shake(14); l.dust(LV[0].hole.x, 8, 120, { y: LV[1].y, a: 0.3 }); debrisOn(1, LV[0].hole.x, LV[1].y - 4, 12, { col: '#2a3335', v: 4, r: 3 }); }]);
    // He looks down into it; steps off; down after him, lightly.
    SB.push(...AS.walk(7.0, 7.3, 0.15, null, 'sovWalkA', 'sovWalkB')); sp(6.9, 868); sp(7.3, 912, 0, 'lin');
    sb(7.34, 'sovReady', 'out', { lLeg: 40, lShin: 96, headTilt: 10 }); sarc(7.3, 912, 0, 7.72, 986, -D, 4); sb(7.6, 'sovReady', 'io', { rLeg: 90, lLeg: 60, lShin: 100, rShin: 90 });
    sb(7.72, 'crouchLand', 'xout', { rArm: 112, rFore: 132 }); sb(8.02, 'sovReady', 'io'); sfx(7.72, 'land', 0.4, 0.9);
    // Kael skids out from under the hole on his back and comes up.
    kp(7.3, 904, -D + 6, 'out'); kb(7.35, 'fallen', 'io', { headTilt: -20 }); kb(7.7, 'pushUp', 'io', { headTilt: -20 }); kb(7.95, 'crouch', 'out'); kb(8.12, 'guard', 'out', { headTilt: -4 }); kp(7.7, 904, -D);
    ev.push([7.0, l => { l.dust(950, 8, 70, { y: LV[1].y, a: 0.22 }); }]);

    // ── level one: the fragment (films 2 and 3). He calls it up and puts the blade in the floor: the veins run out under the
    // Lab and everything of Sovereign's they pass goes dark, lamps, columns, the recorded Kaels. Toward him they stop at the
    // toe of his front foot. Eyes shut, the interference: it passes through him and nothing in him moves. ──
    RAW = true;
    const GQ = L.resolve('guard'), GA = { rArm: GQ.rArm, rFore: -72 };
    kb(8.26, 'crouch', 'out', GA); kb(8.4, 'tuck', 'out', GA); kb(8.62, 'crouchLand', 'xout', GA); karc(8.32, 904, -D, 8.62, 836, -D, -D + 22); kp(9.9, 836, -D);
    sfx(8.3, 'jump', 0.5, 1.1); sfx(8.62, 'land', 0.5, 1);
    kb(8.8, 'guard', 'io', { headTilt: 4 }); kb(8.92, 'crouch', 'io'); kb(PL, 'plant', 'xout'); kb(PL + 0.72, 'plant', 'lin', { headTilt: 4 });
    sfx(8.74, 'hitZap', 0.35, 0.5); sfx(PL - 0.12, 'swingHeavy', 0.7, 0.8);
    stops.push([PL, 0.3, 0.06]);
    ev.push([PL, l => {
      CR.vein(VX, PL, VSP, 640); CR.veins[CR.veins.length - 1].capR = CAPR;
      l.sfx('stingImpact', 0.8, 0.9); l.sfx('hitZap', 0.6, 0.8); l.sfx('explosion', 0.3, 1.4); l.shake(12);
      l.ring(VX, LV[1].y, 120, { sq: 0.16, col: AS.cyan, w: 4, life: 22 });
      debrisOn(1, VX, LV[1].y - 2, 16, { kind: 'spark', col: '#5fe8ff', v: 4, r: 1.6, g: 0.12, dir: -90, spread: 140, life: 30 });
    }]);
    // Sovereign does not step back. He looks down at where they stopped.
    sb(8.6, 'sovReady', 'io', { headTilt: 6 }); sb(PL + 0.5, 'sovReady', 'io', { headTilt: 26 }); sb(PL + 1.0, 'sovReady', 'io', { headTilt: 6 });
    // Out of the floor; eyes shut; the interference.
    kb(9.98, 'guard', 'out', { headTilt: 10 }); kb(PING + 0.1, 'guard', 'io', { headTilt: 14, torso: 4 }); kb(10.8, 'guard', 'io', { headTilt: 12 });
    sfx(9.9, 'swing', 0.5, 0.8);
    for (const [dt, r, w] of [[0, 420, 3], [0.16, 340, 2]]) ev.push([PING + dt, l => {
      const J = l.joints('k'), x = (J.neck.x + J.hip.x) / 2, y = (J.neck.y + J.hip.y) / 2;
      l.ring(x, y, r, { col: AS.cyan, w, life: 34, sq: 0.92 }); l.sfx('hitZap', 0.4, 0.55); if (!dt) l.sfx('portalOpen', 0.35, 0.7);
    }]);
    // Eyes open. He comes back in to his distance.
    kb(11.05, 'walkA', 'io'); kb(11.3, 'walkB', 'io'); kb(11.55, 'guard', 'io'); kp(11.05, 836, -D); kp(11.55, 862, -D, 'io');
    sb(11.2, 'sovReady', 'io');
    RAW = false;

    // ── level one: he never lifts his blade ──
    sp(8.1, 986, -D); sp(8.32, 1012, -D, 'out'); sb(8.3, 'sovLean', 'out'); kb(8.32, 'windBack', 'out', { rArm: -160, rFore: -140 }); kb(8.42, 'slashOut', 'xout', { rArm: -30, rFore: -22 }); kp(8.42, 886, -D, 'out'); swish(8.38, 1.1); sb(8.5, 'sovLean'); kb(8.52, 'guard', 'io');
    sp(8.5, 1012, -D); sp(8.64, 1066, -D, 'out'); sb(8.64, 'sovLean', 'out'); sb(8.84, 'sovLean'); kb(8.75, 'thrust', 'xout', { rArm: -16, rFore: -16 }); kp(8.75, 906, -D, 'xout'); swish(8.71, 1.3); kb(8.86, 'thrust', 'io', { rArm: -16, rFore: -16 }); kp(8.86, 906, -D); kb(8.94, 'guard', 'io');
    sb(8.95, 'sovDuck', 'xout', { torso: 8, hipDrop: 36, rLeg: 122, rShin: 178, lLeg: 18, lShin: 96, headTilt: 16 }); kb(8.98, 'windBack', 'out', { rArm: -160, rFore: -140 }); kb(9.08, 'slashOut', 'xout', { rArm: -42, rFore: -26 }); kp(9.08, 944, -D, 'out'); swish(9.04, 1); sb(9.12, 'sovDuck', 'io', { torso: 8, hipDrop: 36, rLeg: 122, rShin: 178, lLeg: 18, lShin: 96, headTilt: 16 });
    sp(9.14, 1066, -D); sp(9.3, 970, -D, 'out'); sb(9.3, 'sovKick', 'xout'); hit(9.3, 's', 'lFoot', 'k', 'gut', 90, 11, 1); kb(9.2, 'highGuard', 'out'); kb(9.3, 'highGuard', 'io'); kb(9.36, 'flyBack', 'xout'); sb(9.52, 'sovReady');
    karc(9.32, 944, -D, 9.6, 818, -D + 14, -D + 40); kp(9.75, 818, -D, 'in');
    ev.push([M(9.6), l => { withG(LV[1].y, () => AS.shatter(l, 775, 1, { dir: 200 })); l.sfx('clang', 0.8, 2.0); l.sfx('hitZap', 0.5, 2.2); l.sfx('hitBlunt', 0.8, 0.8); l.shake(10); }]);
    LV[1].near[2].broke = M(9.6);
    kb(9.62, 'flyBack', 'io', { torso: -20 }); kb(9.8, 'kneel', 'out'); kb(10.22, 'guard', 'io');
    // He walks to him. Kael's block is up in time; the floor is not.
    SB.push(...AS.walk(M(9.62), M(10.3), 0.17, null, 'sovWalkA', 'sovWalkB')); sp(9.6, 970, -D); sp(10.3, 864, -D, 'lin');
    sb(10.4, 'sovRaise', 'out'); sb(CUT2, 'cutDown', 'xout', { rArm: 30, rFore: 60 }); kb(10.42, 'blockHigh', 'xout'); kb(CUT2 + 0.1, 'blockHigh', 'io', { hipDrop: 22 }); kp(10.22, 818, -D);
    sfx(10.4, 'iaiMark', 0.5, 0.8); swish(10.52, 0.8);
    clash(CUT2, 0.2, 1); stops.push([M(CUT2 + 0.02), 0.14, 0.16]);
    ev.push([M(CUT2 + 0.02), l => {
      l.sfx('explosion', 0.8, 0.7); l.sfx('landHard', 1, 0.6); l.sfx('stingImpact', 0.8, 0.55); l.shake(24); l.impact(2, { tint: '#ffb0a0' });
      const x = LV[1].hole.x; l.ring(x, LV[1].y, 130, { sq: 0.16, col: spark, w: 5, life: 26 });
      debrisOn(2, x, LV[1].y + 6, 30, { col: '#1e2628', v: 4, r: 4, g: 0.3, dir: 90, spread: 160, life: 90 });
      debrisOn(2, x, LV[1].y + 4, 14, { kind: 'spark', col: '#cfe8e4', v: 3, r: 1.6, g: 0.2, dir: 90, spread: 200, life: 60 });
    }]);
    sb(10.9, 'cutDown', 'io', { rArm: 34, rFore: 66 }); sb(11.3, 'sovReady', 'io', { headTilt: 30 });

    // ── the bottom ──
    kb(10.8, 'tuck', 'out', { rArm: 20, rFore: -60 }); kb(11.0, 'crouchLand', 'xout'); kb(11.3, 'kneel', 'io'); kp(10.64, 818, -D); kp(11.0, 822, -2 * D, 'in');
    ev.push([M(11.0), l => { l.sfx('landHard', 1.1, 0.7); l.shake(16); l.dust(822, 10, 110, { y: LV[2].y, a: 0.3 }); debrisOn(2, 822, LV[2].y - 4, 16, { col: '#2a3335', v: 4.5, r: 3 }); }]);
    stops.push([M(11.0), 0.3, 0.08]);
    kb(12.5, 'kneel', 'io', { headTilt: -20 }); kb(12.95, 'rising', 'io'); kb(13.35, 'guard', 'io');
    // He steps off the edge above.
    SB.push(...AS.walk(M(11.7), M(12.0), 0.15, null, 'sovWalkA', 'sovWalkB')); sp(11.3, 864, -D); sp(11.7, 864, -D); sp(12.0, 852, -D, 'lin');
    sb(12.04, 'sovReady', 'out', { lLeg: 40, lShin: 96 }); sarc(12.0, 852, -D, 12.42, 892, -2 * D, -D + 2); sb(12.3, 'sovReady', 'io', { rLeg: 90, lLeg: 60, lShin: 100, rShin: 90 });
    sb(12.42, 'crouchLand', 'xout', { rArm: 112, rFore: 132 }); sb(12.8, 'sovReady', 'io'); sfx(12.42, 'land', 0.3, 0.8);
    ev.push([M(13.3), l => { l.sfx('iaiMark', 0.9, 0.5); l.sfx('stingImpact', 0.7, 0.5); l.shake(4); }]);
    sb(15.2, 'sovReady'); kb(15.2, 'guard'); kp(15.2, 822, -2 * D); sp(15.2, 892, -2 * D);

    for (const q of [KB, SB, KP, SP, KF, SF]) q.sort((p, r) => p[0] - r[0]);
    a.k.beats = KB; a.k.pos = KP; a.k.face = KF; a.s.beats = SB; a.s.pos = SP; a.s.face = SF;
    a.k.below = [SLAM, 99]; a.s.below = [7.3, 99];
    // The wrist in his hand from the catch to the release.
    const REL = 6.32, base = c => L.curve(a.k.pos, c);
    // The cut solved so his blade crosses Kael's raised one.
    {
      const bi = a.s.beats.findIndex(q => Math.abs(q[0] - M(CUT2)) < 1e-6), bt = a.s.beats[bi], base0 = Object.assign({}, L.POSES.stand, L.POSES[bt[1]], bt[3]);
      let best = null;
      for (let d0 = -90; d0 <= 90; d0 += 4) for (let d1 = -90; d1 <= 90; d1 += 4) {
        bt._q = L.resolve(bt[1], Object.assign({}, bt[3], { rArm: base0.rArm + d0, rFore: base0.rFore + d1 }));
        const x = AS.cross(L, 'k', 's', M(CUT2) + 0.03), cost = x.d + 0.03 * (Math.abs(d0) + Math.abs(d1));
        if (!best || cost < best.cost) best = { d0, d1, cost, d: x.d };
      }
      bt[3] = Object.assign({}, bt[3], { rArm: base0.rArm + best.d0, rFore: base0.rFore + best.d1 }); bt._q = null;
      L.D.log.cutSolve = best;
    }
    // The veins: from where the blade crosses level one's floor, toward him only as far as his front foot.
    {
      const tp = L.tip('k', undefined, PL + 0.03), h = tp.hand, Y = LV[1].y, u = (Y - h.y) / ((tp.y - h.y) || 1);
      VX = u <= 1 ? h.x + (tp.x - h.x) * u : tp.x;
      const SJ = L.joints('s', PL + 0.5);
      CAPR = Math.min(SJ.lFoot.x, SJ.rFoot.x) - VX - 8;
      L.D.log.vein = { x: Math.round(VX), capR: Math.round(CAPR), reached: u <= 1 };
      for (const n of LV[1].near) { const td = veinAt(n.x); if (td < Infinity) ev.push([td, l => l.sfx('hitZap', 0.3, 0.7 + Math.random() * 0.2)]); }
    }
    CA.blows(L, blows);
    // Kael stands where his aimed wrist meets the hand, so the catch does not shift him.
    { const k0 = KP.find(q => q[0] === 5.82), lk = CA.lock(a.k, 'rHand', 's', 'lHand', 5.82, 5.83, base)(5.82); k0[1] = lk[0]; L.D.log.catch = [Math.round(lk[0]), Math.round(lk[1])]; }
    const lock = CA.lock(a.k, 'rHand', 's', 'lHand', 5.82, REL, base);
    a.k.posFn = lock;
    const rel = lock(REL);
    KP.push([REL, rel[0], rel[1]], ...CA.arc(REL, rel[0], rel[1], SLAM, LV[0].hole.x, 6, rel[1] + 6, 10), [6.9, 980, -D + 6, 'in']);
    KP.sort((p, r) => p[0] - r[0]);
    for (let i = KP.length - 1; i > 0; i--) if (KP[i][0] > 5.82 && KP[i][0] < REL) KP.splice(i, 1);
    L.D.log.release = rel.map(Math.round);
    a.k.trail = [[2.3, 2.85, 3, 0.03, 0.22], [4.9, 5.5, 2, 0.03, 0.2], [5.9, 6.95, 4, 0.025, 0.26], [8.3, 8.66, 2, 0.03, 0.2], [M(8.3), M(9.1), 2, 0.03, 0.2], [M(9.3), M(9.6), 3, 0.03, 0.24], [M(10.62), M(11.0), 3, 0.03, 0.22]];
    a.s.trail = [[1.65, 1.8, 2, 0.04, 0.2], [3.25, 3.9, 2, 0.04, 0.2], [4.8, 6.6, 2, 0.04, 0.18], [M(8.25), M(9.4), 2, 0.04, 0.18], [M(10.35), M(10.7), 3, 0.03, 0.22]]; a.s.trailColor = red;
    L.spec.speed = CA.hitch(stops.sort((p, r) => p[0] - r[0]));
    L.spec.cam = [
      ...CA.follow(L, 'k', 's', 0, 1.6, { zMax: 2.5, zMin: 1.7, lift: 14 }),
      // Wide enough to see him blocking nothing.
      [1.61, 808, 70, 2.05, 'sine'], [2.25, 812, 72, 2.15, 'sine'],
      ...CA.follow(L, 'k', 's', 2.3, 5.95, { zMax: 2.6, zMin: 1.7, lift: 16, cut: false }),
      ...CA.follow(L, 'k', 's', 6.0, SLAM, { zMax: 2.1, zMin: 1.5, lift: 6, cut: false }),
      // Down through it with him.
      [SLAM + 0.15, 960, -60, 1.75, 'sine'], [6.9, 960, -D + 70, 1.9, 'in'],
      // He lies there; the other one drops in from above.
      [7.25, 945, -D + 66, 1.8, 'sine'], [7.75, 950, -D + 70, 1.95, 'sine'],
      ...CA.follow(L, 'k', 's', 7.85, 8.85, { zMax: 2.5, zMin: 1.6, lift: 16, cut: false }),
      // The blade goes in; then wide: the room on Kael's side goes dark, the veins stop at his foot, his side stays lit.
      [PL, 900, -D + 66, 2.3, 'sine'], [PL + 0.12, 900, -D + 66, 2.35, 'sine'], [PL + 0.85, 860, -D + 120, 1.3, 'sine'], [9.85, 880, -D + 110, 1.4, 'sine'],
      [PING + 0.05, 905, -D + 80, 1.85, 'sine'], [10.8, 910, -D + 76, 1.95, 'sine'],
      ...CA.follow(L, 'k', 's', 11.0, M(10.5), { zMax: 2.5, zMin: 1.6, lift: 16, cut: false }),
      [M(CUT2 + 0.1), 830, -D + 40, 2.0, 'sine'], [M(11.0), 830, -2 * D + 80, 1.8, 'in'],
      // From the bottom: the hole above, and him in it.
      [M(11.5), 828, -2 * D + 70, 1.9, 'sine'],
      // Up through the hole: him at its edge, looking down.
      [M(11.51), 862, -D + 30, 2.0, 'hold'], [M(11.95), 862, -D + 36, 2.15, 'sine'],
      // And down into the bottom room after him.
      [M(11.96), 850, -2 * D + 150, 1.3, 'hold'], [M(12.42), 855, -2 * D + 110, 1.6, 'sine'],
      ...CA.follow(L, 'k', 's', M(12.6), M(13.15), { zMax: 2.3, zMin: 1.7, lift: 20, cut: false }),
      // The count it came to, over both of them.
      [M(13.3), 930, -2 * D + 150, 1.6, 'sine'], [M(14.3), 1000, -2 * D + 205, 2.6, 'sine'], [M(15.2), 1000, -2 * D + 205, 2.75, 'sine'],
    ];
  },
  tick: function (H) { FILM.tick(H); },
};
