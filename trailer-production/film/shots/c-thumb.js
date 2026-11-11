'use strict';
// Thumbnail still for "Kael vs The Creator" (no letterbox): the two blades crossed at the centre of the frame.
// Kael's katana is the rebuilt one, light in it, its last pieces still flying in; the Creator's is built glass,
// its halo magenta and broken loose. Under Kael the floor runs cyan; under the Creator it cracks violet.
//   node film/run.js still c-thumb c0.6 big   → crop/scale to 1280x720
module.exports = {
  arena: 'creator', frames: 60, endC: 1,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI, env = window.__ENV;
    const cyan = '#00d4ff', violet = '#cc00ee', pale = '#e8d4ff';
    CR.stage(3);
    const KX = env.KX || 392, SX = env.SX || 546;
    CR.vein(KX, -10, 300, 118);
    L.setup(H, {
      tempo: 1, vignette: 0.55, bars: false, drift: 0,
      backdrop: (c, L) => { CR.drawVeins(c); },
      actors: {
        k: {
          beats: [[0, 'clash', 'io', { headTilt: -4, rArm: 2, rFore: -58 }]], pos: [[0, KX, 0]], face: [[0, 1]],
          post: (c, L) => CR.bladeCracks(c, 'k', 2.0),
          aura: [[0, 0.9]], glowK: [[0, 0.55]], eyes: [[0, 1]], expr: [[0, 'intense']],
        },
        s: CR.actor({
          // Found by the F_SEARCH probe below: both blades cross near their middles (u 0.54, v 0.50, gap 0).
          beats: [[0, 'crClash', 'io', { rArm: -36, rFore: 2 }]], pos: [[0, SX, 0]], face: [[0, -1]], weapon: [[0, true]],
          post: (c, L) => CR.drawBlade(c, 's', 1),
          aura: [[0, 0.35]], glowK: [[0, 0.45]], auraColor: '#ff40c0',
        }),
      },
      cam: [[0, env.CX || 468, env.CH || 66, env.Z || 3.3]],
      ev: [
        [0.02, L => {
          L.crack(SX, 90, { col: violet });
          if (window.__ENV.SEARCH) {
            // Probe: the Creator's x and blade-arm angles for an X with both blades crossing near their middles.
            const a = L.actors.s, b0 = a.beats[0]; let best = { score: 1e9 };
            for (let sx = 470; sx <= 600; sx += 4) for (let rf = -10; rf <= 60; rf += 3) for (let ra = -44; ra <= 20; ra += 4) {
              a.pos = [[0, sx, 0]]; b0[3] = { rArm: ra, rFore: rf }; delete b0._q;
              const X = CR.contact('k', 's'); if (X.d > 2) continue;
              const score = Math.abs(X.u - 0.55) + Math.abs(X.v - 0.5);
              if (score < best.score) best = { score: +score.toFixed(2), sx, rf, ra, X };
            }
            L.D.log.search = best;
          }
          const X = CR.contact('k', 's'); L.D.log.thumb = X; CR.X = X;
          // The last pieces of the katana flying in to its blade.
          const J = L.joints('k'), h = J.rHand, an = J.wAng, l = J.bLen;
          CR.fly = [];
          for (let i = 0; i < 16; i++) { const u = 0.15 + (i / 15) * 0.85, d = 14 + (i * 37) % 30, side = i % 2 ? 1 : -1, ang = an + side * (1.2 + (i % 3) * 0.25);
            CR.fly.push({ x: h.x + Math.cos(an) * l * u + Math.cos(ang) * d, y: h.y + Math.sin(an) * l * u + Math.sin(ang) * d, tx: h.x + Math.cos(an) * l * u, ty: h.y + Math.sin(an) * l * u, w: 1.6 + (i % 3) }); }
        }],
      ],
    });
    // The contact: a star of sparks in both colours and a ring, drawn over the bodies.
    L.add({ t: 'draw', life: 1e6, fn: (c) => {
      const X = CR.X; if (!X) return;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(X.x, X.y, 1, X.x, X.y, 30);
      g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.2, 'rgba(200,170,255,0.3)'); g.addColorStop(1, 'rgba(120,40,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(X.x, X.y, 30, 0, P * 2); c.fill();
      for (let i = 0; i < 22; i++) {
        const a = i / 22 * P * 2 + (i % 2) * 0.13, r0 = 7 + (i % 3) * 2, r1 = 16 + ((i * 53) % 18);
        c.strokeStyle = i % 2 ? '#bff4ff' : '#f0c8ff'; c.shadowColor = i % 2 ? cyan : violet; c.shadowBlur = 8; c.lineWidth = 1.4 - (i % 3) * 0.3;
        c.beginPath(); c.moveTo(X.x + Math.cos(a) * r0, X.y + Math.sin(a) * r0); c.lineTo(X.x + Math.cos(a) * r1, X.y + Math.sin(a) * r1); c.stroke();
      }
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.6; c.shadowColor = pale; c.shadowBlur = 14; c.globalAlpha = 0.8;
      c.beginPath(); c.arc(X.x, X.y, 18, 0, P * 2); c.stroke();
      // The pieces, each a small diamond with a trail toward its place on the blade.
      for (const s of CR.fly || []) {
        const an = Math.atan2(s.ty - s.y, s.tx - s.x);
        c.globalAlpha = 0.5; c.strokeStyle = cyan; c.lineWidth = 1; c.shadowColor = cyan; c.shadowBlur = 8;
        c.beginPath(); c.moveTo(s.x - Math.cos(an) * 9, s.y - Math.sin(an) * 9); c.lineTo(s.x, s.y); c.stroke();
        c.globalAlpha = 1; c.fillStyle = '#bff4ff';
        c.save(); c.translate(s.x, s.y); c.rotate(an); c.beginPath(); c.moveTo(-s.w, 0); c.lineTo(0, -s.w * 0.45); c.lineTo(s.w, 0); c.lineTo(0, s.w * 0.45); c.closePath(); c.fill(); c.restore();
      }
      c.restore();
    } });
  },
  tick: function (H) { FILM.tick(H); },
};
