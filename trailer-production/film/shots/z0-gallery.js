'use strict';
// Cold open. Black. A slab lifts; Kael walks into the Lab with nothing in his hands. The lights come on ahead of him, one
// at a time: he is expected. Columns in ranks going back into the dark, every one holding a small red figure losing a
// fight, again and again. He stops at one. It is him. Then every figure in the room stops, turns and looks at him, and
// takes his stance. At the far end a screen, and Sovereign with his back turned and his blade in the floor (film 1's
// first image). He turns. He takes his hands off the blade and walks away from it, and opens them.
module.exports = {
  arena: 'city', frames: 1320, endC: 21.5,
  install: function (H) {
    const L = FILM, G = H.D.G;
    AS.stage();
    AS.mini = CA.proxy(AS.red, 'katana');
    const red = AS.red, cyan = AS.cyan;
    const GATE = 170, K0 = 110, LIFT = 1.3, IN = 3.4, STOP = 9.0, PEER = 9.7, LOOKUP = 11.7, MIM = 12.9, WALK2 = 14.0, TURN = 16.8, LET = 18.1, CLEAR = 19.7, DRAW = 19.5, END = 21.5;
    const SX = 1250, KC = 708, NEARX = 772, K2A = 850, K2B = 960;
    // The near rank, along the corridor; one fight per column.
    const near = []; for (let i = 0; i < 6; i++) near.push({ x: 362 + i * 137, seed: i * 5 + 2 });
    const lampOn = x => 2.3 + Math.max(0, x - 170) / 240;
    const lamp = x => L.curve([[0, 0], [lampOn(x), 0], [lampOn(x) + 0.18, 0.7, 'lin'], [lampOn(x) + 0.34, 1, 'lin']], L.D.c)[0];
    // Every column stops on its own beat (the one he is looking at first), then takes his stance once it is up.
    const lag = x => Math.abs(x - NEARX) < 2 ? 0 : 0.12 + ((Math.abs(Math.round(x)) * 37) % 100) / 100 * 0.6;
    const stop = x => L.curve([[0, 0], [LOOKUP + lag(x), 0], [LOOKUP + lag(x) + 1.1, 1, 'lin']], L.D.c)[0];
    const stance = new Map();
    const mimicQ = x => { const k = Math.round(x); if (!stance.has(k)) { const t0 = LOOKUP + lag(x) + 1.2; stance.set(k, [[0, 'stand'], [t0, 'stand'], [t0 + 0.4, 'readyOpen', 'io']]); } return L.poseAt(stance.get(k), L.D.c); };
    L.setup(H, {
      tempo: 1, vignette: 0.6, plant: true,
      fade: [[0, 1], [1.0, 1], [2.0, 0, 'sine']],
      backdrop: (c, L) => {
        const t = L.D.c;
        AS.paintLab(c, {
          lamp, near, backLimit: 1125,
          gate: { x: GATE, k: L.curve([[0, 0], [LIFT, 0], [3.2, 1, 'sine']], t)[0] },
          mon: { x: 1330, n: 10412, label: 'OBSERVING', k: L.curve([[0, 0], [WALK2 - 0.1, 0], [WALK2 + 0.5, 1, 'lin']], t)[0] },
          colState: x => ({ stop: stop(x), t: Math.min(t, LOOKUP + lag(x)), look: L.joints('k').hip.x, mimicQ: mimicQ(x) }),
        });
        // Sovereign's blade after his hands leave it.
        if (t >= LET) CA.loose(c, L.actors.s.f, AS._hilt.x, AS._hilt.y, AS._hilt.a, 1.08, G);
      },
      actors: {
        k: {
          scale: 1,
          beats: [[0, 'walkA'], ...AS.walk(IN - 1.6, STOP, 0.42), [STOP + 0.3, 'readyOpen', 'io', { rArm: 104, rFore: 104, lArm: 76, lFore: 76, torso: 2 }],
            [PEER, 'readyOpen', 'io', { rArm: 104, rFore: 104, lArm: 76, lFore: 76, torso: 12, headTilt: 12 }], [LOOKUP + 0.1, 'readyOpen', 'io', { rArm: 104, rFore: 104, lArm: 76, lFore: 76, torso: 10, headTilt: 10 }],
            [LOOKUP + 0.45, 'readyOpen', 'io', { rArm: 104, rFore: 104, lArm: 76, lFore: 76, torso: -2, headTilt: -8 }], [MIM - 0.05, 'readyOpen', 'io', { rArm: 104, rFore: 104, lArm: 76, lFore: 76 }], [WALK2, 'readyOpen', 'io', { rArm: 104, rFore: 104, lArm: 76, lFore: 76 }],
            ...AS.walk(WALK2, 17.3, 0.46), [17.5, 'stand'], [DRAW - 0.1, 'readyOpen', 'io', { rArm: 104, rFore: 104, lArm: 76, lFore: 76 }], [DRAW + 0.4, 'readyOpen', 'out', { rFore: -4 }], [END, 'readyOpen', 'io', { rFore: -4 }]],
          pos: [[0, K0, 0], [IN - 1.6, K0, 0], [STOP, KC, 0, 'lin'], [WALK2, KC, 0], [WALK2 + 0.01, K2A, 0, 'hold'], [17.4, K2B, 0, 'lin'], [END, K2B, 0]],
          face: [[0, 1]], weapon: [[0, false], [DRAW, true]], sink: [[0, true]], wAlphaK: [[0, 0], [DRAW, 0], [DRAW + 0.4, 0.2], [DRAW + 0.6, 1, 'in']],
          aura: [[0, 0], [DRAW, 0], [DRAW + 0.3, 0.3], [END, 0.16]], glowK: [[0, 0]], expr: [[0, 'neutral'], [LOOKUP + 0.2, 'intense']], eyes: [[0, 0]],
        },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: [[0, 'sovPlant'], [TURN, 'sovPlant'], [TURN + 0.2, 'sovPlantLook', 'io'], [TURN + 0.5, 'sovPlant', 'io'], [LET, 'sovPlant'], [LET + 0.4, 'sovOpen', 'io'],
            ...AS.walk(LET + 0.5, CLEAR, 0.46, { rArm: 128, rFore: 150, lArm: 54, lFore: 32 }), [CLEAR + 0.2, 'sovOpen'], [END, 'sovOpen']],
          pos: [[0, SX, 0], [LET + 0.4, SX, 0], [CLEAR, 1130, 0, 'lin'], [END, 1130, 0]],
          face: [[0, 1], [TURN + 0.05, -1]], sink: [[0, true], [LET, false]], weapon: [[0, true], [LET, false]],
          breath: [[0, 0], [LET, 0], [LET + 0.4, 1]], aura: [[0, 0], [LET, 0], [END, 0.1]], auraColor: red, expr: [[0, 'neutral']], eyes: [[0, 0]], eyeColor: red,
        },
      },
      cam: [
        // The slab, low: light under it, his feet in the light.
        [0, 210, 56, 3.0], [2.5, 214, 62, 3.2, 'sine'],
        [3.2, 290, 90, 2.3, 'sine'], [4.8, 400, 102, 1.75, 'sine'],
        // Walking down the corridor as the lights find the columns.
        [8.9, KC + 40, 112, 1.5, 'sine'],
        // One column, him and it.
        [9.0, NEARX - 34, 88, 3.2, 'hold'], [PEER, NEARX - 30, 92, 3.4, 'sine'], [LOOKUP - 0.01, NEARX - 8, 92, 4.6, 'sine'],
        [LOOKUP, NEARX - 8, 92, 4.6, 'hold'], [LOOKUP + 0.5, NEARX - 8, 92, 4.6],
        // All of them.
        [LOOKUP + 0.51, KC + 80, 150, 1.05, 'hold'], [WALK2 - 0.01, KC + 90, 146, 1.2, 'sine'],
        // The far end.
        [WALK2, 1270, 128, 1.5, 'hold'], [TURN - 0.8, 1272, 128, 1.56, 'sine'],
        [TURN - 0.79, SX - 6, 62, 2.7, 'hold'], [LET + 0.3, SX - 10, 62, 2.9, 'sine'],
        // The floor between them.
        [LET + 0.31, 1070, 92, 1.8, 'hold'], [END, 1050, 88, 2.1, 'sine'],
      ],
      ev: [
        [LIFT, L => { L.sfx('portalOpen', 0.6, 0.35); L.sfx('stingLow', 0.7, 0.5); }],
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [lampOn(170 * (i + 1)) + 0.02, L => { L.sfx('hitZap', 0.16, 0.45); }]),
        ...Array.from({ length: 16 }, (_, i) => [IN - 1.6 + i * 0.42, L => { L.sfx('land', 0.14, 1.2); }]),
        [LOOKUP, L => { L.sfx('iaiMark', 0.8, 0.6); L.sfx('stingImpact', 0.5, 0.45); }],
        [MIM + 0.3, L => { L.sfx('hitBlunt', 0.4, 0.5); }],
        [WALK2, L => { L.sfx('stingLow', 0.8, 0.6); }],
        ...Array.from({ length: 7 }, (_, i) => [WALK2 + i * 0.46, L => { L.sfx('land', 0.14, 1.2); }]),
        [TURN, L => { L.sfx('swingLight', 0.25, 0.5); }],
        [LET, L => { L.sfx('iaiSheathe', 0.3, 0.5); }],
        [DRAW, L => { L.manifest('k', cyan, 0.7); L.sfx('iaiMark', 0.8, 0.9); L.sfx('stingRise', 0.4, 0.8); }],
      ],
    });
    // Walks with the feet planted: step count and stride from the distance.
    const rewalk = (key, t0, t1, dist, o) => { const a = L.actors[key]; a.beats = a.beats.filter(q => q[0] < t0 - 1e-6 || q[0] > t1 + 1e-6).concat(AS.walkTo(L, key, t0, t1, dist, o)).sort((p, q) => p[0] - q[0]); };
    rewalk('k', IN - 1.6, STOP, KC - K0, { cadence: 0.42 }); rewalk('k', WALK2 + 0.01, 17.4, K2B - K2A, { cadence: 0.46 });
    rewalk('s', LET + 0.4, CLEAR, SX - 1130, { cadence: 0.46, extra: { rArm: 128, rFore: 150, lArm: 54, lFore: 32 } });
    AS.pinWalk(L, 'k', IN - 1.6, STOP); AS.pinWalk(L, 'k', WALK2 + 0.01, 17.4); AS.pinWalk(L, 's', LET + 0.4, CLEAR);
    L.actors.s.pivot = 0.09;
    // Where his blade stands, from the pose his hands leave it in.
    const J = L.joints('s', LET - 0.02);
    AS._hilt = { x: J.rHand.x, y: J.rHand.y, a: J.wAng };
    L.D.log.blade = { x: Math.round(J.rHand.x), y: Math.round(G - J.rHand.y), a: +(J.wAng * 180 / Math.PI).toFixed(1) };
  },
  tick: function (H) { FILM.tick(H); },
};
