'use strict';
// Stage four (canon: TYRANT, "he has stopped predicting and started reciting"), and the end of him (canon: SOVEREIGN —
// BODY, FIGHTING, AND HOW HE DIES). The bottom room of the Lab, where Dominating left them, the count at 1.
//   1. He recites: three attacks, each already met. The katana breaks on a blade that does not move.
//   2. Every recording shows the fragment forming the next arm. Kael's hand gathers the light and closes on it.
//   3. He walks into the cut on purpose to get a hand on the wrist. The fragment goes out of him and into Sovereign: the
//      anchor. Kael's light goes out; cyan crawls up Sovereign's arm. The pocket flickers and will not open. His palm has a
//      wind-up for the first time, and it moves Kael one step. The count: 0.
//   4. Two men under the same law. Real exchanges; the sword is taken off him and caught.
//   5. He reads the last cut and has nothing for it. The wound finishes. He goes down and stays down.
module.exports = {
  arena: 'city', frames: 1390, endC: 18.4,
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    AS.stage(); AS.mini = CA.proxy(AS.red, 'katana'); CR.veins = [];
    const red = AS.red, cyan = AS.cyan, spark = '#ffe9a0';
    // Beats.
    const C1 = 1.3, C2 = 1.95, TBRK = 2.55, PALM1 = 2.8, CUTK = 5.3, TA = 5.42, TREL = 8.25, ZERO = 8.4;
    const SWING = 9.62, CROSS = 9.95, THR = 10.62, ELB = 10.8, TD = 10.84, TC = 11.4, TF = 12.8;
    const near = [470, 610, 1180, 1320].map((x, i) => ({ x, seed: i * 7 + 53 }));
    // The recordings go dark one by one once he is down, nearest first.
    const darkAt = x => 15.7 + Math.abs(x - 860) / 900;
    const lampK = [[0, 0.5], [TA, 0.5], [TA + 0.3, 0.32, 'out'], [ZERO, 0.32], [ZERO + 0.05, 0.42], [15.4, 0.42], [17.0, 0.2, 'io']];
    const COUNT = [[0, 1], [ZERO, 0]];
    const countAt = t => { let n = 1; for (const [c, v] of COUNT) if (t >= c) n = v; return n; };
    const monK = [[0, 1], [16.6, 1], [17.4, 0, 'in']];
    const anchorK = [[0, 0], [TA, 0], [TA + 1.4, 1, 'out'], [TF, 1], [TF + 0.05, 1.6], [14.3, 0.7, 'out'], [16.5, 0, 'io']];
    const kVeinK = [[0, 0], [TA, 0], [TA + 0.5, 1, 'out'], [TA + 1.6, 0.35, 'io'], [TF, 0.25], [15, 0, 'io']];
    const woundK = [[0, 0], [TF, 0], [TF + 0.02, 0.6], [13.4, 0.35], [14.2, 1, 'in'], [16.2, 0.6, 'io']];
    const swordK = [[0, 1], [16.4, 1], [17.4, 0, 'in']];
    const crackK = [[0, 0.7], [TBRK, 0.7], [TBRK + 0.02, 0]];
    let memo = null;
    const ahead = () => {
      if (memo && memo.c === L.D.c) return memo;
      const s = L.state(L.actors.k, L.D.c + 0.32), q = Object.assign({}, s.q);
      const rolled = Math.abs(q.rot || 0) > 0.3;
      memo = { c: L.D.c, q: rolled ? L.resolve('kneel') : (q.rot = 0, q), face: s.face };
      return memo;
    };
    // Cyan along a body's bones, grown from the first joint of each path (k 0..1), with a fixed jag per segment.
    const bodyVeins = (c, key, k, paths, seed, w) => {
      if (k <= 0.01) return;
      const J = L.joints(key), r = CA.srand(seed);
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.shadowColor = cyan; c.shadowBlur = 10;
      c.strokeStyle = cyan; c.globalAlpha = Math.min(1, k * 1.5) * (0.75 + 0.25 * Math.sin(L.D.c * 23 + seed));
      for (const [p0, path] of paths) {
        const u = Math.max(0, Math.min(1, (Math.min(k, 1) - p0) / (1 - p0))) * (path.length - 1);
        c.lineWidth = (w || 1.6) * (k > 1 ? k : 1); c.beginPath(); c.moveTo(J[path[0]].x, J[path[0]].y);
        for (let i = 0; i < path.length - 1 && i < u; i++) {
          const a = J[path[i]], b = J[path[i + 1]], f = Math.min(1, u - i), nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
          for (let j = 1; j <= 4; j++) {
            const v = j / 4 * f, o = j < 4 ? (r() - 0.5) * 7 : 0;
            c.lineTo(a.x + (b.x - a.x) * v + nx / nl * o, a.y + (b.y - a.y) * v + ny / nl * o);
          }
        }
        c.stroke();
      }
      c.restore();
    };
    const S_PATHS = [[0, ['rHand', 'rElbow', 'shoulder', 'neck', 'head']], [0.45, ['shoulder', 'hip', 'lKnee', 'lFoot']], [0.55, ['hip', 'rKnee', 'rFoot']], [0.5, ['neck', 'lElbow', 'lHand']]];
    const K_PATHS = [[0, ['lHand', 'lElbow', 'shoulder', 'neck']]];
    // The red copy out of his hand: hilt and angle while it flies (set below), and where it lies once dropped.
    let fly = null; const DROP = 16.2, LAND = 16.55;
    L.setup(H, {
      tempo: 1, vignette: 0.6, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c, v = L.view(), A = ahead(), lamp = L.curve(lampK, t)[0];
        AS.paintLab(c, {
          near, redK: 1, lamp: () => lamp * (t > TA && t < ZERO ? (Math.sin(t * 70) > -0.3 ? 1 : 0.4) : 1),
          mon: { x: 1000, n: countAt(t), label: 'TYRANT', k: L.curve(monK, t)[0] },
          colState: x => {
            const dead = darkAt(x);
            if (t < TBRK + 0.4) return { stop: 1, mimicQ: A.q, mimicFace: A.face, look: 0, dead };
            // Every recording forms the next arm. Then nothing in them moves.
            return { stop: 1, look: 860, mimic: 'reachHold', dead };
          },
        });
        // The floor above, and the hole he came down through.
        c.save(); c.fillStyle = '#0a0d0e'; c.fillRect(v.x0 - 40, v.y0 - 40, v.x1 - v.x0 + 80, Math.max(0, G - 372 - (v.y0 - 40)));
        c.fillStyle = 'rgba(160,190,185,0.08)'; c.fillRect(770, G - 400, 100, 28); c.restore();
      },
      actors: {
        k: { scale: 1, z: 2, beats: [[0, 'guard']], pos: [[0, 822, 0]], face: [[0, 1]], weapon: [[0, true], [TBRK + 0.02, false]],
          aura: [[0, 0.55], [TA, 0.55], [TA + 0.6, 0, 'out']], glowK: [[0, 0.4], [TA, 0.4], [TA + 0.6, 0, 'out']],
          eyes: [[0, 1], [TA + 0.3, 1], [TA + 0.8, 0.25, 'out']],
          expr: [[0, 'intense'], [TBRK, 'hurt'], [3.6, 'intense'], [CUTK, 'hurt'], [TA + 0.2, 'angry'], [ZERO, 'intense'], [TF + 0.4, 'neutral']],
          post: (c, L) => {
            const t = L.D.c;
            CR.bladeCracks(c, 'k', L.curve(crackK, t)[0]);
            bodyVeins(c, 'k', L.curve(kVeinK, t)[0], K_PATHS, 11, 1.3);
            // The red copy, in his hand from the catch until he lets it go.
            if (t >= TC && t < DROP) { const J = L.joints('k'), sj = L.joints('s'); if (sj) CA.loose(c, L.actors.s.f, J.rHand.x, J.rHand.y, J.rFore, 1.08); }
          } },
        s: { scale: 1.08, z: 1, wAbs: true, wkey: [[0, AS.COUNTER.katana]], weapon: [[0, true], [TD, false]], beats: [[0, 'sovReady']], pos: [[0, 892, 0]], face: [[0, -1]],
          aura: [[0, 0.24], [TA, 0.24], [TA + 0.6, 0, 'out']], auraColor: red, eyes: [[0, 1], [TF + 1.6, 1], [15.4, 0, 'in']], eyeColor: red, expr: [[0, 'neutral'], [CROSS, 'hurt'], [CROSS + 0.4, 'neutral'], [ELB, 'hurt'], [11.6, 'neutral'], [TF + 1.4, 'hurt']],
          post: (c, L) => {
            const t = L.D.c;
            // The long cut: the two wounds from the fight between (z5, z7) are still open from here on.
            if (window.__ENV.LONG && t >= 3.55) { AS.wound(c, L, 's', 1); AS.wound(c, L, 's', 1, red, 0.15, 0.3); }
            bodyVeins(c, 's', L.curve(anchorK, t)[0], S_PATHS, 29, 1.6);
            // The wound, finishing: a line across him that does not close.
            const wk = L.curve(woundK, t)[0];
            if (wk > 0.01) {
              const J = L.joints('s'), a = { x: J.shoulder.x * 0.75 + J.hip.x * 0.25, y: J.shoulder.y * 0.75 + J.hip.y * 0.25 }, an = (J.face > 0 ? 0.55 : P - 0.55), l = 17;
              c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.shadowColor = red; c.shadowBlur = 8 + 10 * wk;
              c.globalAlpha = Math.min(1, wk); c.strokeStyle = '#ff6040'; c.lineWidth = 2.4;
              c.beginPath(); c.moveTo(a.x - Math.cos(an) * l, a.y - Math.sin(an) * l * 1.6); c.lineTo(a.x + Math.cos(an) * l, a.y + Math.sin(an) * l * 1.6); c.stroke(); c.restore();
            }
          } },
      },
      cam: [[0, 860, 80, 2.2]],
      ev: [],
    });
    const a = L.actors, KB = [], SB = [], KP = [], SP = [], KF = [[0, 1]], SF = [[0, -1]], ev = L.spec.ev, blows = [], stops = [];
    const kb = (t, p, e, x) => KB.push([t, p, e || 'io', x]), sb = (t, p, e, x) => SB.push([t, p, e || 'io', x]);
    const kp = (t, x, h, e) => KP.push(e ? [t, x, h || 0, e] : [t, x, h || 0]), sp = (t, x, h, e) => SP.push(e ? [t, x, h || 0, e] : [t, x, h || 0]);
    const sfx = (t, k, g, r) => ev.push([t, l => l.sfx(k, g, r)]);
    const swish = (t, r) => sfx(t, 'swingHeavy', 0.65, r || 1.15);
    const clash = (t, stop) => {
      stops.push([t, stop || 0.3, 0.07]);
      ev.push([t + 0.015, l => {
        const x = AS.cross(l, 'k', 's', t + 0.03);
        (l.D.log.clash || (l.D.log.clash = {}))[t] = x.d;
        if (x.d > 16) (l.D.log.miss || (l.D.log.miss = [])).push(['clash', t, x.d]);
        l.sfx('clang', 0.9, 0.9 + Math.random() * 0.25); l.shake(6);
        l.debris(x.x, x.y, 12, { kind: 'spark', col: spark, v: 4.6, r: 1.7, g: 0.14, spread: 360, life: 22 });
        l.ring(x.x, x.y, 30, { col: spark, w: 2.4, life: 11 });
      }]);
    };
    const hit = (t, by, wth, on, at, kind, shake) => {
      blows.push({ t, by, with: wth, on, at, kind: 'none', range: 90, lead: 0.02 }); stops.push([t, 0.3, 0.06]);
      ev.push([t + 0.05, l => { const p = CA.point(on, at, t + 0.06); l.sfx(kind === 'light' ? 'hitBlunt' : 'heavyHit', 0.8, kind === 'light' ? 1.15 : 0.95); l.sfx('hitBlunt', 0.6, 1); l.shake(shake || 8); l.debris(p.x, p.y, 8, { kind: 'spark', col: spark, v: 3.4, r: 1.5, g: 0.08, spread: 360, life: 18 }); l.ring(p.x, p.y, 26, { col: spark, w: 2, life: 10 }); }]);
    };

    // ── 1. he recites ──
    // Kael gives himself room; Sovereign's sword is already where the first cut will be.
    kb(0.35, 'guard', 'io', { headTilt: 4 }); kp(0, 822); kp(0.75, 770, 0, 'io'); kb(0.5, 'walkB', 'io'); kb(0.75, 'guard', 'io');
    sb(0.6, 'sovReady', 'io', { headTilt: 6 }); sp(0, 892);
    SB.push(...AS.walk(1.04, 1.5, 0.2, { rFore: -84, rArm: 30 }, 'sovWalkA', 'sovWalkB')); sp(1.0, 892); sp(1.5, 872, 0, 'lin');
    sb(1.0, 'sovBlock', 'out', { rFore: -84, rArm: 30 }); sb(C1 + 0.2, 'sovBlock', 'io', { rFore: -84, rArm: 30 });
    kb(1.12, 'windBack', 'out', { rArm: -160, rFore: -140 }); kb(C1, 'slashOut', 'xout', { rArm: -30, rFore: -22 }); kp(1.12, 770); kp(C1, 792, 0, 'out'); swish(C1 - 0.06, 1.1);
    clash(C1, 0.3); kb(C1 + 0.18, 'guard', 'io');
    // He is already leaning out of the thrust.
    sb(1.62, 'sovLean', 'out'); sb(C2 + 0.12, 'sovLean', 'io');
    kb(C2, 'thrust', 'xout', { rArm: -16, rFore: -16 }); kp(C2 - 0.12, 788); kp(C2, 806, 0, 'xout'); swish(C2 - 0.04, 1.3); kb(C2 + 0.16, 'thrust', 'io', { rArm: -16, rFore: -16 });
    // The cut down meets a blade that does not move, and the katana goes.
    sb(2.2, 'blockHigh', 'out'); sb(TBRK + 0.12, 'blockHigh', 'io');
    kb(2.3, 'highGuard', 'out'); kb(TBRK, 'cutDown', 'xout', { rArm: -10, rFore: 14, torso: 14 }); kp(2.3, 780); kp(TBRK, 790, 0, 'out'); swish(TBRK - 0.08, 0.9);
    clash(TBRK, 0.18); stops.push([TBRK + 0.02, 0.12, 0.22]);
    ev.push([TBRK + 0.02, l => {
      l.disperse('k', cyan, 1.1); l.sfx('hitSnap', 1, 0.8); l.sfx('clang', 1, 1.6); l.sfx('stingImpact', 0.7, 0.8); l.shake(10); l.impact(1, { tint: '#bfefff' });
      const tp = l.tip('k'); l.debris((tp.x + tp.hand.x) / 2, (tp.y + tp.hand.y) / 2, 22, { kind: 'spark', col: '#9ff0ff', v: 4, r: 1.8, g: 0.12, spread: 360, life: 34 });
    }]);
    kb(TBRK + 0.14, 'cutDown', 'io', { rArm: 4, rFore: 30, torso: 22 }); kb(PALM1, 'cutDown', 'io', { rArm: 4, rFore: 30, torso: 22 });
    // Palm, and he goes down the room.
    sb(PALM1 - 0.1, 'sovReady', 'in'); sb(PALM1, 'sovPalm', 'xout'); hit(PALM1, 's', 'lHand', 'k', 'chest', 'heavy', 9); sb(PALM1 + 0.25, 'sovReady', 'io'); sp(PALM1 - 0.1, 864); sp(PALM1, 832, 0, 'out'); sp(PALM1 + 0.3, 852, 0, 'io');
    kb(PALM1 + 0.09, 'headSnap', 'xout'); kb(PALM1 + 0.18, 'flyBack', 'xout'); kp(PALM1 + 0.06, 790); kp(3.15, 690, 0, 'out'); kb(3.15, 'skid', 'xout'); kb(3.45, 'kneel', 'io');
    sfx(3.15, 'landHard', 0.6, 1.1); ev.push([3.15, l => l.dust(700, 8, 90, { a: 0.24 })]);

    // ── 2. every recording forms the next arm; his hand closes on the light ──
    kb(3.85, 'lookHand', 'io'); kb(4.55, 'lookHand', 'io', { rFore: -70, headTilt: 26 });
    ev.push([3.95, l => {
      l.sfx('phaseUp', 0.4, 0.8);
      const motes = []; for (let i = 0; i < 22; i++) motes.push({ a: Math.random() * P * 2, r: 30 + Math.random() * 40, w: 1.5 + Math.random() * 2.5, sp: 1 + Math.random() * 2 });
      l.add({ t: 'draw', life: 0.66 * 60, fn: (c, k) => {
        const h = l.joints('k').rHand;
        c.globalCompositeOperation = 'lighter'; c.shadowColor = cyan; c.shadowBlur = 10; c.fillStyle = cyan;
        for (const m of motes) { const r = m.r * (1 - 0.7 * k), an = m.a + k * m.sp * 3; c.globalAlpha = 0.85 * Math.min(1, k * 5); c.fillRect(h.x + Math.cos(an) * r - m.w / 2, h.y + Math.sin(an) * r * 0.8 - m.w / 2, m.w, m.w); }
        const g = c.createRadialGradient(h.x, h.y, 1, h.x, h.y, 16 + 10 * k); g.addColorStop(0, 'rgba(160,240,255,' + (0.5 * k) + ')'); g.addColorStop(1, 'rgba(0,212,255,0)');
        c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(h.x, h.y, 26, 0, P * 2); c.fill();
      } });
    }]);
    ev.push([4.6, l => { const J = l.joints('k'); l.debris(J.rHand.x, J.rHand.y, 10, { kind: 'spark', col: cyan, v: 1.6, r: 1.4, g: 0.02, spread: 360, life: 26 }); l.sfx('hitZap', 0.35, 0.5); }]);
    kb(4.7, 'lookHand', 'io', { rArm: 70, rFore: 40, headTilt: 10 });
    sb(3.7, 'sovReady', 'io', { headTilt: 2 }); sb(4.7, 'sovReady', 'io', { headTilt: 12 });

    // ── 3. into the cut on purpose; the hand on the wrist; the anchor ──
    kb(4.85, 'rising', 'io'); kb(5.0, 'runA', 'out'); kb(5.12, 'runB'); kb(5.22, 'runA'); kp(4.85, 690); kp(5.0, 700); kp(CUTK, 772, 0, 'in');
    sb(4.95, 'sovRaise', 'out'); sb(CUTK, 'cutDown', 'xout', { rArm: 30, rFore: 60 }); swish(CUTK - 0.08, 0.85);
    // The edge on his shoulder: logged against the blade.
    ev.push([CUTK + 0.03, l => {
      const J = l.joints('k'), p = { x: J.shoulder.x, y: J.shoulder.y }, b = l.onBlade('s', p, CUTK + 0.03);
      (l.D.log.cuts || (l.D.log.cuts = {})).shoulder = b.d; if (b.d > 16) (l.D.log.miss || (l.D.log.miss = [])).push(['shoulder', b.d]);
      AS.cutLine(l, p.x, p.y, 1.1, 20, red); l.sfx('hitSlash', 0.9, 0.9); l.sfx('heavyHit', 0.6, 1.1); l.shake(9);
      l.debris(p.x, p.y, 10, { kind: 'spark', col: '#ff8060', v: 3, r: 1.5, g: 0.1, spread: 200, dir: -60, life: 20 });
    }]);
    stops.push([CUTK, 0.25, 0.08]);
    kb(CUTK, 'runA', 'io', { torso: 20 }); kb(TA, 'catchWrist', 'xout', { headTilt: -6 }); sb(TA + 0.1, 'cutDown', 'io', { rArm: 30, rFore: 60 });
    blows.push({ t: TA, by: 'k', with: 'lHand', on: 's', at: 'rHand', kind: 'catch', range: 100, lead: 0.02 }); stops.push([TA, 0.2, 0.28]);
    ev.push([TA + 0.04, l => { l.sfx('hitBlunt', 1, 0.7); l.sfx('stingLow', 0.7, 0.8); l.shake(6); const J = l.joints('s'); l.ring(J.rHand.x, J.rHand.y, 22, { col: cyan, w: 2.4, life: 14 }); }]);
    // The fragment goes out of him and into Sovereign.
    for (let i = 0; i < 6; i++) sfx(TA + 0.12 + i * 0.2, 'hitZap', 0.3 - i * 0.03, 0.6 + i * 0.05);
    sfx(TA + 0.3, 'soulRip', 0.5, 0.7); sfx(TA + 1.1, 'stingLow', 0.6, 0.6);
    kb(TA + 0.8, 'catchWrist', 'io', { headTilt: 6, hipDrop: 14 }); kb(7.0, 'catchWrist', 'io', { headTilt: 0, hipDrop: 14 });
    sb(6.1, 'cutDown', 'io', { rArm: 30, rFore: 60, headTilt: 40 }); sb(6.8, 'cutDown', 'io', { rArm: 30, rFore: 60, headTilt: 20 });
    // The pocket will not open: three tries, each shorter.
    const SWA = [[0, 1]];
    [[7.05, 0.22], [7.35, 0.16], [7.58, 0.11]].forEach(([t, life], i) => {
      ev.push([t, l => { AS.portal(l, 's', life); const J = l.joints('s'); l.debris(J.rHand.x, J.rHand.y, 8, { kind: 'spark', col: red, v: 2, r: 1.4, g: 0.25, dir: 90, spread: 120, life: 26 }); l.sfx('hitZap', 0.4, 1.3 - i * 0.15); }]);
      SWA.push([t, 1], [t + life * 0.5, 0.35], [t + life, 1, 'in']);
    });
    a.s.wAlphaK = SWA;
    // His palm, with a wind-up for the first time. It moves Kael a step.
    sb(7.75, 'cutDown', 'io', { rArm: 30, rFore: 60, lArm: 160, lFore: 176, headTilt: 4 }); sb(TREL - 0.05, 'cutDown', 'in', { rArm: 30, rFore: 60, lArm: 168, lFore: 186, headTilt: 4 });
    sp(TREL - 0.06, 852); sp(TREL, 842, 0, 'out'); sb(TREL, 'sovPalm', 'out', { torso: 30, hipDrop: 14, lArmLen: 1.22, rLeg: 140, rShin: 126, lLeg: 40, lShin: 94 }); hit(TREL, 's', 'lHand', 'k', 'chest', 'light', 5); sb(TREL + 0.3, 'sovReady', 'io');
    kb(TREL + 0.08, 'slipBack', 'out'); kb(TREL + 0.4, 'boxGuard', 'io');
    sfx(7.8, 'swing', 0.4, 0.7);
    // 0.
    ev.push([ZERO, l => { l.sfx('iaiMark', 0.8, 0.45); l.sfx('stingLow', 0.8, 0.5); l.shake(3); }]);

    // ── 4. two men under the same law ──
    sb(9.2, 'windBack', 'out', { rArm: 150, rFore: 176, torso: -8 }); sb(SWING, 'slashOut', 'out', { rArm: -6, rFore: 6, torso: 20 }); swish(SWING - 0.1, 0.8);
    kb(9.4, 'boxGuard', 'io'); kb(SWING - 0.06, 'slip', 'out'); kb(SWING + 0.1, 'slip', 'io');
    sb(SWING + 0.25, 'slashOut', 'io', { rArm: 6, rFore: 18, torso: 24 });
    kb(CROSS, 'cross', 'xout'); hit(CROSS, 'k', 'rHand', 's', 'head', 'light', 6); kb(CROSS + 0.16, 'boxGuard', 'io');
    sb(CROSS + 0.08, 'headSnap', 'xout'); sb(10.25, 'sovReady', 'io');
    sb(10.42, 'sovReady', 'out', { rArm: 140, rFore: 160, torso: -4 }); sb(THR, 'thrust', 'xout', { rArm: 0, rFore: 0 }); swish(THR - 0.06, 1.2);
    kb(THR - 0.04, 'parry', 'xout'); blows.push({ t: THR - 0.04, by: 'k', with: 'lHand', on: 's', at: 'rFore', kind: 'block', range: 90, lead: 0.04 });
    kb(ELB, 'elbow', 'xout'); hit(ELB, 'k', 'lElbow', 's', 'chest', 'heavy', 11); sb(ELB + 0.08, 'folded', 'xout'); sb(11.05, 'knockedBack', 'out'); sb(11.5, 'sovReady', 'io');
    // The sword out of his hand, up, and into Kael's.
    kb(11.1, 'guard', 'out', { headTilt: -24 }); kb(TC, 'guard', 'io', { headTilt: -6 }); kb(TC + 0.08, 'guard', 'out', { hipDrop: 14 });
    ev.push([TC, l => { l.sfx('pickup', 0.6, 0.8); l.sfx('clang', 0.35, 1.8); }]); sfx(TD + 0.02, 'throwSpin', 0.5, 1);

    // ── 5. the last cut ──
    kb(11.9, 'iaido', 'io'); kb(12.5, 'iaido', 'io', { hipDrop: 24 });
    sb(12.0, 'sovReady', 'io', { headTilt: 0 }); sb(12.45, 'sovCatch', 'io'); sb(TF + 0.12, 'sovCatch', 'out', { lFore: -60, lArm: 6 });
    kb(TF, 'follow', 'xout'); sfx(TF - 0.06, 'swingHeavy', 0.9, 0.7);
    stops.push([TF + 0.02, 0.15, 0.24]);
    ev.push([TF + 0.03, l => {
      const J = l.joints('s'), p = { x: J.shoulder.x * 0.75 + J.hip.x * 0.25, y: J.shoulder.y * 0.75 + J.hip.y * 0.25 };
      AS.cutLine(l, p.x, p.y, -0.55, 46, '#ff6040'); l.sfx('iaiMark', 1, 0.6); l.sfx('hitSlash', 1, 0.7); l.sfx('stingImpact', 0.9, 0.5); l.shake(14); l.impact(2, { tint: '#ffb0a0' });
    }]);
    kb(13.7, 'follow', 'io', { torso: 40, hipDrop: 24 }); kb(14.6, 'ready', 'io', { headTilt: 10 }); kb(DROP, 'ready', 'io', { rArm: 92, rFore: 100, headTilt: 14 });
    // He stands. The wound finishes. He looks at his hand. Down.
    sb(13.4, 'sovCatch', 'io', { lFore: -60, lArm: 6, torso: -4 }); sb(14.1, 'lookHandStand', 'io'); sb(14.7, 'lookHandStand', 'io', { headTilt: 30 });
    sb(15.1, 'kneel', 'in', { headTilt: 20 }); sb(15.75, 'kneel', 'io', { headTilt: 34, torso: 40 }); sb(16.25, 'fallen', 'in'); sb(16.6, 'fallen', 'io');
    ev.push([15.1, l => { l.sfx('landHard', 0.5, 0.8); l.dust(L.state(a.s, 15.1).x, 6, 50, { a: 0.18 }); }]);
    ev.push([16.25, l => { l.sfx('landHard', 0.8, 0.65); l.shake(4); l.dust(L.state(a.s, 16.25).x - 30, 8, 80, { a: 0.24 }); }]);
    sfx(14.2, 'stingLow', 0.5, 0.45);
    for (const n of near) ev.push([darkAt(n.x), l => l.sfx('hitZap', 0.15, 0.4)]);
    ev.push([LAND, l => { l.sfx('clang', 0.45, 0.7); }]);

    for (const q of [KB, SB, KP, SP, KF, SF]) q.sort((p, r) => p[0] - r[0]);
    a.k.beats = KB; a.k.pos = KP; a.k.face = KF; a.s.beats = SB; a.s.pos = SP; a.s.face = SF;

    // Blades that meet: Sovereign's arm solved at each clash so his still blade is where Kael's arrives.
    const solve = (t, key, costFn, R, win) => {
      R = R || 28; win = win || 0.45;
      const bi = a[key].beats.findIndex(q => Math.abs(q[0] - t) < 1e-6); if (bi < 0) return;
      const bt = a[key].beats[bi], base0 = Object.assign({}, L.POSES.stand, L.POSES[bt[1]], bt[3]); let best = null;
      for (let d0 = -R; d0 <= R; d0 += 4) for (let d1 = -R; d1 <= R; d1 += 4) {
        bt._q = L.resolve(bt[1], Object.assign({}, bt[3], { rArm: base0.rArm + d0, rFore: base0.rFore + d1 }));
        const x = costFn(), cost = x.d + 0.03 * (Math.abs(d0) + Math.abs(d1)) + (x.u < 0.35 ? 30 : 0);
        if (!best || cost < best.cost) best = { d0, d1, cost, d: x.d, u: x.u };
      }
      bt[3] = Object.assign({}, bt[3], { rArm: base0.rArm + best.d0, rFore: base0.rFore + best.d1 }); bt._q = null;
      (L.D.log.solve || (L.D.log.solve = {}))[t] = best;
      // The hold either side keeps the same arm.
      for (const nb of a[key].beats) if (nb !== bt && nb[1] === bt[1] && nb[0] - t > -0.45 && nb[0] - t < win) { nb[3] = Object.assign({}, nb[3], { rArm: bt[3].rArm, rFore: bt[3].rFore }); nb._q = null; }
    };
    // His block is already up: solve the held beat before the clash, then the clash beat copies it.
    SB.push([C1, 'sovBlock', 'io', { rFore: -84, rArm: 30 }], [TBRK, 'blockHigh', 'io']); SB.sort((p, r) => p[0] - r[0]);
    // Kael's cut arrives into the still blade: solve his arm so the blades cross along Sovereign's, not at his hand.
    const crossOnS = t => () => { const x = AS.cross(L, 'k', 's', t + 0.03); x.u = L.onBlade('s', x, t + 0.03).u; return x; };
    solve(C1, 'k', crossOnS(C1), 60); solve(TBRK, 'k', crossOnS(TBRK), 60);
    // His edge onto Kael's shoulder.
    solve(CUTK, 's', () => { const J = L.joints('k', CUTK + 0.03); return L.onBlade('s', { x: J.shoulder.x, y: J.shoulder.y }, CUTK + 0.03); }, 64, TREL - CUTK - 0.01);
    // From the palm on, positions follow the bodies: Sovereign in range of each blow, Kael past him on the last cut.
    const sx = L.state(a.s, TREL).x, kx = sx - 80;
    for (let i = KP.length - 1; i >= 0; i--) if (KP[i][0] > TA && KP[i][0] < TREL + 0.35) KP.splice(i, 1);
    KP.push([TREL + 0.35, sx - 80, 0, 'out']);
    SP.push([9.2, sx, 0], [SWING, sx - 10, 0, 'out'], [CROSS + 0.06, sx - 8, 0], [CROSS + 0.26, sx + 6, 0, 'out'], [10.42, sx, 0], [THR, sx - 18, 0, 'xout'], [ELB + 0.06, sx - 18, 0], [ELB + 0.36, sx + 22, 0, 'out'], [11.5, sx + 26, 0, 'io']);
    KP.push([9.4, kx, 0], [SWING, kx, 0], [CROSS, sx - 34, 0, 'out'], [CROSS + 0.25, sx - 50, 0, 'io'], [THR, sx - 62, 0], [ELB, sx - 48, 0, 'out'], [TC, sx - 30, 0, 'io'], [12.5, sx - 30, 0]);
    const SX = sx + 26, KX0 = sx - 30;
    SP.push([15.1, SX, 0], [15.749, SX, 0], [15.75, SX, 17], [16.02, SX - 4, 28, 'io'], [16.17, SX - 8, 26, 'io'], [16.27, SX - 10, 14, 'in']);
    KP.push([TF, SX + 92, 0, 'out']);
    SP.sort((p, r) => p[0] - r[0]); KP.sort((p, r) => p[0] - r[0]);
    // Kael stands where his aimed hand meets the wrist and holds it (sideways only) until the palm.
    CA.blows(L, blows.filter(b => b.t === TA));
    const base = c => L.curve(a.k.pos, c), TL = TREL - 0.06;
    const offAt = c => { const b = base(c); a.k._lk = true; try { return L.joints('s', c).rHand.x - L.joints('k', c).lHand.x; } finally { a.k._lk = false; } };
    {
      const prev = a.k.posFn; a.k.posFn = null;
      const lx = base(TA)[0] + offAt(TA); a.k.posFn = prev;
      const k0 = KP.find(q => q[0] === CUTK); if (k0) k0[1] = Math.min(k0[1], lx - 4);
      KP.push([TA, lx, 0], [TL, lx, 0], [TREL + 0.06, lx, 0]); KP.sort((p, r) => p[0] - r[0]); L.D.log.catch = Math.round(lx);
    }
    a.k.posFn = c => { const b = base(c).slice(); if (c > TA && c < TL && !a.k._lk) { a.k._lk = true; try { b[0] += L.joints('s', c).rHand.x - L.joints('k', c).lHand.x; } finally { a.k._lk = false; } } return b; };
    { const v = a.k.posFn(TL - 1e-4)[0]; for (const q of KP) if (q[0] === TL || q[0] === TREL + 0.06) q[1] = v; L.D.log.release = Math.round(v); }
    CA.blows(L, blows.filter(b => b.t !== TA));
    // The red copy: out of his hand at TD, spinning up, into Kael's at TC; then let go, onto the floor.
    {
      const J0 = L.joints('s', TD), h0 = J0.rHand, an0 = J0.wAng, J1 = L.joints('k', TC), h1 = J1.rHand, an1 = J1.rFore;
      const top = Math.min(h0.y, h1.y) - 64, turns = 2;
      fly = c => {
        const u = Math.max(0, Math.min(1, (c - TD) / (TC - TD))), x = h0.x + (h1.x - h0.x) * u;
        const y = (1 - u) * (1 - u) * h0.y + 2 * u * (1 - u) * (2 * top - (h0.y + h1.y) / 2) + u * u * h1.y;
        return { x, y, an: an0 + (an1 + 2 * P * turns - an0) * u };
      };
      L.D.log.fly = { from: [Math.round(h0.x), Math.round(h0.y)], to: [Math.round(h1.x), Math.round(h1.y)] };
      const Jd = L.joints('k', DROP), hd = Jd.rHand;
      L.add({ t: 'draw', life: 99999, fn: c => {
        const t = L.D.c; L.joints('s');
        if (t >= TD && t < TC) { const f = fly(t); CA.loose(c, a.s.f, f.x, f.y, f.an, 1.08); }
        if (t >= DROP) {
          const u = Math.min(1, (t - DROP) / (LAND - DROP)), y = hd.y + (G - 6 - hd.y) * u * u, an = (P / 2.2) * (1 - u) + 0.04 * u;
          c.save(); c.globalAlpha = L.curve(swordK, t)[0]; CA.loose(c, a.s.f, hd.x - 10 * u, y, an, 1.08); c.restore();
        }
      } });
    }
    a.k.trail = [[1.1, 1.4, 2, 0.03, 0.2], [1.85, 2.05, 2, 0.03, 0.2], [PALM1, 3.15, 3, 0.03, 0.22], [5.0, CUTK, 2, 0.03, 0.2], [TF - 0.05, TF + 0.2, 4, 0.02, 0.28]];
    a.s.trail = [[0.95, 1.1, 2, 0.04, 0.2], [1.55, 1.75, 2, 0.04, 0.2], [2.15, 2.3, 2, 0.04, 0.2], [PALM1 - 0.1, PALM1 + 0.1, 2, 0.04, 0.2], [4.95, CUTK + 0.05, 2, 0.04, 0.2]]; a.s.trailColor = red;
    L.spec.speed = CA.hitch(stops.sort((p, r) => p[0] - r[0]));
    L.D.log.pos = { sx: Math.round(sx), kx: Math.round(kx), SX: Math.round(SX), KX0: Math.round(KX0) };
    L.spec.cam = [
      // The count first, then down to them.
      [0, 930, 130, 1.9], [0.7, 880, 100, 2.05, 'sine'],
      ...CA.follow(L, 'k', 's', 0.9, 3.3, { zMax: 2.5, zMin: 1.7, lift: 16, cut: false }),
      // Kael on one knee, his hand; the room of recordings forming the arm behind him.
      [3.6, 720, 70, 2.6, 'hold'], [4.6, 712, 64, 2.85, 'sine'],
      [4.75, 840, 90, 1.6, 'hold'],
      ...CA.follow(L, 'k', 's', 4.9, TA, { zMax: 2.4, zMin: 1.7, lift: 16, cut: false }),
      // The hand on the wrist, close.
      [TA + 0.15, 0, 0, 0], // placeholder replaced below
    ];
    const J = L.joints('s', TA);
    L.spec.cam.pop();
    L.spec.cam.push(
      [TA + 0.12, J.rHand.x, G - J.rHand.y + 6, 3.3, 'hold'], [TA + 0.9, J.rHand.x + 8, G - J.rHand.y + 26, 3.0, 'sine'],
      // Out to both of them as it climbs him; the lamps failing.
      [6.3, (J.rHand.x + SX) / 2, 84, 2.1, 'sine'], [7.0, (J.rHand.x + SX) / 2, 80, 2.2, 'sine'],
      ...CA.follow(L, 'k', 's', 7.6, ZERO - 0.05, { zMax: 2.4, zMin: 1.8, lift: 16, cut: false }),
      // The screen.
      [ZERO, 1000, 210, 2.9, 'hold'], [ZERO + 0.7, 1000, 210, 3.05, 'sine'],
      ...CA.follow(L, 'k', 's', 9.1, 11.8, { zMax: 2.4, zMin: 1.75, lift: 16 }),
      // His eyes, then both.
      [11.85, SX - 4, 74, 3.4, 'hold'], [12.35, SX - 4, 76, 3.6, 'sine'],
      [12.4, (KX0 + SX) / 2 + 20, 80, 2.0, 'hold'], [TF + 0.4, (KX0 + SX) / 2 + 40, 78, 2.1, 'sine'],
      [14.0, SX + 30, 78, 2.15, 'sine'], [15.6, SX + 20, 60, 2.0, 'sine'],
      [17.0, SX + 40, 90, 1.7, 'sine'], [18.4, SX + 40, 100, 1.55, 'sine'],
    );
  },
  tick: function (H) { FILM.tick(H); },
};
