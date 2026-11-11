'use strict';
// What he saw, happening. The same thirteen seconds, in the light, with faint red a beat ahead of each body so you can
// watch them step into it. The cut uses pieces of this shot, not all of it (cut.js). It ends with the point at Kael's
// throat and the screen changing: DOMINATING.
module.exports = {
  arena: 'city', frames: 1000, endC: 15.0,
  install: function (H) {
    const L = FILM, G = H.D.G;
    AS.stage(); AS.mini = CA.proxy(AS.red, 'katana');
    const red = AS.red, cyan = AS.cyan, T0 = 0.5;
    const near = []; for (let i = 0; i < 6; i++) near.push({ x: 362 + i * 137, seed: i * 5 + 2 });
    L.setup(H, {
      tempo: 1, vignette: 0.56, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c, E = T0 + 13;
        AS.paintLab(c, {
          near, backLimit: 1125, redK: 1,
          mon: { x: 1330, n: 12, label: t < E + 0.9 ? 'READING' : 'DOMINATING' },
          colState: x => ({ stop: 1, look: L.joints('k').hip.x, mimic: 'readyOpen', broke: Math.abs(x - 1047) < 2 ? -1 : Math.abs(x - 910) < 2 ? T0 + 7.88 : undefined }),
        });
      },
      actors: {
        k: { scale: 1, z: 2, beats: [[0, 'guard']], pos: [[0, 958, 0]], face: [[0, 1]], weapon: [[0, true]], sink: [[0, true]], aura: [[0, 0.32]], glowK: [[0, 0.15]], eyes: [[0, 1]], expr: [[0, 'intense']] },
        s: { scale: 1.08, z: 1, wAbs: true, beats: [[0, 'sovReady']], pos: [[0, 1090, 0]], face: [[0, -1]], aura: [[0, 0.24]], auraColor: red, eyes: [[0, 1]], eyeColor: red, expr: [[0, 'neutral']] },
      },
      cam: [[0, 1040, 92, 2.0]],
      ev: [],
    });
    const SEQ = AS.readSeq(L, { t0: T0, K: 'k', S: 's', col: '#ffe9a0' });
    const a = L.actors, E = SEQ.end;
    a.k.beats = SEQ.KB; a.k.pos = SEQ.KP; a.k.face = SEQ.KF; a.s.beats = SEQ.SB; a.s.pos = SEQ.SP; a.s.face = SEQ.SF;
    a.k.wkey = SEQ.KW; a.k.wAlphaK = SEQ.KA; a.s.wkey = SEQ.SW; a.s.wAlphaK = SEQ.SA;
    a.k.trail = [[T0, E, 2, 0.04, 0.18]]; a.s.trail = [[T0, E, 2, 0.04, 0.18]]; a.s.trailColor = red;
    L.spec.ev.push(...SEQ.ev);
    L.spec.speed = CA.hitch(SEQ.stops.map(q => [q[0], q[1], q[2]]));
    CA.blows(L, SEQ.blows);
    L.ghost('k', T0, E - 0.3, 0.14, { col: '#ff6a50' }); L.ghost('s', T0, E - 0.3, 0.14, { col: red });
    L.spec.ev.push([E + 0.9, L => { L.sfx('iaiMark', 0.9, 0.5); L.sfx('stingImpact', 0.7, 0.5); L.shake(4); }]);
    L.D.log.point = L.onBlade('s', L.joints('k', E).neck, E);
    L.spec.cam = [[0, 1040, 92, 2.0], ...CA.follow(L, 'k', 's', T0, E, { zMax: 2.75, zMin: 1.6, lift: 12 }),
      [E + 0.01, 815, 44, 3.0, 'hold'], [E + 0.6, 815, 44, 3.2, 'sine'],
      [E + 0.61, 1330, 208, 2.7, 'hold'], [15, 1330, 208, 2.85, 'sine']];
  },
  tick: function (H) { FILM.tick(H); },
};
