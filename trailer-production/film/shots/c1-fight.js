'use strict';
// Act 1, the world changes. Sovereign predicted Kael; the Creator does not bother: it changes the ground. Spikes
// run along the floor at him; he leaps them. He cuts at the Creator and a wall stands up in the way; he vaults it
// and the wall keeps growing, into him. Two walls rise either side of him and clap shut; he jumps out and lands on
// top. He dives at the Creator with a draw-cut, and the Creator builds a blade in the instant and stops it. Three
// cuts drive him back, and the third breaks the katana. Kael on one knee with an empty hand. The blade's pieces
// lie on the floor and do not fade.
module.exports = {
  arena: 'creator', frames: 1000, endC: 14.0,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const cyan = '#00d4ff', violet = '#cc00ee', pale = '#e8d4ff';
    CR.stage(1);
    // The running spikes.
    const SP = []; for (let i = 0; i < 11; i++) SP.push({ x: 560 - i * 31, t: 0.05 + i * 0.07 });
    const spikeH = (sp, c) => { const a = c - sp.t; if (a < 0) return 0; if (a < 0.07) return 74 * a / 0.07; if (a < 0.37) return 74; return Math.max(0, 74 * (1 - (a - 0.37) / 0.25)); };
    // The wall that keeps growing (x 556), and the press (two walls clapping shut around x 350).
    const WX = 536;
    const wallH = c => c < 1.3 ? 0 : c < 1.36 ? 110 * (c - 1.3) / 0.06 : c < 2.04 ? 110 : c < 2.16 ? 110 + 130 * (c - 2.04) / 0.12 : c < 3.0 ? 240 : Math.max(0, 240 * (1 - (c - 3.0) / 0.5));
    const pressH = c => c < 3.7 ? 0 : c < 3.95 ? 120 * L.EASE.out((c - 3.7) / 0.25) : c < 5.8 ? 120 : Math.max(0, 120 * (1 - (c - 5.8) / 0.6));
    const pressX = c => c < 4.35 ? 0 : c < 4.47 ? 32 * L.EASE.in((c - 4.35) / 0.12) : 32;
    const bladeK = [[0, 0], [5.3, 0], [5.58, 1]];
    // Kael's beats.
    const kBeats = [[0, 'ready'], [0.2, 'crouch', 'xout'], [0.32, 'tuck', 'xout'], [0.8, 'tuck'], [0.98, 'crouchLand', 'xout'], [1.12, 'crouchLand'],
      [1.22, 'runA', 'out'], [1.36, 'slashOut', 'xout', { rFore: -24, rArm: -14 }], [1.46, 'hitBack', 'xout'], [1.68, 'crouch', 'io'], [1.82, 'airCut', 'xout'], [2.08, 'airHigh', 'io'],
      [2.2, 'flyBack', 'xout'], [2.75, 'skid', 'out'], [3.3, 'skid'], [3.6, 'ready', 'io'],
      [3.9, 'ready', 'io', { headTilt: -6 }], [4.1, 'crouch', 'io'], [4.22, 'airHigh', 'xout'], [4.62, 'tuck', 'io'], [4.85, 'crouchLand', 'xout'], [5.08, 'crouchLand'],
      [5.18, 'runA', 'xout'], [5.6, 'slashOut', 'xout'], [6.6, 'slashOut', 'lin', { torso: 30 }],
      [6.85, 'block', 'xout'], [7.2, 'block'], [7.45, 'ready', 'io'], [7.72, 'blockHigh', 'xout', { rFore: -64 }], [8.05, 'blockHigh', 'io', { rFore: -64 }], [8.3, 'ready', 'io'],
      [8.6, 'blockHigh', 'io', { hipDrop: 18, rFore: -64 }], [8.86, 'blockHigh', 'lin', { hipDrop: 20, rFore: -64 }],
      [8.95, 'flyBack', 'xout'], [9.7, 'flyBack'], [9.95, 'skid', 'in'], [10.3, 'lookHand', 'io'],
      [12.2, 'lookHand', 'lin', { headTilt: 34 }], [12.6, 'lookHand', 'io', { headTilt: -6, rArm: 80, rFore: 60 }], [14.0, 'lookHand', 'lin', { headTilt: -10, rArm: 80, rFore: 60 }]];
    const kPos = [[0, 330, 0], [0.32, 330, 0], [0.62, 385, 95, 'out'], [0.98, 430, 0, 'in'], [1.22, 420, 0], [1.36, 436, 0, 'out'], [1.46, 430, 0], [1.7, 434, 0],
      [1.82, 462, 30, 'out'], [2.08, 528, 128, 'out'], [2.2, 516, 160, 'out'], [2.75, 380, 0, 'in'], [3.3, 350, 0, 'out'],
      [4.22, 350, 0], [4.5, 350, 150, 'out'], [4.85, 350, pressH(4.85), 'in'], [5.1, 350, 120], [5.6, 500, 0, 'in'],
      [6.85, 500, 0], [7.15, 472, 0, 'out'], [7.72, 472, 0], [8.05, 446, 0, 'out'], [8.86, 446, 0],
      [8.95, 440, 14, 'out'], [9.65, 290, 36, 'out'], [9.95, 252, 0, 'in'], [10.3, 240, 0, 'out'], [14.0, 240, 0]];
    // The Creator's beats: it builds with its hand, then fights with what it built.
    const sBeats = [[0, 'crRaise'], [0.6, 'crStand', 'io'], [1.2, 'crStand'], [1.3, 'crReach', 'xout'], [1.9, 'crReach'], [2.08, 'crRaise', 'xout'], [2.8, 'crStand', 'io'],
      [3.55, 'crReach', 'io'], [4.3, 'crReach'], [4.42, 'crClose', 'xout'], [5.0, 'crStand', 'io'],
      [5.3, 'crStand'], [5.58, 'crBlock', 'xout'], [6.6, 'crBlock'],
      [6.72, 'crLow', 'io'], [6.95, 'crSweep', 'xout'], [7.3, 'crSweep'], [7.5, 'crHigh', 'io'], [7.74, 'crCutStop', 'xout'], [7.95, 'crCutStop'], [8.12, 'crLow', 'io'],
      [8.3, 'crHigh', 'io'], [8.62, 'crHigh', 'lin', { torso: -12 }], [8.84, 'crCutStop', 'xout'], [8.87, 'crCutStop'], [9.02, 'crCut', 'xout'], [9.4, 'crCut'], [10.0, 'crStand', 'io']];
    for (let t = 10.6, i = 0; t < 13.3; t += 0.42, i++) sBeats.push([t, i % 2 ? 'crStepA' : 'crStepB', 'io']);
    sBeats.push([13.45, 'crHigh', 'io'], [14.0, 'crHigh', 'lin', { torso: -14 }]);
    const sPos = [[0, 600, 0], [5.2, 600, 0], [5.55, 612, 0, 'out'], [6.6, 612, 0], [6.72, 600, 0], [6.95, 590, 0, 'out'], [7.78, 590, 0], [8.0, 578, 0, 'out'], [8.6, 578, 0], [8.86, 566, 0, 'out'],
      [10.6, 566, 0], [13.3, 384, 0, 'lin'], [14.0, 376, 0]];
    L.setup(H, {
      tempo: 1, vignette: 0.55,
      fade: [[0, 0], [13.75, 0], [14.0, 1, 'in']],
      speed: [[0, 1], [0.35, 1], [0.42, 0.35, 'xout'], [0.8, 0.35], [0.95, 1, 'in'],
        [5.5, 1], [5.6, 0.22, 'xout'], [6.5, 0.22], [6.7, 1, 'in'],
        [8.8, 1], [8.86, 0.14, 'xout'], [9.25, 0.14], [9.5, 1, 'in']],
      backdrop: (c, L) => {
        const cc = L.D.c;
        for (const sp of SP) {
          const a = cc - sp.t;
          if (a > -0.3 && a < 0) CR.warn(c, sp.x, 1 + a / 0.3);
          CR.spike(c, sp.x, spikeH(sp, cc));
        }
        CR.slab(c, WX, 18, wallH(cc), { glint: cc > 1.3 && cc < 1.42 ? 1 : cc > 2.04 && cc < 2.16 ? 1 : 0 });
        const pH = pressH(cc), pX = pressX(cc);
        if (pH > 0) { CR.slab(c, 296 + pX, 44, pH); CR.slab(c, 404 - pX, 44, pH); }
        CR.drawShards(c);
      },
      actors: {
        k: {
          beats: kBeats, pos: kPos, face: [[0, 1]],
          wAlphaK: [[0, 1], [8.86, 1], [8.87, 0]],
          trail: [[0.3, 1.0, 4, 0.03, 0.4], [2.2, 2.8, 4, 0.03, 0.35], [5.15, 5.62, 5, 0.025, 0.45], [8.9, 9.7, 4, 0.03, 0.35]],
          expr: [[0, 'intense'], [10.3, 'neutral']],
          aura: [[0, 0.1], [10.3, 0]],
        },
        s: CR.actor({
          beats: sBeats, pos: sPos, face: [[0, -1]], weapon: [[0, true]], arcColor: pale,
          post: (c, L, a) => CR.drawBlade(c, 's', L.curve(bladeK, L.D.c)[0]),
          aura: [[0, 0.15], [5.3, 0.15], [5.6, 0.4], [7.0, 0.2]],
        }),
      },
      cam: [
        [0, 452, 74, 1.8], [0.95, 468, 74, 1.9, 'sine'],
        [1.3, 500, 78, 2.6, 'hold'], [1.6, 498, 80, 2.7, 'sine'],
        [1.75, 470, 118, 1.65, 'hold'], [2.95, 432, 100, 1.6, 'sine'],
        [3.6, 350, 92, 2.0, 'hold'], [4.38, 350, 120, 2.1, 'sine'], [4.5, 350, 142, 2.3, 'xout'], [5.05, 350, 140, 2.2, 'sine'],
        [5.1, 440, 92, 1.7, 'hold'], [5.55, 515, 80, 2.0, 'sine'],
        [5.6, 548, 78, 3.3, 'hold'], [6.6, 548, 78, 3.7, 'sine'],
        [6.61, 522, 80, 2.2, 'hold'], [8.5, 488, 80, 2.3, 'sine'],
        [8.51, 488, 88, 3.1, 'hold'], [8.86, 488, 88, 3.35, 'sine'], [8.92, 470, 86, 2.5, 'xout'], [9.95, 360, 80, 1.95, 'sine'],
        [10.3, 248, 46, 3.5, 'hold'], [12.3, 250, 48, 3.85, 'sine'],
        [12.31, 330, 92, 1.9, 'hold'], [14.0, 318, 100, 2.15, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('hitSnap', 0.5, 0.7); }],
        ...SP.map((sp, i) => [sp.t, L => { L.sfx('hitZap', 0.25, 0.8 + i * 0.04); L.debris(sp.x, G - 2, 4, { v: 4, col: '#c9a0ff', r: 2.4, kind: 'spark', life: 20, g: 0.2 }); if (i % 3 === 0) L.shake(3); }]),
        [0.3, L => { L.sfx('jump', 0.7, 0.9); L.dust(330, 8, 40, { v: 1.6, life: 26, a: 0.3 }); }],
        [0.98, L => { L.sfx('land', 0.7); L.dust(430, 10, 50, { v: 2, life: 30, a: 0.35 }); }],
        [1.3, L => { L.sfx('hitBlunt', 0.6, 0.6); L.shake(6); L.debris(WX, G - 2, 10, { v: 6, col: '#7a5aa0', r: 3 }); }],
        [1.36, L => {
          // Where the blade meets the wall's face (logged: tipPast > 0 means the drawn blade reaches it).
          const t = L.tip('k'), fx = WX - 9, u = (fx - t.hand.x) / (t.x - t.hand.x), y = Math.round(t.hand.y + (t.y - t.hand.y) * u);
          L.D.log.wall = { tipPast: Math.round(t.x - fx), y, h: G - y };
          L.sfx('clang', 0.9, 0.9); L.shake(8); L.debris(fx, y, 14, { v: 5, kind: 'spark', col: '#ffe9a0', r: 2.4, life: 22, g: 0.15, dir: 180, spread: 120 }); L.ring(fx, y, 30, { col: '#ffffff', w: 3, life: 12 });
        }],
        [1.82, L => { L.sfx('jump', 0.6, 1.0); }],
        [2.08, L => {
          // The wall's top meets his feet.
          const J = L.joints('k'), fy = Math.max(J.lFoot.y, J.rFoot.y), fx = (J.lFoot.x + J.rFoot.x) / 2; L.D.log.launch = { feet: [Math.round(fx), Math.round(fy)], wallTop: G - 110, wallX: [WX - 9, WX + 9] };
          L.sfx('hitBlunt', 0.9, 0.5); L.sfx('heavyHit', 0.9, 0.7); L.shake(14); L.impact(2, { tint: '#d8b8ff' }); L.streaks(WX, fy, 12, 50, { col: pale, life: 12 }); L.ring(WX, fy, 30, { col: pale, w: 3, life: 12, sq: 0.4 });
        }],
        [2.75, L => { L.sfx('land', 0.8, 0.8); L.dust(380, 14, 80, { v: 2.6, life: 36, a: 0.4 }); }],
        [3.7, L => { L.sfx('hitBlunt', 0.6, 0.55); L.shake(6); L.debris(296, G - 2, 8, { v: 5, col: '#7a5aa0', r: 3 }); L.debris(404, G - 2, 8, { v: 5, col: '#7a5aa0', r: 3 }); }],
        [4.22, L => { L.sfx('jump', 0.8, 0.9); }],
        [4.47, L => { L.sfx('explosion', 0.6, 0.8); L.sfx('heavyHit', 1, 0.6); L.shake(18); L.ring(350, G - 60, 110, { col: pale, w: 6, life: 22, sq: 0.5 }); L.debris(350, G - 120, 18, { v: 7, col: '#c9a0ff', kind: 'spark', r: 2.6, life: 26, g: 0.2, spread: 160 }); L.lines(14, { col: '#e8d4ff', n: 30 }); }],
        [4.85, L => { L.sfx('land', 0.8, 0.9); L.dust(350, 8, 40, { y: G - 120, v: 1.6, life: 24, a: 0.3 }); }],
        [5.15, L => { L.sfx('swingHeavy', 0.6, 1.1); L.lines(20, { dir: 0, col: '#bff4ff', n: 26 }); }],
        [5.3, L => { CR.assemble('s', 0.32); L.sfx('phaseUp', 0.5, 1.3); L.sfx('hitZap', 0.35, 1.5); }],
        [5.6, L => {
          CR.logContact('bind'); const X = CR.contact('k', 's');
          L.sfx('clang', 1.2, 0.8); L.sfx('stingImpact', 0.7, 0.9); L.shake(12); L.impact(3, { tint: '#c8e8ff' });
          L.ring(X.x, X.y, 60, { col: '#ffffff', w: 5, life: 22 }); L.streaks(X.x, X.y, 16, 60, { col: '#ffe9a0', life: 16 });
          L.debris(X.x, X.y, 14, { v: 4, kind: 'spark', col: cyan, r: 2.2, life: 30, g: 0.05, spread: 360 }); L.debris(X.x, X.y, 14, { v: 4, kind: 'spark', col: violet, r: 2.2, life: 30, g: 0.05, spread: 360 });
        }],
        [6.95, L => { CR.logContact('sweep'); const X = CR.contact('k', 's'); L.sfx('clang', 1, 1.0); L.sfx('parry', 0.6); L.shake(9); L.debris(X.x, X.y, 12, { v: 5, kind: 'spark', col: '#ffe9a0', r: 2.2, life: 22, g: 0.15, dir: 180, spread: 140 }); L.ring(X.x, X.y, 34, { col: '#ffffff', w: 3, life: 12 }); }],
        [7.78, L => { CR.logContact('cut'); const X = CR.contact('k', 's'); L.sfx('clang', 1, 0.9); L.sfx('heavyHit', 0.6, 0.9); L.shake(10); L.debris(X.x, X.y, 12, { v: 5, kind: 'spark', col: '#ffe9a0', r: 2.2, life: 22, g: 0.15, dir: 160, spread: 140 }); L.ring(X.x, X.y, 34, { col: '#ffffff', w: 3, life: 12 }); }],
        [8.3, L => { L.sfx('stingRise', 0.5, 0.8); }],
        [8.86, L => {
          CR.logContact('break'); const X = CR.contact('k', 's');
          CR.shatter('k', cyan, { dir: 200 });
          L.sfx('hitSnap', 1.2, 0.8); L.sfx('clang', 1.1, 0.6); L.sfx('explosion', 0.5, 1.2); L.shake(20);
          L.impact(4, { tint: '#bfefff' }); L.ring(X.x, X.y, 90, { col: cyan, w: 6, life: 26 }); L.streaks(X.x, X.y, 22, 80, { col: '#bff4ff', life: 18 });
        }],
        [8.92, L => { const J = L.joints('k'); L.slash(J.shoulder.x + 6, J.shoulder.y + 10, 34, -120, 30, { col: pale, glow: violet, w: 12, life: 14 }); L.sfx('hitSlash', 1, 0.8); L.sfx('heavyHit', 0.9, 0.7); }],
        [9.95, L => { L.sfx('landHard', 0.9, 0.9); L.dust(252, 16, 90, { v: 2.8, life: 40, a: 0.45 }); L.shake(8); }],
        [11.9, L => { L.sfx('soulAbsorb', 0.25, 1.4); CR.pulse = L.D.c; }],
        [13.45, L => { L.sfx('swingHeavy', 0.6, 0.7); L.sfx('stingLow', 0.6, 0.8); }],
        [13.9, L => { const xs = CR.shards.filter(s => s.land).map(s => Math.round(s.x + s.vx * s.land)); L.D.log.shards = { n: xs.length, min: Math.min(...xs), max: Math.max(...xs) }; }],
        [1.31, L => { const h = L.joints('s').rHand; L.D.log.crHand = { x: Math.round(h.x), wallFace: WX + 9 }; }],
      ],
      each: (L, c) => {
        // The pieces answering once, faintly, while he looks at his hand: a pulse through the shards.
        if (CR.pulse && c - CR.pulse < 0.8) for (const s of CR.shards) s.boost = 1 - (c - CR.pulse) / 0.8;
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
