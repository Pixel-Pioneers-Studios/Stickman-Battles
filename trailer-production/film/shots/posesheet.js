'use strict';
// Named poses, 12 a page (still only): F_PAGE=0 node film/run.js still posesheet 2 land
module.exports = {
  arena: 'city', frames: 4,
  install: function (H) {
    const L = FILM, G = H.D.G, k = players[0], s = players[1];
    const all = Object.keys(L.POSES), page = (window.__ENV.PAGE || 0), names = all.slice(page * 12, page * 12 + 12), cols = 6;
    for (const p of players) p.draw = function () {};
    k.draw = function () {
      names.forEach((n, i) => {
        const col = i % cols, row = Math.floor(i / cols), x = 100 + col * 140, y = G - 30 - row * 200;
        const f = /^sov/.test(n) ? s : k;
        L.drawFig(f, L.resolve(n), x, y, 1, {});
        ctx.save(); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillText(n, x, y + 18); ctx.restore();
      });
    };
    H.snap(450, G - 200, 1.0);
  },
  tick: function (H) { H.snap(450, H.D.G - 200, 1.0); },
};
