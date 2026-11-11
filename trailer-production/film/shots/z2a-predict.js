'use strict';
// Stage two (canon: READING, "he begins arriving early to places you had not yet decided to go"). Film 1 showed one
// attack, a moment ahead. This is his growth: he stops walking, the lights die, and two red figures step out of them and
// fight the next thirteen seconds, to the end, while the real pair stand where they are. The columns all run it too.
// It ends with Kael down and the point at his throat. The lights come back. Neither of them has moved.
module.exports = {
  arena: 'city', frames: 1300, endC: 17.6,
  install: function (H) {
    const L = FILM, G = H.D.G;
    AS.stage(); AS.mini = CA.proxy(AS.red, 'katana');
    const red = AS.red, T0 = 2.4;
    const near = []; for (let i = 0; i < 6; i++) near.push({ x: 362 + i * 137, seed: i * 5 + 2 });
    const gk = CA.proxy('#ff6a50', 'katana'), gs = AS.copy(CA.proxy(red, AS.COUNTER.katana));
    const tint = 'grayscale(1) sepia(1) saturate(14) hue-rotate(-44deg) brightness(0.95)';
    L.setup(H, {
      tempo: 1, vignette: 0.62, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c;
        const dark = L.curve([[0, 0], [0.9, 0], [T0 - 0.3, 1, 'io'], [SEQ_END + 1.2, 1], [SEQ_END + 1.6, 0, 'io']], t)[0];
        const pos = gkActor();
        AS.paintLab(c, {
          near, backLimit: 1125, redK: 1, lamp: x => (1 - dark * Math.min(1, Math.max(0, 1 + (t - 0.9) * 2 - Math.abs(x - 1040) / 300))) * 0.96 + 0.04,
          colState: x => {
            const running = t >= T0 && t <= SEQ_END + 0.4 ? pos : null;
            const broke = Math.abs(x - 1047) < 2 ? -1 : undefined;
            return running ? { stop: 1, mimicQ: running.q, mimicFace: running.face, look: 0, broke } : { stop: 1, look: 1000, mimic: 'readyOpen', broke };
          },
        });
        // The room goes down round them, leaving the screen and the prediction.
        c.save(); c.globalAlpha = 0.5 * dark; c.fillStyle = '#000'; const v = L.view(); c.fillRect(v.x0 - 10, v.y0 - 10, v.x1 - v.x0 + 20, v.y1 - v.y0 + 20); c.restore();
        AS.monitor(c, { x: 1330, n: L.curve([[0, 86], [T0 + 0.5, 86], [SEQ_END - 0.1, 12, 'lin'], [99, 12]], t)[0], label: 'READING' });
      },
      actors: {
        k: { scale: 1, z: 0, beats: [[0, 'guard']], pos: [[0, 958, 0]], face: [[0, 1]], weapon: [[0, true]], sink: [[0, true]], breath: [[0, 1], [0.9, 0]], expr: [[0, 'intense']],
          alphaK: [[0, 1], [T0 - 0.2, 1], [T0 + 0.5, 0.42], [99, 0.42]], eyes: [[0, 1]] },
        s: { scale: 1.08, z: 0, wAbs: true, beats: [[0, 'sovWalkA'], [0.5, 'sovReady', 'io'], [99, 'sovReady']], pos: [[0, 1090, 0]], face: [[0, -1]], breath: [[0, 1], [0.9, 0]], wkey: [[0, 'nullblade'], [1.6, AS.COUNTER.katana]], wAlphaK: [[0, 1], [1.4, 1], [1.52, 0], [1.64, 0], [1.82, 1, 'in']],
          alphaK: [[0, 1], [T0 - 0.2, 1], [T0 + 0.5, 0.42], [99, 0.42]], eyes: [[0, 0.8], [0.9, 1]], eyeColor: red },
        gk: { f: gk, scale: 1, z: 3, beats: [[0, 'guard']], pos: [[0, 958, 0]], face: [[0, 1]], sink: [[0, true]], filter: tint, arcColor: red, expr: [[0, 'intense']] },
        gs: { f: gs, scale: 1.08, z: 2, wAbs: true, beats: [[0, 'sovReady']], pos: [[0, 1090, 0]], face: [[0, -1]], filter: tint, arcColor: red },
      },
      cam: [[0, 1040, 92, 1.9]],
      ev: [
        [0.9, L => { L.sfx('hitZap', 0.25, 0.4); L.sfx('stingLow', 0.8, 0.7); }],
        [1.4, L => { AS.portal(L, 's', 0.6); }],
        [T0 - 0.6, L => { L.sfx('iaiMark', 0.6, 0.5); }],
      ],
    });
    const SEQ = AS.readSeq(L, { t0: T0, K: 'gk', S: 'gs', col: red, kcol: '#ff6a50', gain: 0.62, rate: 0.86 });
    const SEQ_END = SEQ.end;
    const a = L.actors, ghost = (x, b, p, f) => {
      x.beats = b; x.pos = p; x.face = f;
      x.hidden = [[0, true], [T0 - 0.42, false], [SEQ_END + 0.9, true]];
      x.alphaK = [[0, 0], [T0 - 0.42, 0], [T0 - 0.1, 0.95, 'io'], [SEQ_END + 0.45, 0.95], [SEQ_END + 0.9, 0, 'io']];
      x.trail = [[T0, SEQ_END, 2, 0.05, 0.22]]; x.trailColor = red; x.glowK = [[0, 0.5]]; x.aura = [[0, 0.22]]; x.auraColor = red;
      x.post = (c, L, a2, s) => { const J = L.joints(a2.key); c.globalAlpha = 0.28 * s.alpha; c.fillStyle = red; for (let y = J.head.y - J.headR; y < L.G - s.h; y += 4.5) if (Math.random() < 0.45) c.fillRect(J.hip.x - 19 + Math.random() * 5, y, 36, 1); };
    };
    ghost(a.gk, SEQ.KB, SEQ.KP, SEQ.KF); ghost(a.gs, SEQ.SB, SEQ.SP, SEQ.SF);
    a.gk.wkey = SEQ.KW; a.gk.wAlphaK = SEQ.KA; a.gs.wkey = SEQ.SW; a.gs.wAlphaK = SEQ.SA;
    function gkActor() { const s = L.state(a.gk, L.D.c); return { q: s.q, face: s.face }; }
    L.spec.ev.push(...SEQ.ev);
    L.spec.speed = CA.hitch(SEQ.stops.map(q => [q[0], q[1], q[2]]));
    CA.blows(L, SEQ.blows);
    // A dissolve: red sparks off both prediction bodies at the end.
    L.spec.ev.push([SEQ_END + 0.45, L => { for (const key of ['gk', 'gs']) { const J = L.joints(key); for (const p of [J.head, J.hip, J.rHand, J.lHand, J.rFoot, J.lFoot]) L.debris(p.x, p.y, 7, { kind: 'spark', col: red, v: 2.6, r: 1.5, g: 0.02, spread: 360, life: 34 }); } L.sfx('hitZap', 0.3, 0.5); }],
      [SEQ_END + 1.2, L => { L.sfx('hitZap', 0.22, 0.45); }]);
    // Real joints at the point: logged so the blade really ends at his throat.
    L.D.log.point = L.onBlade('gs', L.joints('gk', SEQ_END).neck, SEQ_END);
    L.spec.cam = [[0, 1040, 92, 1.9], [T0 - 0.8, 1040, 88, 2.0, 'sine'],
      // Two red shapes parting from the two standing still.
      ...CA.follow(L, 'gk', 'gs', T0 - 0.4, SEQ_END + 0.2, { zMax: 2.3, zMin: 1.35, lift: 22, cut: false }),
      // The point at his throat.
      [SEQ_END + 0.21, 815, 44, 3.0, 'hold'], [SEQ_END + 0.7, 815, 44, 3.2, 'sine'],
      // The count it came to.
      [SEQ_END + 0.71, 1330, 208, 2.7, 'hold'], [SEQ_END + 1.5, 1330, 208, 2.85, 'sine'],
      // And the two of them, who haven't moved.
      [SEQ_END + 1.51, 1024, 76, 2.5, 'hold'], [17.6, 1024, 76, 2.65, 'sine']];
  },
  tick: function (H) { FILM.tick(H); },
};
