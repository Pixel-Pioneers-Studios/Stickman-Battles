'use strict';
// Look test for "Kael vs The Creator": the Creator's arena (floor only), Kael and the Creator standing.
// F_PH=1..3 picks the arena's crack phase, F_Z the zoom.
module.exports = {
  arena: 'creator', frames: 60, endC: 1,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G, env = window.__ENV;
    CR.stage(env.PH || 1);
    L.setup(H, {
      actors: {
        k: { beats: [[0, 'ready']], pos: [[0, 360, 0]], face: [[0, 1]] },
        s: CR.actor({ beats: [[0, 'stand']], pos: [[0, 560, 0]], face: [[0, -1]] }),
      },
      cam: [[0, 460, 90, env.Z || 1.4]],
    });
  },
  tick: function (H) { FILM.tick(H); },
};
