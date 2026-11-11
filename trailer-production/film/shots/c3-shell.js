'use strict';
// Act 3, the shell (canon: the Creator form is a constructed outer shell; beneath it is Cosmic Axiom). The katana
// in its chest, cracks run from the blade across the Creator's whole body, and through them is not light but
// starlight: deep blue, stars. Its head comes up. Its eyes are starlight now. Its free hand closes on the blade
// that is in it (a threat, not a surrender). The starlight breaks out through every crack, and black.
module.exports = {
  arena: 'creator', frames: 600, endC: 6.4,
  // Black at frame 475 (measured): silent from there.
  silenceFrom: 475,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const cyan = '#00d4ff', star = '#cfe0ff';
    CR.stage(3);
    CR.vein(540, -10, 320, 380);
    const KX = 736, KH = 172, SX = 822, SH = 126;
    const crackK = [[0, 0], [0.2, 0], [2.4, 1, 'out'], [6.4, 1]];
    const tearK = [[0, 0.7], [6.4, 0.55]];
    L.setup(H, {
      tempo: 1, vignette: 0.62,
      fade: [[0, 0], [4.68, 0], [4.74, 1, 'lin'], [6.4, 1]],
      speed: [[0, 0.6], [6.4, 0.6]],
      backdrop: (c, L) => {
        CR.vault(c, 0.12, 100);
        CR.drawVeins(c, 0.5);
        const t = L.tip('k'); CR.tear(c, t.x - 14, t.y, L.curve(tearK, L.D.c)[0], L.D.c);
      },
      actors: {
        k: {
          beats: [[0, 'hangThrust'], [6.4, 'hangThrust', 'lin', { torso: 16 }]],
          pos: [[0, KX, KH], [6.4, KX, KH + 2]], face: [[0, 1]],
          post: (c, L) => CR.bladeCracks(c, 'k', 2.2),
          aura: [[0, 0.8]], glowK: [[0, 0.5]], eyes: [[0, 1]], expr: [[0, 'intense']],
        },
        s: CR.actor({
          beats: [[0, 'crThrough'], [2.4, 'crThrough'], [3.0, 'crThrough', 'io', { headTilt: -2, torso: -12 }], [3.3, 'crThrough', 'io', { headTilt: -2, torso: -12 }], [3.75, 'crGrip', 'xout'], [6.4, 'crGrip']],
          pos: [[0, SX, SH], [6.4, SX, SH]], face: [[0, -1]], weapon: [[0, false]],
          auraColor: '#7fa0ff', aura: [[0, 0.1], [2.4, 0.1], [3.0, 0.5], [4.4, 0.9]],
          eyes: [[0, 0], [2.95, 0], [3.15, 1]], eyeColor: star,
          post: (c, L) => {
            const t = L.tip('k'), J = L.joints('s'), from = { x: Math.min(t.x, J.hip.x + 4), y: (J.neck.y + J.hip.y) / 2 + 4 };
            CR.shellCracks(c, 's', from, L.curve(crackK, L.D.c)[0], L.D.c);
          },
        }),
      },
      cam: [
        [0, 786, 182, 3.2], [2.3, 792, 184, 3.5, 'sine'],
        [2.31, SX - 4, 222, 4.6, 'hold'], [3.25, SX - 4, 223, 4.9, 'sine'],
        [3.26, 790, 186, 3.4, 'hold'], [4.4, 790, 186, 3.6, 'sine'], [4.6, 796, 192, 2.6, 'xout'],
      ],
      ev: [
        [0.3, L => { const t = L.tip('k'), J = L.joints('s'); L.D.log.inChest = { tip: [Math.round(t.x), Math.round(t.y)], neck: [Math.round(J.neck.x), Math.round(J.neck.y)], hip: [Math.round(J.hip.x), Math.round(J.hip.y)] }; }],
        [0.05, L => { L.sfx('stingLow', 0.8, 0.5); }],
        [0.3, L => { L.sfx('hitSnap', 0.6, 0.6); L.shake(4); }], [0.9, L => { L.sfx('hitSnap', 0.7, 0.55); L.shake(5); }], [1.6, L => { L.sfx('hitSnap', 0.8, 0.5); L.shake(6); }],
        [3.0, L => { L.sfx('stingImpact', 0.9, 0.6); L.sfx('soulRip', 0.5, 0.6); }],
        [3.75, L => {
          const J = L.joints('s'), b = L.onBlade('k', J.lHand); L.D.log.grip = b;
          L.sfx('clang', 0.8, 0.45); L.shake(8); L.ring(J.lHand.x, J.lHand.y, 30, { col: star, w: 3, life: 18 });
        }],
        [4.4, L => {
          L.sfx('explosion', 1.2, 0.45); L.sfx('superActivate', 0.8, 0.5); L.shake(24); L.flash('#7fa0ff', 0.55, 14);
          const J = L.joints('s'); L.streaks(J.hip.x, (J.neck.y + J.hip.y) / 2, 36, 200, { col: star, life: 22, w: 4 });
          L.ring(J.hip.x, (J.neck.y + J.hip.y) / 2, 260, { col: star, w: 8, life: 22 });
        }],
      ],
      each: (L, c) => { CR.haloJit = c > 0.4 && c < 4.4 ? 0.25 + 0.25 * Math.sin(c * 9) : 0; },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
