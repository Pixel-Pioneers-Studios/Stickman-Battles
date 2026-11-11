'use strict';
// Thumbnail still for "Kael vs Cosmic Axiom" (no letterbox): the katana stopped dead on his bare hand at the centre of
// the frame. Behind him a collapsed star; a meteor coming down across the Void; the crust on him, the stars under it.
//   node film/run.js still x-thumb c0.6 big   → scale to 1280x720
module.exports = {
  arena: 'void', frames: 60, endC: 1,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI, env = window.__ENV;
    const cyan = '#00d4ff', star = CA.star;
    CA.stage();
    const KX = env.KX || 396, SX = env.SX || 520, HX = env.HX || 590, HH = env.HH || 118;
    let X = null;
    L.setup(H, {
      tempo: 1, vignette: 0.55, bars: false, drift: 0, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gx: -110, gy: -40, galaxy: 0.8 });
        CA.hole(c, HX, G - HH, env.HR || 30, 1, t + 3);
        CA.rock(c, 330, G - 160, 13, 5, 0.5, -170, 270, 1);
        CA.rock(c, 470, G - 148, 7, 8, 1.1, -170, 270, 1);
        CA.floor(c);
      },
      actors: {
        k: {
          beats: [[0, 'clash', 'io', { headTilt: -4, rArm: 2, rFore: -52, torso: 30, lArm: 150, lFore: 170 }]], pos: [[0, KX, 0]], face: [[0, 1]],
          post: (c, L) => CA.noise(c, L.joints('k').shoulder.x, L.joints('k').shoulder.y + 12, 0.4, 1.3),
          aura: [[0, 0.45]], glowK: [[0, 0.6]], eyes: [[0, 1]], expr: [[0, 'intense']],
        },
        s: CA.actor({
          beats: [[0, 'parry', 'io', { rArm: 110, rFore: 140, rLeg: 116, rShin: 104, lLeg: 62, lShin: 88, torso: 4, headTilt: 6 }]], pos: [[0, SX, 0]], face: [[0, -1]],
          neb: [[0, 1.1]], crust: [[0, 0.45]], headCrust: [[0, 1]], headCrack: [[0, 0.5]], kept: [[0, 0.45]], keptFace: [[0, 0]], aura: [[0, 0.2]], eyes: [[0, 1]],
        }),
      },
      cam: [[0, env.CX || 462, env.CH || 76, env.Z || 3.2]],
    });
    // The open hand on the blade, a little past the middle of its length.
    const bi = 0, t0 = L.tip('k', undefined, 0.5), u = env.U || 0.62, pt = { x: t0.hand.x + (t0.x - t0.hand.x) * u, y: t0.hand.y + (t0.y - t0.hand.y) * u };
    const r = CA.aim('s', bi, 'lHand', ['lArm', 'lFore'], pt, 0.5, { range: 150, step: 3 });
    L.D.log.thumb = { miss: r.d, at: [Math.round(pt.x), Math.round(pt.y)] }; X = pt;
    L.add({ t: 'draw', life: 1e6, fn: (c) => {
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(X.x, X.y, 1, X.x, X.y, 34);
      g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.25, 'rgba(170,210,255,0.14)'); g.addColorStop(1, 'rgba(40,90,220,0)');
      c.fillStyle = g; c.beginPath(); c.arc(X.x, X.y, 34, 0, P * 2); c.fill();
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * P * 2 + (i % 2) * 0.13, r0 = 9 + (i % 3) * 2, r1 = 15 + ((i * 53) % 20);
        c.strokeStyle = i % 2 ? '#bff4ff' : '#ffffff'; c.shadowColor = i % 2 ? cyan : star; c.shadowBlur = 8; c.lineWidth = 1.4 - (i % 3) * 0.3;
        c.beginPath(); c.moveTo(X.x + Math.cos(a) * r0, X.y + Math.sin(a) * r0); c.lineTo(X.x + Math.cos(a) * r1, X.y + Math.sin(a) * r1); c.stroke();
      }
      c.restore();
    } });
  },
  tick: function (H) { FILM.tick(H); },
};
