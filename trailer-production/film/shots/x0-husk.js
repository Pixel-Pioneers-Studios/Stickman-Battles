'use strict';
// Cold open (film 3). Film 2's last image: Kael hanging from the hilt of the katana in the Creator's chest, the
// Creator's starlit hand closed on the blade. The shell comes off like a husk (mantle and halo first, then the body
// plate by plate) and under it is Cosmic Axiom, still holding the blade, starlight with the void's crust over half
// of him. He pushes the blade out of himself, takes Kael by the collar, swings him overhead and throws him back
// through the tear the katana made, into the Void. The tear shuts.
module.exports = {
  arena: 'creator', frames: 480, endC: 7.4,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star;
    CR.stage(3); CA.stage();
    CR.vein(540, -10, 320, 380);
    const KX = 736, KH = 172, SX = 822, SH = 126;
    // The tear at the katana's tip in film 2 (c3-shell: tip 839,259 → tear at tip.x - 14).
    const TX = 825, TY = 259;
    // k past 1 is just the plates' clock running on (each falls for its own time after it lets go).
    const huskK = [[0, 0], [1.3, 0], [3.4, 1, 'lin'], [5.5, 2, 'lin']];
    const tearK = [[0, 0.55], [4.9, 0.62], [5.18, 1, 'out'], [5.32, 1], [5.7, 0, 'in']];
    let rel = null;
    L.setup(H, {
      tempo: 1, vignette: 0.6,
      fade: [[0, 1], [0.9, 0, 'lin']],
      speed: [[0, 0.7], [3.9, 0.7], [4.0, 1], [4.95, 1], [5.05, 0.45], [5.3, 0.45], [5.5, 1]],
      backdrop: (c, L) => {
        CR.vault(c, 0.12, 100);
        CR.drawVeins(c, 0.5);
        CR.tear(c, TX, TY, L.curve(tearK, L.D.c)[0], L.D.c);
      },
      actors: {
        k: {
          beats: [[0, 'hangThrust'], [4.0, 'hangThrust', 'lin', { torso: 16 }], [4.4, 'hangThrust', 'io', { torso: 4, rLeg: 110, lLeg: 70 }],
            [4.6, 'heldUp'], [4.9, 'heldUp', 'io', { torso: -30, rLeg: 70, lLeg: 50 }], [5.1, 'flyBack']],
          pos: [[0, KX, KH], [4.0, KX, KH + 2], [4.35, KX - 50, KH, 'out'], [4.5, KX - 50, KH - 10]],
          face: [[0, 1]], trail: [[4.5, 5.4, 4, 0.03, 0.4]],
          aura: [[0, 0.8], [4.4, 0.3]], glowK: [[0, 0.5]], eyes: [[0, 1], [4.5, 0.6]], expr: [[0, 'intense'], [4.5, 'hurt']],
          alphaK: [[0, 1], [5.2, 1], [5.3, 0, 'lin']],
        },
        s: CA.actor({
          scale: 1.32,
          beats: [[0, 'crGrip'], [3.6, 'crGrip'], [4.0, 'caLift', 'io'], [4.35, 'caPushOut', 'out'], [4.55, 'caGrab', 'xout'], [4.85, 'caOver', 'in'], [5.05, 'caHurl', 'out'],
            [5.9, 'caHurl'], [6.8, 'caFloat', 'io', { headTilt: 6 }]],
          pos: [[0, SX, SH], [4.35, SX, SH], [4.55, SX - 50, SH - 4, 'out'], [5.05, SX - 40, SH], [6.8, SX - 30, SH - 6]],
          face: [[0, -1]],
          neb: [[0, 0], [1.3, 0], [3.2, 1]], crust: [[0, 0.45]],
          aura: [[0, 0.1], [1.3, 0.2], [3.2, 0.7]], eyes: [[0, 1]], eyeColor: star,
          post: (c, L, a, s) => {
            CA.drawBody(c, L, a, s);
            const k = L.curve(huskK, L.D.c)[0];
            CA.husk(c, 's', k, { dur: 2.4 });
            // Film 2's cracks stay on the shell until it starts to go.
            if (k < 0.06) {
              const t = L.tip('k'), J = L.joints('s'), from = { x: Math.min(t.x, J.hip.x + 4), y: (J.neck.y + J.hip.y) / 2 + 4 };
              c.globalAlpha = 1 - k / 0.06; CR.shellCracks(c, 's', from, 1, L.D.c);
            }
          },
        }),
      },
      cam: [
        // On the hand on the blade, then the whole figure coming out of the shell.
        [0, 800, 196, 4.4], [1.28, 798, 194, 4.1, 'sine'],
        [1.3, 804, 172, 2.9, 'hold'], [3.6, 802, 176, 3.2, 'sine'],
        // The eyes come up (close), then wide for the throw.
        [3.61, SX - 6, 218, 4.6, 'hold'], [3.98, SX - 6, 219, 4.8, 'sine'],
        [4.0, 790, 190, 2.5, 'hold'], [4.9, 780, 200, 2.3, 'sine'], [5.3, 796, 230, 2.0, 'out'],
        // After: him alone in front of the closed tear.
        [5.72, SX - 30, 186, 3.0, 'hold'], [7.4, SX - 30, 188, 3.3, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingLow', 0.7, 0.5); }],
        [0.6, L => { L.sfx('hitSnap', 0.5, 0.6); L.shake(2); }],
        [1.32, L => { L.sfx('hitSnap', 0.8, 0.5); L.sfx('soulRip', 0.5, 0.5); L.shake(4); }],
        [1.8, L => { L.sfx('hitBlunt', 0.5, 0.6); }], [2.3, L => { L.sfx('hitBlunt', 0.5, 0.55); }], [2.8, L => { L.sfx('hitBlunt', 0.55, 0.5); }],
        [2.6, L => { L.sfx('phaseUp', 0.7, 0.5); }],
        [3.62, L => { L.sfx('stingImpact', 0.8, 0.55); }],
        [4.32, L => {
          const t = L.tip('k'); L.D.log.out = { tip: [Math.round(t.x), Math.round(t.y)], chest: Math.round(L.joints('s').neck.x) };
          L.sfx('clang', 0.7, 0.6); L.burst(t.x, t.y, 10, star);
        }],
        [4.55, L => { L.sfx('hitBlunt', 0.9, 0.7); L.shake(6); }],
        [4.8, L => { L.sfx('swingHeavy', 1, 0.6); }],
        [5.0, L => { L.sfx('swingHeavy', 0.8, 0.45); L.lines(16, { cx: 0.55, cy: 0.35 }); }],
        [5.2, L => {
          L.sfx('portalOpen', 1, 0.6); L.sfx('stingImpact', 0.8, 0.5); L.shake(10);
          L.streaks(TX, TY - 70, 26, 160, { col: star, life: 20, w: 3 });
        }],
        [5.62, L => { L.sfx('explosion', 0.7, 0.4); L.ring(TX, TY - 40, 140, { col: star, w: 5, life: 24, sq: 1.6 }); }],
      ],
      each: (L, c) => {
        // 4.5 .. 5.0: Kael is wherever the Axiom's hand is (held by the collar); at 5.0 he is let go and flies on
        // into the tear, faster than he was swung.
        const k = L.actors.k;
        if (c >= 4.5 && c < 5.0) {
          const hd = L.joints('s').rHand, kj = L.joints('k'), st = L.state(k, c);
          const x = st.x + hd.x - kj.neck.x, h = st.h - (hd.y - kj.neck.y - 4);
          k.pos = [[0, x, h]];
          rel = { x, h, c };
          if (!L.D.log.carry) L.D.log.carry = { hand: [Math.round(hd.x), Math.round(hd.y)], at: c.toFixed(2) };
        } else if (c >= 5.0 && rel && !rel.done) {
          rel.done = true;
          k.pos = [[rel.c, rel.x, rel.h], [5.28, TX + 10, G - TY + 90, 'in']];
          L.D.log.release = { x: Math.round(rel.x), h: Math.round(rel.h) };
        }
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
