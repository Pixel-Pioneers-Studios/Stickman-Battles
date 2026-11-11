'use strict';
// Act 3, the ninety-four. The street, the crater. Sovereign stands over Kael and raises the blade (canon: TYRANT —
// he has stopped predicting and is reciting; Kael is a rerun of someone who lost). The world stops. Behind Kael, the
// ninety-four who carried the fragment before him, grey, each with the weapon of their pattern. They let go of
// them; the light goes into him. He rises with nothing in his hands (canon: the most dangerous configuration), and
// when the blade comes down he catches it bare-handed. Sovereign's read had him somewhere else: it shatters.
module.exports = {
  arena: 'city', frames: 900, endC: 10.2,
  install: function (H) {
    const L = FILM, G = H.D.G;
    const red = '#ff3311', cyan = '#00d4ff', white = '#ffffff';
    const KX = 480, SX = 410;
    const walk = (t0, t1, n0) => { const o = []; for (let i = n0 || 0, t = t0; t < t1; i++, t += 0.45) o.push([t, i % 2 ? 'sovWalkB' : 'sovWalkA', 'sine']); return o; };
    // The ninety-four: rows receding up the street behind him, each a stranger with his own weapon and stance.
    const WK = ['sword', 'axe', 'hammer', 'spear', 'scythe', 'katana', 'flail', 'electricstaff', 'shield', 'bow', 'whip', 'broomstick'];
    const ST = ['stand', 'ready', 'guard', 'sovPlant', 'readyOpen', 'sovReady'];
    let seed = 94; const R = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const bearers = [];
    for (let i = 0; i < 94; i++) {
      const row = Math.min(5, Math.floor(i / 16)), inRow = i % 16;
      const x = 150 + (inRow + (row % 2) * 0.5) / 16 * 700 + (R() - 0.5) * 20;
      bearers.push({ x, row, wk: WK[Math.floor(R() * WK.length)], pose: ST[Math.floor(R() * ST.length)], face: x < KX ? 1 : -1,
        tin: 3.3 + Math.abs(x - KX) / 700 * 1.0 + row * 0.18 + R() * 0.2, tout: 5.5 + R() * 0.7 });
    }
    L.setup(H, {
      tempo: 0.92, vignette: 0.6,
      backdrop: (c, L) => { L.paintCity(c, { street: G, left: 120, right: 850, leftTop: G - 1600, rightTop: G - 1500 }); crater(c); dead(c); },
      world: [[0, 1], [3.0, 1], [3.15, 0.03, 'xout'], [7.2, 0.03], [7.3, 1, 'in']],
      desat: [[0, 0], [3.0, 0], [3.3, 0.85, 'out'], [6.6, 0.85], [7.3, 0, 'out']],
      speed: [[0, 1], [7.43, 1], [7.45, 0.15, 'xout'], [7.75, 0.15], [8.05, 1, 'in']],
      actors: {
        k: {
          beats: [[0, 'fallen'], [6.55, 'fallen'], [6.85, 'rising', 'out'], [7.15, 'openHand', 'out'], [7.32, 'openHand'],
            [7.37, 'catchHigh', 'xout'], [8.3, 'catchHigh'], [8.36, 'catchHigh', 'lin', { lFore: -70 }],
            [8.42, 'frontKick', 'xout'], [8.75, 'frontKick'], [9.2, 'openHand', 'io'], [10.2, 'openHand']],
          pos: [[0, KX, 12], [6.55, KX, 12], [6.85, KX, 0, 'out'], [10.2, KX, 0]],
          face: [[0, -1]],
          weapon: [[0, false]],
          eyes: [[0, 0], [1.9, 0], [2.0, 0.35], [2.2, 0], [5.9, 0], [6.4, 1, 'out'], [10.2, 0.9]],
          aura: [[0, 0], [5.8, 0], [6.4, 0.8], [7.4, 0.5], [10.2, 0.4]],
          glowK: [[0, 0], [5.8, 0], [6.5, 0.8], [8, 0.4]],
          expr: [[0, 'hurt'], [6.4, 'intense']],
          lag: 1,
        },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: walk(0, 1.5).concat([[1.6, 'sovLook', 'io', { headTilt: 26 }], [2.3, 'sovLook', 'lin', { headTilt: 26 }],
            [2.6, 'sovRaise', 'out', { headTilt: 12 }], [7.3, 'sovRaise', 'lin', { headTilt: 14 }],
            [7.39, 'cutStop', 'xin'], [8.3, 'cutStop', 'lin', { torso: 22 }], [8.42, 'hitBack', 'xout'], [8.8, 'skid', 'out'], [9.3, 'sovReady', 'io', { headTilt: 6 }], [10.2, 'sovReady', 'lin', { headTilt: -4 }]]),
          pos: [[0, 300, 0], [1.5, SX, 0, 'lin'], [7.3, SX, 0], [7.39, SX - 45, 0, 'xin'], [8.36, SX - 45, 0], [8.8, SX - 120, 0, 'xout'], [10.2, SX - 124, 0]],
          face: [[0, 1]],
          breath: [[0, 1], [3.0, 1], [3.1, 0], [7.3, 0], [8.5, 1]],
          aura: [[0, 0.3], [2.5, 0.3], [2.7, 0.9], [3.1, 0.6], [7.3, 0.6], [7.5, 1.0], [8.4, 0.4]],
          auraColor: red,
          eyes: [[0, 0], [2.55, 0], [2.7, 0.8], [3.2, 0.5], [9.6, 0.5], [9.9, 0.9]],
        },
      },
      cam: [
        [0, 420, 70, 1.9], [1.5, 440, 60, 2.1, 'sine'],
        [1.6, KX - 8, 22, 4.6, 'hold'], [2.4, KX - 6, 22, 4.8, 'sine'],
        [2.41, 445, 90, 2.4, 'hold'], [3.0, 445, 92, 2.5, 'sine'],
        // The world stopped: wide, the rows of the dead behind him.
        [3.01, 490, 150, 1.25, 'hold'], [5.4, 480, 130, 1.45, 'sine'], [6.3, 470, 70, 2.2, 'sine'],
        [6.6, KX - 10, 50, 3.0, 'sine'], [7.3, 445, 74, 2.5, 'sine'],
        [7.45, 446, 86, 3.2, 'xout'], [8.3, 446, 86, 3.5, 'sine'], [8.42, 430, 70, 2.4, 'xout'], [10.2, 420, 66, 2.6, 'sine'],
      ],
      ev: [
        [0.1, L => { L.sfx('stingLow', 0.6, 0.6); }],
        [1.95, L => { L.sfx('hitZap', 0.3, 1.4); }],
        [2.6, L => { L.surge('s', red, 1.3); L.sfx('superActivate', 0.7, 0.55); L.shake(8); }],
        // The world stops.
        [3.02, L => { L.sfx('stingLow', 1, 0.45); L.sfx('soulAbsorb', 0.6, 0.6); }],
        [3.4, L => { L.sfx('respawn', 0.4, 0.7); }],
        [4.3, L => { L.sfx('soulHarvest', 0.4, 0.7); }],
        // They let go; the light goes into him.
        [5.5, L => { L.sfx('soulRip', 0.5, 0.8); }],
        [6.0, L => { L.sfx('phaseUp', 0.7, 0.7); L.sfx('stingRise', 0.7, 0.8); }],
        [6.4, L => { L.surge('k', cyan, 1.2); L.sfx('superActivate', 0.7, 0.9); }],
        // The blade comes down. He catches it.
        [7.32, L => { L.sfx('swingHeavy', 1, 0.6); }],
        [7.45, L => {
          L.sfx('clang', 1.3, 0.6); L.sfx('heavyHit', 1.2, 0.6); L.sfx('stingImpact', 1, 0.7); L.sfx('parry', 0.8, 0.5);
          const h = L.joints('k').lHand; L.D.log.catch = Object.assign({ kh: [Math.round(h.x), Math.round(h.y)] }, L.onBlade('s', h));
          L.impact(3, { tint: '#9ad8ff' }); L.shake(30);
          L.ring(h.x, h.y, 200, { col: cyan, w: 10, life: 40 }); L.ring(h.x, h.y, 110, { col: red, w: 5, life: 30 });
          L.streaks(h.x, h.y, 34, 160, { col: '#d8f4ff', life: 24, w: 2.4 });
          L.crack(KX, 70, { col: cyan, life: 400 }); L.dust(KX, 16, 140, { v: 4, life: 60 });
          L.surge('k', cyan, 1.4);
          L.shatter('k', 'tuck', -60);
          L.lines(30, { n: 50, col: '#cfefff' });
        }],
        [8.0, L => { const h = L.joints('k').lHand; L.D.log.held = Object.assign({ kh: [Math.round(h.x), Math.round(h.y)] }, L.onBlade('s', h)); }],
        [7.8, L => { L.catalogue('k', 0.9, { expand: true }); L.sfx('hitZap', 0.5, 0.6); }],
        [8.42, L => {
          L.sfx('heavyHit', 1.2, 0.8); L.sfx('hitBlunt', 0.9, 0.7); L.shake(22); L.impact(2, { tint: '#9ad8ff' });
          const f = L.joints('k').lFoot; L.ring(f.x, f.y, 120, { col: cyan, w: 7, life: 26 }); L.streaks(f.x, f.y, 22, 100, { col: '#cfefff', dir: 180, spread: 70, life: 18 });
        }],
        [8.5, L => { L.sfx('landHard', 0.7, 1.2); }],
        [9.85, L => { L.sfx('hitZap', 0.4, 0.6); }],
      ],
      each: (L, c) => {
        // Heels scraping as he is driven back.
        if (c > 8.45 && c < 8.8 && L.D.f % 2 === 0) { const J = L.joints('s'); L.debris(J.lFoot.x, G - 2, 2, { v: 2, kind: 'spark', col: '#ff8a50', r: 2, life: 14, g: 0.2, dir: -40, spread: 60 }); }
      },
    });
    function crater(c) {
      c.fillStyle = '#0c0c14'; c.beginPath(); c.ellipse(KX, G + 3, 110, 16, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#3a3a50'; c.lineWidth = 3; c.beginPath(); c.ellipse(KX, G + 3, 110, 16, 0, Math.PI, 0); c.stroke();
    }
    // The ninety-four, behind him.
    function dead(c) {
      const t = L.D.c, kh = L.joints('k').hip;
      const gf = Object.create(L.actors.k.f);
      for (const b of bearers.slice().sort((p, q) => q.row - p.row)) {
        const fin = Math.max(0, Math.min(1, (t - b.tin) / 0.5)), fout = Math.max(0, Math.min(1, (t - b.tout) / 0.8));
        if (fin <= 0 || fout >= 1) continue;
        const sc = 1 - b.row * 0.11, y = G - b.row * 24, alpha = (0.42 - b.row * 0.05) * fin * (1 - fout);
        gf.weaponKey = b.wk; gf.weapon = WEAPONS[b.wk]; gf.color = '#b8bfcc'; gf.weaponTheme = null;
        c.save(); L.drawFig(gf, L.resolve(b.pose), b.x, y, b.face, { alpha, color: '#b8bfcc', scale: sc, weapon: fout < 0.35, glow: '#ffffff', glowBlur: 6 }); c.restore();
        // Letting go: the light leaves each of them for him.
        if (fout > 0 && fout < 1) {
          const u = fout, px = b.x + (kh.x - b.x) * u, py = y - 40 * sc + (kh.y - (y - 40 * sc)) * u;
          c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8 * (1 - u * 0.5); c.fillStyle = cyan; c.shadowColor = cyan; c.shadowBlur = 10;
          c.beginPath(); c.arc(px, py, 2.4 * sc + 1, 0, Math.PI * 2); c.fill(); c.restore();
        }
      }
    }
    // His read: Kael rolling clear, the way the ninety-four did. Kael does not.
    L.ghostPose('k', 7.1, 7.45, 'tuck', { dx: -60 });
  },
  tick: function (H) { FILM.tick(H); },
};
