'use strict';
// Act 3, the key. In the air in front of the Lock, Kael cuts three times and each ring his blade touches goes dark
// and breaks. The Creator meets him blade to blade; its blade goes dark at the contact and crumbles out of its hand.
// Kael draws back and drives the katana into the Creator's chest, fragment first, into the core. The rift tears
// open both ways, up through the vault and down through the floor, and the vault's plates are blown back out into
// the sky. (The film's one full-screen white flash is spent here.)
module.exports = {
  arena: 'creator', frames: 700, endC: 4.8,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const cyan = '#00d4ff', magenta = '#ff40c0', pale = '#e8d4ff';
    CR.stage(3);
    CR.vein(540, -10, 320, 380);
    const SX = 816, SH = 122;
    // Rings: laid, dead at the cut, gone (broken) a moment later.
    const RINGS = [{ r: 114, cut: 0.15 }, { r: 84, cut: 0.55 }, { r: 54, cut: 0.95 }].map(rg => Object.assign(rg, { gone: rg.cut + 0.22 }));
    const bladeK = [[0, 1], [1.45, 1], [1.9, 0, 'in']];
    const vaultK = [[0, 1], [2.6, 1], [4.2, 0.15, 'out'], [4.8, 0.1]];
    const tearK = [[0, 0], [2.45, 0], [3.4, 1, 'out'], [5.8, 1]];
    L.setup(H, {
      tempo: 1, vignette: 0.6,
      speed: [[0, 0.75], [1.2, 0.75], [1.4, 0.4, 'xout'], [2.3, 0.4], [2.4, 1, 'in'], [2.45, 0.12, 'xout'], [2.8, 0.12], [3.4, 0.6, 'in'], [4.8, 0.6]],
      backdrop: (c, L) => {
        const cc = L.D.c;
        CR.vault(c, L.curve(vaultK, cc)[0], 100);
        CR.drawVeins(c, 0.5);
      },
      actors: {
        k: {
          beats: [[0, 'airHigh'], [0.08, 'windBack', 'out'], [0.15, 'slashOut', 'xout', { rFore: 30, rArm: 20 }], [0.4, 'slashOut', 'io', { rFore: 30, rArm: 20 }], [0.48, 'highGuard', 'out'], [0.55, 'cutDown', 'xout'],
            [0.82, 'windBack', 'out'], [0.95, 'slashOut', 'xout', { rFore: -34, rArm: -20 }], [1.25, 'ready', 'io'], [1.45, 'slashOut', 'xout'], [1.9, 'slashOut'],
            [2.15, 'windBack', 'io'], [2.45, 'thrust', 'xout'], [3.0, 'thrust'], [3.8, 'hangThrust', 'io'], [5.8, 'hangThrust', 'lin', { torso: 14 }]],
          pos: [[0, 742, 76], [0.15, 746, 84, 'out'], [0.6, 730, 106, 'io'], [1.3, 716, 118, 'io'], [2.15, 700, 158, 'io'], [2.45, 722, 170, 'xout'], [3.0, 722, 170], [3.8, 734, 172, 'io'], [5.8, 736, 172]],
          face: [[0, 1]],
          trail: [[0, 1.0, 3, 0.03, 0.3], [2.4, 2.6, 4, 0.02, 0.4]],
          post: (c, L) => CR.bladeCracks(c, 'k', L.D.c > 2.45 ? 2.4 : 1.3),
          aura: [[0, 0.6], [2.4, 0.6], [2.5, 1.0]], glowK: [[0, 0.3], [2.4, 0.3], [2.5, 0.8], [5.8, 0.5]],
          expr: [[0, 'intense']],
        },
        s: CR.actor({
          beats: [[0, 'crSpread'], [1.1, 'crSpread'], [1.4, 'crBlock', 'xout'], [1.9, 'crBlock'], [2.2, 'crSpread', 'io', { torso: -4 }],
            [2.47, 'crSpread', 'xout', { torso: -18, headTilt: -24 }], [5.8, 'crSpread', 'lin', { torso: -20, headTilt: -26 }]],
          pos: [[0, SX, SH], [2.45, SX, SH], [2.6, SX + 6, SH + 2, 'out'], [5.8, SX + 6, SH + 4]],
          face: [[0, -1]], weapon: [[0, true]], arcColor: pale, auraColor: magenta,
          post: (c, L) => {
            const k = L.curve(bladeK, L.D.c)[0];
            if (L.D.c < 1.45) CR.drawBlade(c, 's', k);
            else if (k > 0.01) {
              // Dead glass with light in it, crumbling out of its hand.
              const t = CR.tip('s'); c.save(); c.globalAlpha = k; c.strokeStyle = '#0c0614'; c.lineWidth = 6; c.beginPath(); c.moveTo(t.hand.x, t.hand.y); c.lineTo(t.x, t.y); c.stroke();
              c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#5fe8ff'; c.shadowColor = cyan; c.shadowBlur = 10; c.lineWidth = 1.2; c.beginPath();
              for (let i = 1; i < 6; i++) { const u = i / 6, x = t.hand.x + (t.x - t.hand.x) * u, y = t.hand.y + (t.y - t.hand.y) * u; c.moveTo(x - 3, y - 3); c.lineTo(x + 3, y + 2); }
              c.stroke(); c.restore();
            }
          },
          aura: [[0, 0.5], [2.45, 0.5], [2.6, 0.1]], glowK: [[0, 0.3], [2.45, 0.3], [2.6, 0]],
        }),
      },
      cam: [
        [0, 776, 168, 2.25], [1.25, 772, 172, 2.4, 'sine'],
        [1.26, 772, 176, 3.0, 'hold'], [2.3, 772, 178, 3.2, 'sine'],
        [2.31, 774, 184, 2.8, 'hold'], [2.45, 774, 184, 3.0, 'sine'], [2.6, 760, 170, 2.0, 'xout'], [4.8, 700, 200, 1.25, 'sine'],
      ],
      ev: [
        [4.6, L => { const t = L.tip('k'), J = L.joints('s'); L.D.log.inChest = { tip: [Math.round(t.x), Math.round(t.y)], neck: [Math.round(J.neck.x), Math.round(J.neck.y)], hip: [Math.round(J.hip.x), Math.round(J.hip.y)] }; }],
        ...RINGS.map((rg, i) => [rg.cut, L => {
          // Sparks where the blade actually crosses this ring.
          const J = L.joints('s'), cy = (J.neck.y + J.hip.y) / 2, X = CR.ringCross('k', J.hip.x, cy, rg.r);
          (L.D.log.rings || (L.D.log.rings = [])).push(Object.assign({ r: rg.r }, X));
          L.sfx('hitSlash', 1, 0.9 + i * 0.1); L.sfx('hitSnap', 0.7, 0.8 + i * 0.1); L.shake(8 + i * 2);
          L.ring(X.x, X.y, 26, { col: cyan, w: 3, life: 14 }); L.streaks(X.x, X.y, 10, 34, { col: '#bff4ff', life: 12 });
          L.debris(X.x, X.y, 10, { v: 4, kind: 'spark', col: cyan, r: 2, life: 22, g: 0.08, spread: 360 });
        }]),
        ...RINGS.map(rg => [rg.gone, L => { const J = L.joints('s'); CR.breakRing(J.hip.x, (J.neck.y + J.hip.y) / 2, rg.r); L.sfx('hitBlunt', 0.6, 1.0); }]),
        [1.45, L => {
          CR.logContact('undo'); const X = CR.contact('k', 's');
          L.sfx('clang', 1.1, 0.7); L.sfx('stingImpact', 0.7, 0.8); L.shake(12); L.impact(3, { tint: '#bfefff' });
          L.ring(X.x, X.y, 60, { col: cyan, w: 5, life: 22 }); L.debris(X.x, X.y, 16, { v: 4, kind: 'spark', col: cyan, r: 2.2, life: 30, g: 0.05, spread: 360 });
        }],
        [1.6, L => { L.sfx('hitSnap', 0.8, 0.7); }],
        [1.9, L => { const t = CR.tip('s'); CR.crumble((t.hand.x + t.x) / 2, Math.min(t.hand.y, t.y), 20, Math.abs(t.y - t.hand.y) + 10, 14); L.sfx('hitBlunt', 0.6, 1.2); }],
        [2.15, L => { L.sfx('stingRise', 0.8, 0.9); L.sfx('swingHeavy', 0.6, 0.7); }],
        [2.45, L => {
          const t = L.tip('k'), J = L.joints('s');
          L.D.log.core = { tip: [Math.round(t.x), Math.round(t.y)], chest: [Math.round(J.hip.x), Math.round((J.neck.y + J.hip.y) / 2)] };
          CR.coreX = t.x - 12; CR.coreY = t.y;
          L.sfx('explosion', 1.2, 0.6); L.sfx('heavyHit', 1.2, 0.5); L.sfx('superActivate', 0.9, 0.7); L.sfx('portalOpen', 0.9, 0.5); L.shake(28);
          L.flash('#ffffff', 0.9, 20); L.impact(4, { invert: true });
          L.ring(CR.coreX, CR.coreY, 300, { col: '#ffffff', w: 10, life: 36 }); L.ring(CR.coreX, CR.coreY, 180, { col: cyan, w: 6, life: 30 });
          L.streaks(CR.coreX, CR.coreY, 30, 160, { col: '#ffffff', life: 24, w: 4 }); L.lines(30, { col: '#ffffff', n: 50, cx: 0.55, cy: 0.45 });
        }],
        [3.4, L => { L.sfx('stingLow', 0.8, 0.6); }],
      ],
    });
    // The Lock (until its rings break) and the tear, over the bodies.
    L.add({ t: 'draw', life: 1e6, fn: (c) => {
      const cc = L.D.c, J = L.joints('s'), cy = (J.neck.y + J.hip.y) / 2;
      CR.drawLock(c, J.hip.x, cy, RINGS.map(rg => ({ r: rg.r, k: 1, dead: cc >= rg.cut ? 1 : 0, gone: cc >= rg.gone })), cc);
      if (CR.coreX) CR.tear(c, CR.coreX, CR.coreY, L.curve(tearK, cc)[0], cc);
    } });
  },
  tick: function (H) { FILM.tick(H); },
};
