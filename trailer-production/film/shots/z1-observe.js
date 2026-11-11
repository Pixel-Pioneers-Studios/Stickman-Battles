'use strict';
// Stage one (canon: OBSERVING, "he absorbs hits on purpose; your mistakes identify you"). Kael cuts him and he lets it
// happen, hands open. The screen behind him falls with every cut. Kael goes through his whole hand, then sees the number
// and stops, the blade on Sovereign's throat. Sovereign looks up; the number falls again: stopping told him something too.
// He moves the blade aside with the back of a hand, turns his back and walks to his own. His own red ghost is already at
// each place he goes, so three cuts at his back find nothing. He draws and meets the fourth without hurrying. READING.
// Block, palm, kick: Kael goes through a column. Sovereign comes on, dragging the blade. The lights turn red.
module.exports = {
  arena: 'city', frames: 1200, endC: 17.4,
  install: function (H) {
    const L = FILM, G = H.D.G;
    AS.stage();
    AS.mini = CA.proxy(AS.red, 'katana');
    const red = AS.red, cyan = AS.cyan;
    const HILT = { x: 1252, y: G - 56, a: Math.PI / 2 };
    const near = []; for (let i = 0; i < 6; i++) near.push({ x: 362 + i * 137, seed: i * 5 + 2 });
    const COL = 1048;
    // [time, Kael's cut, wind-up, where, Sovereign's reaction, candidates after it]
    const CUTS = [
      [1.82, 'slashOut', 'iaido', 'chest', 'sovTakeBack', 7901], [2.62, 'cutDown', 'highGuard', 'chest', 'sovTakeFold', 5220], [3.02, 'upperCut', 'sweepLow', 'chest', 'sovTakeBack', 3380],
      [3.36, 'sweepLow', 'highGuard', 'lThigh', 'sovTakeSink', 2266], [3.66, 'slashOut', 'windBack', 'chest', 'sovTakeBack', 1620],
      [4.72, 'airCut', 'airHigh', 'chest', 'sovTakeFold', 803], [5.2, 'slashOut', 'windBack', 'chest', 'sovTakeBack', 640], [5.38, 'cutDown', 'highGuard', 'chest', 'sovTakeFold', 540],
      [5.56, 'upperCut', 'sweepLow', 'chest', 'sovTakeBack', 470], [5.72, 'slashOut', 'windBack', 'chest', 'sovTakeBack', 412], [5.88, 'cutDown', 'highGuard', 'chest', 'sovTakeSink', 377],
    ];
    const KICK = 3.98, AIR0 = 4.3, STOP = 6.32, TICK = 7.7, RAISE = 8.2, EYES = 8.75, MOVE = 9.5, WALK = 10.1, M1 = 10.46, M2 = 10.92, M3 = 11.36, GRIP = 11.76, DRAWN = 11.96, BLOCK = 12.12, PALM = 12.48, KK = 12.78, THRU = 13.02, LAND = 13.34, UP = 14.6, END = 17.4;
    const D = { slashOut: 84, cutDown: 80, upperCut: 46, sweepLow: 88, airCut: 74 };
    // Sovereign gives ground a little each time; Kael stays on him.
    const sBeats = [[0, 'sovOpen']], kBeats = [[0, 'readyOpen', 'io', { rFore: -4 }], [0.9, 'readyOpen', 'io', { rFore: -4 }], [1.32, 'iaido', 'io'], [1.56, 'iaido']], sPos = [[0, 1130, 0]], kPos = [[0, 960, 0], [1.56, 960, 0]];
    let sx = 1130;
    const hits = [], count = [[0, 10412]];
    CUTS.forEach(([t, cut, wind, at, take, n], i) => {
      const gap = i ? t - CUTS[i - 1][0] : 1;
      kBeats.push([t - Math.min(0.16, gap * 0.55), wind, 'out']);
      kBeats.push([t, cut, 'xout']);
      kBeats.push([t + Math.min(0.14, gap * 0.4), cut]);
      const kx = sx - D[cut];
      if (i === 5) kPos.push(...CA.arc(AIR0, kPos[kPos.length - 1][1], 0, t, kx, 14, 104, 14), [t + 0.2, kx, 0, 'in']);
      else kPos.push([t - Math.min(0.1, gap * 0.4), kx - 4, 0, 'out'], [t, kx, 0]);
      sBeats.push([t, 'sovOpen'], [t + 0.05, take, 'xout'], [t + Math.min(0.24, gap * 0.8), 'sovOpen', 'io']);
      sPos.push([t + 0.02, sx, 0], [t + 0.14, sx += 3, 0, 'out']);
      hits.push({ t, at, n });
      count.push([t + 0.05, n, 'hold']);
    });
    // The kick, between the first run and the leap (Sovereign slid by it).
    const KSX = 1130 + 3 * 5; kPos.push([KICK - 0.08, KSX - 34, 0, 'out'], [KICK + 0.1, KSX - 34, 0], [KICK + 0.3, KSX - 66, 0, 'out']);
    kPos.sort((p, q) => p[0] - q[0]);
    const ins = (arr, b) => { arr.push(b); arr.sort((p, q) => p[0] - q[0]); };
    ins(kBeats, [KICK - 0.1, 'readyOpen', 'io']); ins(kBeats, [KICK, 'frontKick', 'xout']); ins(kBeats, [KICK + 0.12, 'frontKick']);
    ins(sBeats, [KICK, 'sovOpen']); ins(sBeats, [KICK + 0.05, 'sovTakeFold', 'xout']); ins(sBeats, [KICK + 0.3, 'sovOpen', 'io']);
    ins(kBeats, [AIR0 - 0.08, 'crouch', 'out']); ins(kBeats, [AIR0 + 0.04, 'tuck', 'out']);
    count.push([KICK + 0.05, 1107, 'hold']); count.sort((p, q) => p[0] - q[0]);
    const after = c => c.filter(b => b[0] <= CUTS[4][0] + 0.2);
    L.setup(H, {
      tempo: 1, vignette: 0.58, plant: true,
      speed: CA.hitch([[CUTS[0][0], 0.2, 0.12], [CUTS[1][0], 0.3, 0.08], [CUTS[5][0], 0.28, 0.1], [BLOCK, 0.25, 0.1], [PALM, 0.3, 0.08], [KK, 0.28, 0.08], [THRU, 0.3, 0.08]]),
      backdrop: (c, L) => {
        const t = L.D.c;
        const n = L.curve(count.concat([[TICK, 377], [TICK + 0.5, 312, 'lin'], [DRAWN, 312], [BLOCK + 0.05, 266, 'lin'], [KK + 0.1, 148, 'lin'], [15.6, 86, 'lin']]).sort((p, q) => p[0] - q[0]), t)[0];
        AS.paintLab(c, {
          near, backLimit: 1125, redK: L.curve([[0, 0], [BLOCK, 0], [UP + 0.2, 1, 'io']], t)[0],
          mon: { x: 1330, n, label: t < BLOCK ? 'OBSERVING' : 'READING' },
          colState: x => ({ stop: 1, look: L.joints('k').hip.x, mimic: 'readyOpen', broke: Math.abs(x - COL) < 2 ? THRU : undefined }),
        });
        if (t < GRIP) CA.loose(c, L.actors.s.f, HILT.x, HILT.y, HILT.a, 1.08, G);
      },
      actors: {
        k: {
          scale: 1, beats: kBeats, pos: kPos, face: [[0, 1]], weapon: [[0, true]], sink: [[0, true]],
          aura: [[0, 0.16], [1.5, 0.5], [STOP, 0.2], [UP, 0.2], [UP + 0.6, 0.7]], glowK: [[0, 0], [UP, 0], [UP + 0.6, 0.4]], expr: [[0, 'intense'], [THRU, 'hurt'], [UP, 'intense']], eyes: [[0, 0], [UP + 0.5, 0], [UP + 0.8, 1]],
          trail: [[1.56, 1.84, 4, 0.02, 0.4], [THRU - 0.25, LAND, 3, 0.03, 0.35]],
        },
        s: {
          scale: 1.08, z: 1, wAbs: true, beats: sBeats, pos: sPos, face: [[0, -1]], weapon: [[0, false], [GRIP, true]], sink: [[0, true], [DRAWN - 0.05, false]],
          aura: [[0, 0.1], [BLOCK, 0.1], [BLOCK + 0.3, 0.6]], auraColor: red, expr: [[0, 'neutral']], eyes: [[0, 0], [EYES, 0], [EYES + 0.3, 1]], eyeColor: red,
          trailColor: red,
        },
      },
      each: (L, c) => { },
      cam: [[0, 1050, 92, 2.1]],
      ev: [
        [1.3, L => { L.sfx('iaiSheathe', 0.7, 1); }], [1.58, L => { L.sfx('jump', 0.6, 1.3); L.lines(14, { dir: 0 }); }],
        ...hits.map(h => [h.t, L => {
          const p = AS.logCut(L, h.t.toFixed(2), 's', h.at, h.t + 0.03);
          L.sfx('hitPierce', 0.8, 0.9 + Math.random() * 0.25); L.sfx('swing', 0.45, 1.1); L.shake(h.t === CUTS[0][0] ? 10 : 5);
          AS.cutLine(L, p.x, p.y, L.joints('k', h.t - 0.03).wAng, 24, cyan);
          L.debris(p.x, p.y, 8, { kind: 'spark', col: red, v: 3.8, r: 1.6, g: 0.06, spread: 360, life: 22 });
          if (h.t === CUTS[0][0]) L.impact(2, { tint: '#88e4ff' });
        }]),
        [KICK, L => { L.sfx('hitBlunt', 0.9, 0.9); L.shake(7); }],
        [AIR0, L => { L.sfx('jump', 0.7, 1); L.dust(1100, 5, 30, { a: 0.2 }); }],
        [STOP - 0.1, L => { L.sfx('swingHeavy', 0.5, 1.2); }],
        [TICK, L => { L.sfx('iaiMark', 0.6, 0.55); }],
        [EYES, L => { L.sfx('stingLow', 0.8, 0.8); }],
        [MOVE, L => { L.sfx('clang', 0.25, 1.6); }],
        [WALK, L => { L.sfx('swingLight', 0.2, 0.5); }],
        ...[M1, M2, M3].map(t => [t - 0.1, L => { L.sfx('swingHeavy', 0.75, 1.15); }]),
        [GRIP, L => { L.sfx('pickup', 0.6, 0.6); }], [DRAWN, L => { L.sfx('iaiSheathe', 0.9, 0.6); L.debris(HILT.x, G - 2, 10, { kind: 'spark', col: red, v: 3, r: 1.6, g: 0.2 }); }],
        [BLOCK, L => { const b = L.tip('k', L.joints('k').bLen * 0.8); L.sfx('clang', 1, 0.9); L.sfx('stingImpact', 0.6, 0.6); L.shake(10); L.debris(b.x, b.y, 16, { kind: 'spark', col: '#ffe9a0', v: 5, r: 1.8, g: 0.14, spread: 360, life: 26 }); L.ring(b.x, b.y, 44, { col: red, w: 3, life: 14 }); }],
        [PALM, L => { L.sfx('heavyHit', 0.9, 1); L.shake(10); }],
        [KK, L => { L.sfx('heavyHit', 1, 0.75); L.sfx('swingHeavy', 0.6, 0.7); L.shake(14); L.lines(16, { dir: 180 }); L.impact(2, { tint: '#ffb0a0' }); }],
        [THRU, L => { AS.shatter(L, COL, 1); L.sfx('clang', 0.8, 2.1); L.sfx('hitZap', 0.5, 2.2); L.sfx('explosion', 0.3, 1.8); L.shake(14); }],
        [LAND, L => { L.sfx('landHard', 0.9, 0.9); L.shake(8); L.dust(1010, 8, 60, { a: 0.24 }); }],
        ...Array.from({ length: 7 }, (_, i) => [UP - 0.4 + i * 0.5, L => { L.sfx('land', 0.2, 0.75); }]),
        [UP + 0.2, L => { L.sfx('stingRise', 0.6, 0.65); }],
      ],
    });
    const k = L.actors.k, s = L.actors.s;
    // Last cut to the end. Kael's blade laid on the throat; then taken off it.
    k.beats.push([STOP - 0.2, 'windBack', 'out'], [STOP, 'thrust', 'xout', { rArm: -24, rFore: -24 }], [MOVE, 'thrust', 'io', { rArm: -24, rFore: -24 }], [MOVE + 0.2, 'thrust', 'out', { rArm: 34, rFore: 44, torso: 16 }], [WALK + 0.1, 'readyOpen', 'io'],
      // Three cuts at his back, each at where he was.
      [M1 - 0.13, 'windBack', 'out'], [M1, 'slashOut', 'xout'], [M1 + 0.12, 'slashOut'], [M2 - 0.15, 'highGuard', 'out'], [M2, 'cutDown', 'xout'], [M2 + 0.12, 'cutDown'], [M3 - 0.14, 'windBack', 'out'], [M3, 'thrust', 'xout'], [M3 + 0.12, 'thrust'],
      // The fourth, met.
      [BLOCK - 0.17, 'highGuard', 'out'], [BLOCK, 'cutStop', 'xout', { rArm: -20, rFore: -20 }], [PALM - 0.1, 'cutStop', 'io', { rArm: -20, rFore: -20 }], [PALM + 0.05, 'headSnap', 'xout', { rArm: 120, rFore: 110 }], [KK - 0.05, 'headSnap'], [KK + 0.05, 'flyBack', 'xout'], [THRU, 'flyBack'], [THRU + 0.1, 'knockedBack', 'out'], [LAND, 'skid', 'xout'], [LAND + 0.5, 'crouchLand', 'out'],
      [UP, 'kneelLook', 'io'], [UP + 0.7, 'rising', 'io'], [END - 0.8, 'guard', 'io'], [END, 'guard']);
    const lastX = s.pos[s.pos.length - 1][1];
    k.pos.push([STOP - 0.2, lastX - 136, 0, 'io'], [STOP, lastX - 117, 0, 'out'], [M1 - 0.2, lastX - 117, 0], [M1, lastX - 100, 0, 'out'], [M2, lastX - 92, 0, 'io'], [M3, lastX - 88, 0, 'io'], [BLOCK, 1100, 0, 'io'], [KK, 1104, 0, 'io'],
      ...CA.arc(KK + 0.02, 1104, 2, LAND, 985, 0, 46, 16), [LAND + 0.5, 958, 0, 'out'], [END, 958, 0]);
    s.beats.push([STOP, 'sovOpen'], [STOP + 0.28, 'sovHeadDown', 'io'], [RAISE, 'sovHeadDown'], [EYES, 'sovOpen', 'sine', { headTilt: 0 }], [MOVE - 0.15, 'sovOpen', 'io', { headTilt: 0 }], [MOVE, 'sovMoveBlade', 'out'], [WALK - 0.05, 'sovMoveBlade'], [WALK + 0.1, 'sovOpen', 'io'],
      // He doesn't look round: a lean, a side step, a step on.
      ...AS.walk(WALK + 0.12, M1 - 0.2, 0.3, { rArm: 128, rFore: 150, lArm: 54, lFore: 32 }), [M1 - 0.04, 'sovDuck', 'xout', { rArm: 128, rFore: 150 }], [M1 + 0.1, 'sovDuck', 'io', { rArm: 128, rFore: 150 }],
      [M2 - 0.04, 'sovLean', 'xout', { rArm: 128, rFore: 150 }], [M2 + 0.12, 'sovLean', 'io', { rArm: 128, rFore: 150 }], [M3 - 0.04, 'sovOpen', 'xout', { torso: 6 }], [GRIP - 0.08, 'sovReachHilt', 'io'], [DRAWN, 'sovReachHilt', 'lin'], [DRAWN + 0.08, 'sovRaise', 'xout'],
      [BLOCK - 0.04, 'sovBlock', 'xout', { rFore: -84, rArm: 30 }], [PALM - 0.14, 'sovBlock', 'io', { rFore: -84, rArm: 30 }], [PALM, 'sovPalm', 'xout'], [KK - 0.1, 'sovPalm'], [KK, 'sovKick', 'xout'], [KK + 0.24, 'sovKick'], [THRU + 0.3, 'sovReady', 'io'],
      ...AS.walk(UP - 0.4, END, 0.5, null, 'sovWalkA', 'sovWalkB'));
    s.beats.sort((p, q) => p[0] - q[0]); k.beats.sort((p, q) => p[0] - q[0]);
    const SL = s.pos[s.pos.length - 1][1];
    s.face.push([WALK, 1], [BLOCK - 0.06, -1]);
    s.pos.push([WALK, SL, 0], [WALK + 0.12, SL, 0], [M1 - 0.2, SL + 14, 0, 'lin'], [M1 - 0.04, SL + 16, 0, 'out'], [M2 - 0.04, SL + 30, 0, 'out'], [M3 - 0.04, SL + 50, 0, 'out'], [GRIP, 1230, 0, 'io'], [BLOCK, 1224, 0], [PALM - 0.05, 1224, 0], [PALM, 1142, 0, 'xout'], [KK, 1140, 0], [UP - 0.4, 1140, 0], [END, 1090, 0, 'lin']);
    const OPEN = [[0, 1050, 92, 2.1], [1.3, 1050, 86, 2.4, 'sine']];
    const hold1 = [[STOP, CA.point('s', 'chest', STOP + 0.5).x - 26, 88, 3.4, 'hold'], [TICK - 0.31, CA.point('s', 'chest', STOP + 0.5).x - 20, 88, 3.8, 'sine'],
      // Kael's eyes going up to the number.
      [TICK - 0.3, 1330, 208, 2.7, 'hold'], [TICK + 0.75, 1330, 208, 2.9, 'sine'],
      // The head coming up.
      [TICK + 0.76, L.joints('s', RAISE).neck.x, 92, 5.0, 'hold'], [MOVE - 0.01, L.joints('s', RAISE).neck.x, 94, 5.4, 'sine']];
    const tail = [[LAND, 1000, 80, 1.8, 'sine'], [UP, 1040, 96, 1.7, 'sine'], [END, 1040, 96, 1.85, 'sine']];
    L.spec.cam = OPEN.concat(CA.follow(L, 'k', 's', 1.31, STOP - 0.01, { zMax: 3.0, zMin: 1.7, lift: 8 }), hold1, CA.follow(L, 'k', 's', MOVE, THRU, { zMax: 2.6, zMin: 1.6, lift: 8 }), tail);
    // Planted feet on his walks.
    const rewalk = (key, t0, t1, dist, o) => { const a = L.actors[key]; a.beats = a.beats.filter(q => q[0] < t0 - 1e-6 || q[0] > t1 + 1e-6).concat(AS.walkTo(L, key, t0, t1, dist, o)).sort((p, q) => p[0] - q[0]); };
    rewalk('s', WALK + 0.12, M1 - 0.2, 14, { cadence: 0.3, extra: { rArm: 128, rFore: 150, lArm: 54, lFore: 32 } });
    rewalk('s', UP - 0.4, END, 50, { cadence: 0.5, a: 'sovWalkA', b: 'sovWalkB' });
    AS.pinWalk(L, 's', WALK + 0.12, M1 - 0.2); AS.pinWalk(L, 's', UP - 0.4, END);
    s.pivot = 0.08;
    // His ghost, already at each place he goes.
    L.ghost('s', M1 - 0.42, M1 - 0.04, 0.22); L.ghost('s', M2 - 0.42, M2 - 0.04, 0.22); L.ghost('s', M3 - 0.42, M3 - 0.04, 0.28);
    // The hand arrives on the hilt: aim it there.
    const gi = s.beats.findIndex(b => b[1] === 'sovReachHilt' && Math.abs(b[0] - (GRIP - 0.08)) < 1e-6);
    L.D.log.grip = CA.aim('s', gi, 'rHand', ['rArm', 'rFore'], { x: HILT.x, y: HILT.y }, GRIP, { range: 60 }).d;
    // Fists on bodies.
    const blows = [{ t: KICK, by: 'k', with: 'lFoot', on: 's', at: 'hip', kind: 'heavy', range: 80 }, { t: PALM, by: 's', with: 'lHand', on: 'k', at: 'chest', kind: 'heavy' }, { t: KK, by: 's', with: 'lFoot', on: 'k', at: 'hip', kind: 'heavy', range: 80, lead: 0.02 }];
    CA.blows(L, blows);
    { const mi = s.beats.findIndex(b => b[1] === 'sovMoveBlade' && Math.abs(b[0] - MOVE) < 1e-6), t = L.tip('k', undefined, MOVE + 0.02), h = t.hand;
      L.D.log.moveAim = CA.aim('s', mi, 'lHand', ['lArm', 'lFore'], { x: h.x + (t.x - h.x) * 0.62, y: h.y + (t.y - h.y) * 0.62 + 3 }, MOVE + 0.02, { range: 60 }).d; const nb = s.beats[mi + 1]; if (nb && nb[1] === 'sovMoveBlade') nb._q = s.beats[mi]._q; }
    { const bi = s.beats.findIndex(b => b[1] === 'sovBlock' && Math.abs(b[0] - (BLOCK - 0.04)) < 1e-6), bt = s.beats[bi], b0 = Object.assign({}, L.POSES.stand, L.POSES.sovReady, L.POSES.sovBlock, bt[3]); let best = null;
      for (let d0 = -40; d0 <= 40; d0 += 4) for (let d1 = -40; d1 <= 40; d1 += 4) { bt._q = L.resolve(bt[1], Object.assign({}, bt[3], { rArm: b0.rArm + d0, rFore: b0.rFore + d1 })); const x = AS.cross(L, 'k', 's', BLOCK + 0.03), cost = x.d + 0.03 * (Math.abs(d0) + Math.abs(d1)); if (!best || cost < best.cost) best = { d0, d1, cost, d: x.d }; }
      bt[3] = Object.assign({}, bt[3], { rArm: b0.rArm + best.d0, rFore: b0.rFore + best.d1 }); bt._q = null;
      const nx = s.beats[bi + 1]; if (nx && nx[1] === 'sovBlock') { nx[3] = Object.assign({}, bt[3]); nx._q = null; }
      L.D.log.blockSolve = best; }
    L.D.log.throat = L.onBlade('k', L.joints('s', STOP + 0.5).neck, STOP + 0.5);
    L.D.log.block = (() => { const h = L.joints('k', BLOCK + 0.03).rHand, t = L.tip('k', undefined, BLOCK + 0.03), b = L.onBlade('s', { x: t.x, y: t.y }, BLOCK + 0.03); return { tip: [Math.round(t.x), Math.round(t.y)], onSov: b }; })();
    L.D.log.moved = L.onBlade('k', L.joints('s', MOVE).lHand, MOVE);
  },
  tick: function (H) { FILM.tick(H); },
};
