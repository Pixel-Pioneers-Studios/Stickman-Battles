'use strict';
// Look test for film 3: Kael and Cosmic Axiom in the Void, the crust clearing, the attacks.
module.exports = {
  arena: 'void', frames: 300, endC: 5,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM;
    CA.stage();
    L.setup(H, {
      vignette: 0.5,
      backdrop: (c, L) => {
        const t = L.D.c;
        if (t > 3) CA.hole(c, 450, L.G - 150, 22, 1, t);
        if (t > 4) CA.beam(c, 600, L.G - 90, 380, L.G - 80, 5, 1, t);
      },
      actors: {
        k: { beats: [[0, 'guard']], pos: [[0, 360, 0]], face: [[0, 1]], aura: [[0, 0.3]] },
        s: CA.actor({ beats: [[0, 'crStand']], pos: [[0, 560, 14]], face: [[0, -1]], eyes: [[0, 1]],
          crust: [[0, 1], [1, 1], [2.5, 0, 'lin']], aura: [[0, 0.3]] }),
      },
      cam: [[0, 460, 130, 2.2]],
    });
  },
  tick: function (H) { FILM.tick(H); },
};
