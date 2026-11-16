'use strict';
// After the end card breaks. The fragment is integrated (canon: it finds the same thing every time it looks), so it does
// not let him go: two beats of light in the wound, the room's light drawn into it, cyan along every bone from the chest
// out, the wound closing. Sovereign stops; nothing in ten thousand fights got up from that. The screen loses its count
// for a moment. He comes back to his distance; Kael is on one knee. Ends where Tyrant picks up (z4 c 3.6): Kael kneeling
// at 690, Sovereign ready at 852.
module.exports = {
  arena: 'city', frames: 376, endC: 6.2,
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    AS.stage(); AS.mini = CA.proxy(AS.red, 'katana'); CR.veins = [];
    const red = AS.red, cyan = AS.cyan;
    const B1 = 0.35, B2 = 0.95, PULL = 1.3, TURN = 2.0, UP = 2.7, KN = 3.5, BACK = 4.6;
    const near = [470, 610, 1180, 1320].map((x, i) => ({ x, seed: i * 7 + 53 }));
    const lampK = [[0, 0.42], [PULL, 0.42], [PULL + 0.4, 0.2, 'out'], [KN, 0.3], [5.2, 0.5, 'io']];
    const vK = [[0, 0], [PULL, 0], [2.6, 1.3, 'out'], [KN, 0.9], [5.6, 0, 'io']];
    const woundK = [[0, 1], [PULL, 1], [2.6, 0, 'io']];
    const PATHS = [[0, ['shoulder', 'rElbow', 'rHand']], [0, ['shoulder', 'lElbow', 'lHand']], [0, ['shoulder', 'neck', 'head']], [0.15, ['shoulder', 'hip', 'rKnee', 'rFoot']], [0.15, ['hip', 'lKnee', 'lFoot']]];
    L.setup(H, {
      tempo: 1, vignette: 0.66, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c, v = L.view(), lamp = L.curve(lampK, t)[0];
        // The count loses itself while he gets up, then comes back as it was.
        const lost = t > TURN - 0.3 && t < 4.4, n = lost ? (Math.sin(t * 47) > 0 ? 1 : 0) : 1;
        AS.paintLab(c, {
          near, redK: 1, lamp: () => lamp, mon: { x: 1000, n, label: lost && Math.sin(t * 31) > 0.3 ? '' : 'TYRANT', k: lost ? 0.6 + 0.4 * Math.abs(Math.sin(t * 23)) : 1 },
          // The recordings stop and turn to him; then form the next arm (where Tyrant takes up).
          colState: () => t < TURN - 0.2 ? { stop: 0 } : t < KN ? { stop: Math.min(1, (t - TURN + 0.2) / 0.6), look: 700, mimic: 'stand' } : { stop: 1, look: 860, mimic: 'reachHold' },
        });
        c.save(); c.fillStyle = '#0a0d0e'; c.fillRect(v.x0 - 40, v.y0 - 40, v.x1 - v.x0 + 80, Math.max(0, G - 372 - (v.y0 - 40)));
        c.fillStyle = 'rgba(160,190,185,0.08)'; c.fillRect(770, G - 400, 100, 28); c.restore();
      },
      actors: {
        k: { scale: 1, z: 2, beats: [[0, 'fallen']], pos: [[0, 700, 6]], face: [[0, 1]], weapon: [[0, false]],
          aura: [[0, 0], [PULL, 0], [2.4, 1.1, 'out'], [KN, 0.8], [5.6, 0.55, 'io']], glowK: [[0, 0], [PULL, 0], [2.4, 0.9, 'out'], [5.6, 0.4, 'io']],
          eyes: [[0, 0], [2.3, 0], [2.5, 1, 'out']], expr: [[0, 'neutral'], [2.3, 'hurt'], [KN, 'intense']],
          post: (c, L) => {
            const t = L.D.c, J = L.joints('k'), x = J.shoulder.x * 0.6 + J.hip.x * 0.4, y = J.shoulder.y * 0.6 + J.hip.y * 0.4;
            // The beat of light in the wound.
            const beat = Math.max(0, 1 - Math.abs(t - B1) * 7) + Math.max(0, 1 - Math.abs(t - B2) * 7) + (t > PULL ? Math.min(1, (t - PULL) * 2) * L.curve(woundK, t)[0] : 0);
            if (beat > 0.01) { const g = c.createRadialGradient(x, y, 1, x, y, 26); g.addColorStop(0, 'rgba(230,255,255,' + Math.min(1, beat) + ')'); g.addColorStop(0.35, 'rgba(0,212,255,' + 0.6 * Math.min(1, beat) + ')'); g.addColorStop(1, 'rgba(0,212,255,0)'); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.beginPath(); c.arc(x, y, 26, 0, P * 2); c.fill(); c.restore(); }
            // The wound closing.
            const wk = L.curve(woundK, t)[0];
            if (wk > 0.01) { const an = J.rot + 0.5, l = 12 * wk; c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#bff4ff'; c.shadowColor = cyan; c.shadowBlur = 10; c.lineWidth = 2; c.beginPath(); c.moveTo(x - Math.cos(an) * l, y - Math.sin(an) * l); c.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); c.stroke(); c.restore(); }
            AS.bodyVeins(c, L, 'k', L.curve(vK, t)[0], PATHS, 17, 1.5);
          } },
        s: { scale: 1.08, z: 1, wAbs: true, wkey: [[0, AS.COUNTER.katana]], weapon: [[0, true]], beats: [[0, 'sovReady', 'io', { headTilt: -10 }]], pos: [[0, 1000, 0]], face: [[0, 1]],
          aura: [[0, 0.24]], auraColor: red, eyes: [[0, 1]], eyeColor: red, expr: [[0, 'neutral']], pivot: 0.14,
          post: (c, L) => { AS.wound(c, L, 's', 1); AS.wound(c, L, 's', 1, red, 0.15, 0.3); } },
      },
      cam: [[0, 700, 40, 3.2]],
      ev: [],
    });
    const a = L.actors, K = AS.kit(L), { kb, sb, kp, sp, sfx } = K, ev = L.spec.ev;
    K.sf(0, 1);
    // Two heartbeats.
    for (const t of [B1, B2]) { sfx(t, 'hitBlunt', 0.9, 0.4); sfx(t + 0.13, 'hitBlunt', 0.6, 0.38); ev.push([t, l => { const J = l.joints('k'); l.ring(J.shoulder.x, J.shoulder.y + 8, 22, { col: cyan, w: 1.6, life: 14 }); }]); }
    // The room's light drawn into him.
    ev.push([PULL, l => {
      l.sfx('soulAbsorb', 0.8, 0.8); l.sfx('stingRise', 0.7, 0.6); l.shake(3);
      const motes = []; for (let i = 0; i < 70; i++) motes.push({ a: Math.random() * P * 2, r: 80 + Math.random() * 320, w: 1.4 + Math.random() * 2.2, d: Math.random() * 0.5 });
      l.add({ t: 'draw', life: 1.2 * 60, fn: (c, k) => {
        const J = l.joints('k'), x = J.shoulder.x * 0.6 + J.hip.x * 0.4, y = J.shoulder.y * 0.6 + J.hip.y * 0.4;
        c.globalCompositeOperation = 'lighter'; c.fillStyle = cyan; c.shadowColor = cyan; c.shadowBlur = 8;
        for (const m of motes) { const u = Math.max(0, Math.min(1, (k - m.d) / (1 - m.d))), r = m.r * (1 - u * u), an = m.a + u * 2.2; if (u >= 1) continue; c.globalAlpha = 0.9 * Math.min(1, u * 6); c.fillRect(x + Math.cos(an) * r - m.w / 2, y + Math.sin(an) * r * 0.6 - m.w / 2, m.w, m.w); }
      } });
    }]);
    ev.push([2.45, l => { l.surge('k', cyan, 0.8); l.sfx('phaseUp', 0.7, 0.75); l.sfx('superHeal', 0.6, 0.8); }]);
    // Up, to one knee, at his place.
    kb(UP - 0.3, 'fallen', 'io', { headTilt: 0 }); kb(UP, 'pushUp', 'io', { headTilt: -10 }); kb(3.1, 'pushUp', 'io', { headTilt: -24, torso: 30 }); kb(KN, 'kneel', 'io');
    kp(UP, 700, 6); kp(KN, 690, 0, 'io'); kb(6.2, 'kneel');
    // He stops, turns, and comes back.
    sb(1.0, 'sovReady', 'io', { headTilt: -10 }); sb(1.6, 'sovReady', 'io', { headTilt: 6 }); K.sf(TURN, -1); sb(TURN + 0.3, 'sovReady', 'io', { headTilt: 4 });
    sfx(TURN, 'stingLow', 0.6, 0.6); ev.push([TURN - 0.3, l => l.sfx('hitZap', 0.35, 0.4)]);
    K.SB.push(...AS.walk(3.4, BACK, 0.3, null, 'sovWalkA', 'sovWalkB')); sp(3.4, 1000); sp(BACK, 852, 0, 'lin'); sb(BACK + 0.2, 'sovReady', 'io', { headTilt: 2 }); sb(6.2, 'sovReady', 'io', { headTilt: 1 });
    K.finish();
    L.spec.cam = [
      // On him, close; out to the room as the light goes in; Sovereign turning; both, framed as Tyrant frames them.
      [0, 705, 30, 3.2, 'hold'], [1.2, 705, 32, 3.4, 'sine'],
      [PULL + 0.1, 760, 70, 2.0, 'sine'], [TURN - 0.1, 840, 90, 1.6, 'sine'],
      [TURN + 0.05, 1000, 78, 3.0, 'hold'], [TURN + 0.6, 995, 80, 3.1, 'sine'],
      [TURN + 0.65, 705, 50, 2.6, 'hold'], [KN, 700, 60, 2.6, 'sine'],
      [KN + 0.2, 840, 84, 1.9, 'hold'], [5.4, 780, 76, 2.3, 'sine'], [6.2, 720, 70, 2.6, 'sine'],
    ];
  },
  tick: function (H) { FILM.tick(H); },
};
