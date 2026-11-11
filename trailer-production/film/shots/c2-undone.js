'use strict';
// Act 2, undone. The Creator comes apart into its own light and rebuilds itself far across the floor. It unmakes
// the floor between them; Kael keeps walking, and a plate of fragment light forms under every step (the one thing
// the unmaking cannot reach). It raises a forest of spikes around him. He drives the katana into the floor and cyan
// veins race out through the violet ground: every spike they touch goes dark and crumbles. Three walls stand up in
// his way and come apart as he walks into them. He stops in front of the Creator, and for the first time it takes
// a step back. The floor behind him runs with cyan.
module.exports = {
  arena: 'creator', frames: 1000, endC: 14.0,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const cyan = '#00d4ff', violet = '#cc00ee', pale = '#e8d4ff';
    CR.stage(1);
    const SX = 790;
    // Kael's path: the gap crossing, then the walk through the walls.
    const kx1 = t => 298 + (520 - 298) * Math.max(0, Math.min(1, t / 4.0));
    const kx2 = t => 520 + 170 * Math.max(0, Math.min(1, (t - 7.2) / 2.8));
    const kBeats = [[0, 'walkLowA']];
    for (let t = 0.35, i = 1; t < 4.0; t += 0.35, i++) kBeats.push([t, i % 2 ? 'walkLowB' : 'walkLowA', 'io']);
    kBeats.push([4.15, 'ready', 'io'], [4.6, 'guard', 'io', { headTilt: -8 }], [4.95, 'crouch', 'io'], [5.22, 'plant', 'xout'], [6.7, 'plant', 'lin', { headTilt: 4 }], [7.05, 'ready', 'io']);
    for (let t = 7.3, i = 0; t < 10.0; t += 0.35, i++) kBeats.push([t, i % 2 ? 'walkLowB' : 'walkLowA', 'io']);
    kBeats.push([10.1, 'ready', 'io'], [14.0, 'ready', 'lin', { headTilt: -4 }]);
    // Footholds: a plate under each step that lands inside the gap.
    const GAP = [340, 500];
    for (let t = 0.35; t < 4.0; t += 0.35) { const x = kx1(t); if (x > GAP[0] - 4 && x < GAP[1] + 4) CR.holds.push({ x: x + 6, c: t - 0.04 }); }
    const gapK = [[0, 0], [1.1, 0], [1.4, 1, 'out'], [3.95, 1], [4.35, 0]];
    // The spike forest, erupting from the Creator's side; Kael stands in the one clear lane at 520.
    const SP = [705, 665, 625, 585, 480, 445, 410, 375].map(x => ({ x, t: 4.5 + (705 - x) / 325 * 0.4 }));
    // Where the planted blade enters the floor (measured: hand 542,456, tip 509,518 -> crosses the floor at x 540).
    const V = { x: 540, c0: 5.25, speed: 320, reach: 380 };
    CR.vein(V.x, V.c0, V.speed, V.reach);
    for (const sp of SP) { sp.dead = V.c0 + Math.abs(sp.x - V.x) / V.speed; sp.gone = sp.dead + 0.35; }
    const spH = (sp, c) => c < sp.t ? 0 : c < sp.t + 0.07 ? 90 * (c - sp.t) / 0.07 : 90;
    // The walls, each coming apart when he is a step from it.
    const WL = [580, 630, 680].map(x => { let die = 7.2; while (kx2(die) < x - 34 && die < 10) die += 1 / 120; return { x, rise: die - 0.6, die, gone: die + 0.25 }; });
    const alphaK = [[0, 1], [0.3, 1], [0.55, 0], [0.7, 0], [1.0, 1]];
    L.setup(H, {
      tempo: 1, vignette: 0.55,
      speed: [[0, 1], [5.2, 1], [5.26, 0.3, 'xout'], [5.7, 0.3], [5.9, 1, 'in']],
      backdrop: (c, L) => {
        const cc = L.D.c;
        CR.drawVeins(c);
        CR.gap(c, GAP[0], GAP[1], L.curve(gapK, cc)[0]);
        for (const sp of SP) {
          if (cc < sp.t - 0.3) continue;
          if (cc < sp.t) { CR.warn(c, sp.x, 1 + (cc - sp.t) / 0.3); continue; }
          if (cc < sp.dead) CR.spike(c, sp.x, spH(sp, cc));
          else if (cc < sp.gone) CR.deadSpike(c, sp.x, 90, (cc - sp.dead) / 0.35 * 0.3);
        }
        for (const w of WL) {
          if (cc < w.rise || cc > w.gone) continue;
          const h = 120 * Math.min(1, (cc - w.rise) / 0.1);
          if (cc < w.die) CR.slab(c, w.x, 40, h, { glint: cc - w.rise < 0.12 ? 1 : 0 });
          else {
            // Dead glass with light running through it, for a moment, before it goes.
            const k = (cc - w.die) / 0.25;
            c.save(); c.globalAlpha = 1 - k * 0.4; c.fillStyle = '#0c0614'; c.fillRect(w.x - 20, G - h, 40, h);
            c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#5fe8ff'; c.shadowColor = cyan; c.shadowBlur = 10; c.lineWidth = 1.2;
            c.beginPath(); for (let i = 0; i < 6; i++) { const y = G - h * (i + 0.5) / 6; c.moveTo(w.x - 20, y); c.lineTo(w.x - 6, y - 7); c.lineTo(w.x + 7, y + 5); c.lineTo(w.x + 20, y - 4); } c.stroke();
            c.restore();
          }
        }
      },
      actors: {
        k: {
          beats: kBeats,
          pos: [[0, 298, 0], [4.0, 520, 0, 'lin'], [7.2, 520, 0], [10.0, 690, 0, 'lin'], [14.0, 690, 0]],
          face: [[0, 1]],
          post: (c, L) => CR.bladeCracks(c, 'k', L.D.c > 5.2 && L.D.c < 6.8 ? 1.6 : 0.8),
          aura: [[0, 0.15], [5.2, 0.15], [5.3, 0.7], [6.6, 0.35], [10.0, 0.3]],
          glowK: [[0, 0], [5.2, 0], [5.3, 0.6], [6.4, 0.15]],
          expr: [[0, 'intense']],
        },
        s: CR.actor({
          beats: [[0, 'crLow'], [1.1, 'crSpread', 'io'], [3.9, 'crSpread'], [4.3, 'crRaise', 'io'], [5.6, 'crRaise'], [6.0, 'crStand', 'io'],
            [6.8, 'crReach', 'io'], [9.6, 'crReach'], [10.1, 'crLow', 'io'], [11.0, 'crLow'], [11.35, 'crLow', 'out', { torso: -8, headTilt: -6 }], [14.0, 'crLow', 'lin', { torso: -6 }]],
          pos: [[0, 424, 0], [0.6, 424, 0], [0.62, SX, 0, 'hold'], [11.0, SX, 0], [11.4, SX + 26, 0, 'out'], [14.0, SX + 26, 0]],
          face: [[0, -1]], weapon: [[0, true]], arcColor: pale, alphaK,
          post: (c, L) => CR.drawBlade(c, 's', L.curve(alphaK, L.D.c)[0]),
          aura: [[0, 0.15], [4.3, 0.15], [4.6, 0.45], [6.0, 0.2]],
        }),
      },
      cam: [
        [0, 362, 80, 1.9], [0.6, 380, 80, 1.85, 'sine'],
        [0.62, 590, 110, 1.3, 'hold'], [1.4, 565, 100, 1.38, 'sine'],
        [1.41, 410, 62, 2.6, 'hold'], [4.0, 515, 64, 2.6, 'lin'],
        [4.01, 560, 92, 1.7, 'hold'], [5.2, 548, 92, 1.85, 'sine'],
        [5.21, 522, 60, 3.0, 'hold'], [5.62, 522, 60, 3.2, 'sine'],
        [5.63, 545, 96, 1.6, 'hold'], [7.0, 548, 96, 1.66, 'sine'],
        [7.01, 590, 80, 2.0, 'hold'], [10.0, 700, 82, 2.1, 'lin'],
        [10.01, 742, 82, 2.6, 'hold'], [11.5, 750, 84, 2.8, 'sine'],
        [11.51, 570, 100, 1.35, 'hold'], [14.0, 595, 100, 1.45, 'sine'],
      ],
      ev: [
        [0.3, L => { const J = L.joints('s'); CR.crumble(J.hip.x, J.head.y - 10, 30, 110, 10); L.sfx('phaseUp', 0.5, 0.6); L.sfx('hitZap', 0.3, 0.7); }],
        [0.7, L => { L.ring(SX, G, 90, { sq: 0.2, col: violet, w: 5, life: 24 }); L.sfx('landHard', 0.4, 1.0); }],
        [1.1, L => { L.sfx('stingLow', 0.6, 0.7); }],
        [1.2, L => { L.sfx('explosion', 0.4, 0.5); L.shake(6); CR.crumble(420, G - 2, 160, 6, 18); }],
        // Each plate goes under the foot that is actually coming down.
        ...CR.holds.map(hd => [hd.c, L => { const J = L.joints('k'), f = J.lFoot.y > J.rFoot.y ? J.lFoot : J.rFoot; hd.x = f.x; L.sfx('iaiMark', 0.25, 1.6); L.ring(hd.x, G, 18, { sq: 0.25, col: cyan, w: 2, life: 12 }); }]),
        [3.95, L => { L.sfx('hitBlunt', 0.4, 0.7); }],
        ...SP.map((sp, i) => [sp.t, L => { L.sfx('hitZap', 0.25, 0.7 + i * 0.05); L.debris(sp.x, G - 2, 4, { v: 4, col: '#c9a0ff', r: 2.4, kind: 'spark', life: 20, g: 0.2 }); if (i % 3 === 0) L.shake(4); }]),
        [5.22, L => {
          L.sfx('heavyHit', 1, 0.6); L.sfx('superActivate', 0.7, 0.8); L.shake(16); L.impact(2, { tint: '#bfefff' });
          L.ring(V.x, G, 140, { sq: 0.18, col: cyan, w: 7, life: 30 }); L.surge('k', cyan, 1.0); L.lines(18, { col: '#bff4ff', n: 30, cy: 0.62 });
        }],
        ...SP.map(sp => [sp.dead, L => { L.sfx('hitSnap', 0.3, 1.1); }]),
        ...SP.map(sp => [sp.gone, L => { CR.crumble(sp.x, G - 90, 24, 90, 12); L.sfx('hitBlunt', 0.25, 1.3); }]),
        ...WL.map(w => [w.rise, L => { L.sfx('hitBlunt', 0.6, 0.6); L.shake(5); L.debris(w.x, G - 2, 8, { v: 5, col: '#7a5aa0', r: 3 }); }]),
        ...WL.map(w => [w.die, L => { L.sfx('hitSnap', 0.6, 0.9); L.ring(w.x, G - 60, 40, { col: cyan, w: 3, life: 14 }); }]),
        ...WL.map(w => [w.gone, L => { CR.crumble(w.x, G - 120, 40, 120, 24); L.sfx('hitBlunt', 0.5, 1.1); L.shake(4); }]),
        [11.0, L => { L.sfx('swingLight', 0.4, 0.6); L.dust(SX + 12, 8, 30, { v: 1.2, life: 24, a: 0.25 }); }],
        [11.5, L => { L.sfx('stingLow', 0.5, 1.0); }],
      ],
    });
  },
  tick: function (H) { FILM.tick(H); },
};
