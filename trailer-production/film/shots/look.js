'use strict';
// Arena / look test: both fighters standing, a slow wide framing.
module.exports = {
  arena: 'sovereign', frames: 60,
  install: function (H) {
    const G = H.D.G, p1 = players[0], p2 = players[1];
    H.place(p1, 380, G, 1); H.place(p2, 520, G, -1);
    H.pose(p1, [{ at: 0, pose: 'guard' }]); H.pose(p2, [{ at: 0, pose: 'menace' }]);
    H.snap(450, G - 90, (window.__ENV.Z || 1.6));
  },
  tick: function (H) {
    const G = H.D.G, p1 = players[0], p2 = players[1];
    H.place(p1, 380, G, 1); H.place(p2, 520, G, -1);
    H.cam(450, G - 90, (window.__ENV.Z || 1.6), true);
  },
};
