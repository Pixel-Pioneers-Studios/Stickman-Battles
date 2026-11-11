'use strict';
// Act 3, the Lock (canon: the Creator's final construct is the lock; the bearer is the key). Three rings of violet
// glass build themselves around the Creator, turning against each other, and the first pulse throws Kael back across
// the floor. It fires everything: spikes run at him and plates of the vault fall on him while the vault itself comes
// down. He runs at it anyway. The spikes go dark before he reaches them; he cuts the plates out of the air. At the
// outer ring he leaps.
module.exports = {
  arena: 'creator', frames: 600, endC: 6.2,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const cyan = '#00d4ff', magenta = '#ff40c0', pale = '#e8d4ff';
    CR.stage(3);
    CR.vein(540, -10, 320, 380);
    const SX = 816, SH = 122;
    const kx = t => 400 + 300 * Math.max(0, Math.min(1, (t - 2.6) / 2.9));
    const RINGS = [{ r: 54, kK: [[0, 0], [0.2, 0], [0.7, 1]] }, { r: 84, kK: [[0, 0], [0.45, 0], [1.0, 1]] }, { r: 114, kK: [[0, 0], [0.7, 0], [1.3, 1]] }];
    // Spikes in his path: up in a wave from the Lock, dead the moment he is a step away.
    const SP = [640, 600, 560, 520, 480].map((x, i) => { let tr = 2.6; while (kx(tr) < x - 60 && tr < 6) tr += 1 / 120; return { x, t: 2.75 + i * 0.06, dead: tr, gone: tr + 0.3 }; });
    // Plates of the vault falling on him: each cut out of the air at t1.
    const PL = [3.35, 4.15, 4.85].map((t1, i) => ({ t0: t1 - 0.55, t1, x: kx(t1) + 34, sz: 16 + i * 3, spin: i }));
    const kBeats = [[0, 'guard'], [1.5, 'flyBack', 'xout'], [2.25, 'skid', 'in'], [2.55, 'crouch', 'io']];
    let t = 2.7, i = 0;
    while (t < 5.45) {
      const pl = PL.find(p => p.t1 > t - 0.01 && p.t1 < t + 0.16);
      if (pl) { kBeats.push([pl.t1 - 0.07, 'windBack', 'out'], [pl.t1, 'upperCut', 'xout', { rFore: -58, rArm: -40 }], [pl.t1 + 0.14, 'runA', 'io']); t = pl.t1 + 0.3; continue; }
      kBeats.push([t, i++ % 2 ? 'runB' : 'runA', 'io']); t += 0.16;
    }
    kBeats.push([5.5, 'crouch', 'io'], [5.62, 'airHigh', 'xout'], [6.2, 'airHigh']);
    const kPos = [[0, 690, 0], [1.5, 690, 0], [1.9, 520, 40, 'out'], [2.25, 420, 0, 'in'], [2.6, 400, 0, 'out'], [5.5, 700, 0, 'lin'], [6.2, 742, 76, 'out']];
    const dropK = [[0, 0], [2.6, 0], [5.6, 90, 'in'], [6.2, 100]];
    L.setup(H, {
      tempo: 1, vignette: 0.58,
      speed: [[0, 1], [5.6, 1], [5.7, 0.4, 'xout'], [6.2, 0.4]],
      backdrop: (c, L) => {
        const cc = L.D.c;
        CR.vault(c, 1, L.curve(dropK, cc)[0]);
        CR.drawVeins(c, 0.5);
        for (const sp of SP) {
          if (cc < sp.t - 0.25) continue;
          if (cc < sp.t) { CR.warn(c, sp.x, 1 + (cc - sp.t) / 0.25); continue; }
          if (cc < sp.dead) CR.spike(c, sp.x, Math.min(84, 84 * (cc - sp.t) / 0.07));
          else if (cc < sp.gone) CR.deadSpike(c, sp.x, 84, (cc - sp.dead) / 0.3 * 0.4);
        }
        for (const p of PL) {
          if (cc < p.t0 || cc > p.t1) continue;
          const u = (cc - p.t0) / (p.t1 - p.t0), y = (G - 340) + (G - 92 - (G - 340)) * u * u;
          CR.plate(c, p.x, y, p.sz, p.spin + u * 2);
        }
      },
      actors: {
        k: {
          beats: kBeats, pos: kPos, face: [[0, 1]],
          trail: [[1.5, 2.3, 4, 0.03, 0.35], [2.7, 6.2, 3, 0.03, 0.3]],
          post: (c, L) => CR.bladeCracks(c, 'k', 1.2),
          aura: [[0, 0.5], [2.6, 0.5], [3.0, 0.8]], glowK: [[0, 0.3], [6.2, 0.4]],
          expr: [[0, 'intense']],
        },
        s: CR.actor({
          beats: [[0, 'crSpread'], [2.5, 'crSpread'], [2.7, 'crReach', 'io'], [5.5, 'crReach'], [6.0, 'crSpread', 'io']],
          pos: [[0, SX, SH]], face: [[0, -1]], weapon: [[0, true]], arcColor: pale, auraColor: magenta,
          post: (c, L) => CR.drawBlade(c, 's', 1),
          aura: [[0, 0.5]], glowK: [[0, 0.3]],
        }),
      },
      cam: [
        [0, 798, 172, 2.2], [1.45, 804, 176, 2.4, 'sine'],
        [1.5, 640, 122, 1.5, 'hold'], [2.6, 565, 112, 1.45, 'sine'],
        [2.61, 470, 84, 2.2, 'hold'], [5.5, 690, 108, 1.9, 'lin'],
        [5.51, 730, 124, 1.6, 'hold'], [6.2, 742, 132, 1.7, 'sine'],
      ],
      ev: [
        [0.2, L => { L.sfx('phaseUp', 0.5, 0.7); }], [0.45, L => { L.sfx('phaseUp', 0.5, 0.8); }], [0.7, L => { L.sfx('phaseUp', 0.55, 0.9); }],
        [1.3, L => { L.sfx('stingRise', 0.6, 0.7); }],
        [1.5, L => {
          const J = L.joints('s'), cy = (J.neck.y + J.hip.y) / 2;
          L.sfx('explosion', 0.9, 0.6); L.sfx('heavyHit', 1, 0.5); L.shake(20); L.impact(2, { tint: '#e0c8ff' });
          L.ring(J.hip.x, cy, 360, { col: '#c060ff', w: 10, life: 30 }); L.ring(J.hip.x, cy, 220, { col: pale, w: 5, life: 24 }); L.lines(16, { col: '#e8d4ff', n: 34, cx: 0.85, cy: 0.35 });
        }],
        [2.25, L => { L.sfx('land', 0.8, 0.8); L.dust(420, 14, 80, { v: 2.6, life: 36, a: 0.4 }); }],
        [2.7, L => { L.sfx('swingHeavy', 0.5, 1.2); L.sfx('stingLow', 0.5, 0.9); }],
        ...SP.map((sp, i) => [sp.t, L => { L.sfx('hitZap', 0.3, 0.7 + i * 0.06); if (i % 2 === 0) L.shake(3); }]),
        ...SP.map(sp => [sp.dead, L => { L.sfx('hitSnap', 0.35, 1.2); }]),
        ...SP.map(sp => [sp.gone, L => { CR.crumble(sp.x, G - 84, 24, 84, 10); }]),
        ...PL.map(p => [p.t1, L => {
          const t = L.tip('k'); (L.D.log.plates || (L.D.log.plates = [])).push({ plate: [Math.round(p.x), G - 92], hand: [Math.round(t.hand.x), Math.round(t.hand.y)], tip: [Math.round(t.x), Math.round(t.y)] });
          L.sfx('hitSlash', 0.9, 1.0); L.sfx('hitSnap', 0.6, 0.9); L.shake(7);
          CR.crumble(p.x, G - 100, p.sz * 2, p.sz * 1.4, 16); L.ring(p.x, G - 92, 34, { col: cyan, w: 3, life: 14 });
          L.slash(p.x - 10, G - 92, 30, -150, 20, { col: '#bff4ff', glow: cyan, w: 10, life: 12 });
        }]),
        [3.2, L => { L.sfx('heavyHit', 0.5, 0.45); L.shake(4); }], [4.5, L => { L.sfx('heavyHit', 0.6, 0.42); L.shake(5); }],
        [5.62, L => { L.sfx('jump', 0.9, 0.8); L.sfx('superActivate', 0.6, 1.0); L.surge('k', cyan, 0.9); L.dust(700, 16, 70, { v: 2.4, life: 30, a: 0.4 }); }],
      ],
    });
    // The Lock, around the Creator's body, over the bodies' layer.
    L.add({ t: 'draw', life: 1e6, fn: (c) => {
      const J = L.joints('s'), cy = (J.neck.y + J.hip.y) / 2;
      CR.drawLock(c, J.hip.x, cy, RINGS.map(rg => ({ r: rg.r, k: L.curve(rg.kK, L.D.c)[0], dead: 0 })), L.D.c);
    } });
  },
  tick: function (H) { FILM.tick(H); },
};
