'use strict';
// Act 3, the freeing. Kael lowers the katana and walks in along the thread, goes down on one knee in front of him and
// puts his open hand to the light in his chest: he holds it open (canon: "Kael reaches through it, and holds it
// open"). The Axiom looks at him. The kept go, one by one. The starlit form goes dark round him (canon: the outer
// form collapses and stays in the arena, an empty architecture) and out of it, gold, stands the man: smaller,
// unsteady, himself, the kernel a point of light in his chest. He steps clear of the empty form still kneeling behind
// him and looks at his hands. Kael gets up. Two people.
module.exports = {
  arena: 'void', frames: 1100, endC: 17,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star, cyan = '#00d4ff', gold = CA.gold;
    CA.stage();
    const SX = 880, KX = 716, WALK = 1.0, KNEEL = 4.2, HOLD = 5.0, DARK = 8.4, OUT = 10.4, STAND = 12.0;
    const goldF = CA.proxy(gold);
    const core = (L) => { const J = L.joints('s'); return { x: (J.neck.x + J.hip.x) / 2, y: (J.neck.y + J.hip.y) / 2 }; };
    const chest = (L) => { const J = L.joints('k'); return { x: (J.shoulder.x + J.hip.x) / 2, y: (J.shoulder.y + J.hip.y) / 2 }; };
    const threadK = [[0, 1], [HOLD, 1], [HOLD + 0.4, 1.4], [DARK, 1.2], [OUT, 0, 'in']];
    const ringK = [[0, 1], [HOLD + 1, 1], [DARK + 0.5, 0, 'io']];
    const lerpCol = (a, b, u) => { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, '0')).join(''); };
    L.setup(H, {
      tempo: 1, vignette: 0.62, plant: true,
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.6 + Math.max(0, Math.min(0.25, (t - OUT) * 0.1)) });
        CA.floor(c);
        CA.keptRing(c, SX - 40, L.curve(ringK, t)[0], t, { n: 20, rx: 330 });
        const a = L.joints('k'), b = core(L), hk = L.curve([[0, 0], [KNEEL + 0.4, 0], [HOLD, 1]], t)[0];
        // From his chest until he reaches; then from the hand he holds it with.
        const from = { x: chest(L).x + (a.lHand.x - chest(L).x) * hk, y: chest(L).y + (a.lHand.y - chest(L).y) * hk };
        CA.thread(c, from.x, from.y, b.x, b.y, Math.min(1, L.curve(threadK, t)[0]), t);
        const pk = L.curve(threadK, t)[0];
        if (pk > 0.01) {
          c.save(); c.globalCompositeOperation = 'lighter';
          const r = 14 + pk * 12, g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, 'rgba(255,220,150,' + 0.7 * Math.min(1, pk) + ')'); g.addColorStop(1, 'rgba(0,212,255,0)');
          c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.fill(); c.restore();
        }
      },
      actors: {
        k: {
          beats: [[0, 'readyOpen', 'io', { headTilt: 2 }], [WALK, 'readyOpen'], [WALK + 0.5, 'walkLowA'], [WALK + 1.0, 'walkLowB'], [WALK + 1.5, 'walkLowA'], [WALK + 2.0, 'walkLowB'], [WALK + 2.5, 'walkLowA'],
            [KNEEL - 0.3, 'readyOpen'], [KNEEL, 'kneel', 'io', { headTilt: 0, torso: 14 }], [HOLD, 'kneelReach', 'io'], [DARK + 1, 'kneelReach', 'io', { headTilt: -6 }],
            [STAND - 0.4, 'kneelReach', 'io', { headTilt: -10 }], [STAND + 0.8, 'readyOpen', 'io', { headTilt: -4 }], [17, 'readyOpen', 'io', { headTilt: -2 }]],
          pos: [[0, KX, 0], [WALK, KX, 0], [KNEEL - 0.3, 800, 0, 'lin'], [STAND, 800, 0], [STAND + 0.9, 772, 0, 'io'], [17, 772, 0]],
          face: [[0, 1]], aura: [[0, 0.5], [HOLD, 0.9], [OUT, 0.3]], glowK: [[0, 0.6], [HOLD, 1], [OUT, 0.4]], eyes: [[0, 1], [OUT, 0.5]], expr: [[0, 'neutral']],
        },
        s: CA.actor({
          beats: [[0, 'caKneelLook', 'io', { headTilt: -2 }], [KNEEL, 'caKneelLook', 'io', { headTilt: 6 }], [DARK, 'caKneelLook', 'io', { headTilt: 10 }], [OUT + 1.5, 'kneel', 'io', { torso: 32, headTilt: 40 }], [17, 'kneel', 'io', { torso: 34, headTilt: 42 }]],
          pos: [[0, SX, 0], [17, SX, 0]], face: [[0, -1]],
          crust: [[0, 0]], headCrust: [[0, 0]], kept: [[0, 0.05], [HOLD, 0]], neb: [[0, 1], [DARK, 1], [OUT, 0, 'io']], starK: [[0, 1], [DARK, 1], [OUT, 0, 'io']],
          aura: [[0, 0.5], [DARK, 0.3], [OUT, 0]], eyes: [[0, 0.9], [DARK, 0.9], [OUT - 0.4, 0]], expr: [[0, 'hurt'], [HOLD + 1, 'neutral']],
        },
        ),
        a: {
          f: goldF, scale: 1.08, z: 2, lag: 1,
          beats: [[0, 'kneel', 'io', { torso: 14, headTilt: -4 }], [OUT, 'kneel', 'io', { torso: 14, headTilt: -4 }], [STAND, 'rising', 'io', { headTilt: -6 }], [STAND + 0.8, 'stand', 'io', { headTilt: 4 }],
            [STAND + 1.4, 'walkA'], [STAND + 2.0, 'walkB', 'io'], [STAND + 2.6, 'lookHandStand', 'io', { lArm: 50, lFore: -40, headTilt: 26 }], [15.6, 'lookHandStand', 'io', { lArm: 50, lFore: -40, headTilt: 24 }], [17, 'stand', 'io', { headTilt: 0 }]],
          pos: [[0, SX, 0], [STAND + 0.8, SX - 4, 0], [STAND + 2.0, SX - 22, 0, 'io'], [17, SX - 22, 0]], face: [[0, -1]], weapon: [[0, false]],
          alphaK: [[0, 0], [DARK + 0.6, 0], [OUT, 1, 'io']], aura: [[0, 0], [OUT, 0.4]], auraColor: gold, glowK: [[0, 0], [OUT, 0.6]], eyes: [[0, 0], [STAND + 0.6, 0.5]], eyeColor: gold, expr: [[0, 'hurt'], [STAND + 2.6, 'neutral']],
          post: (c, L, a, s) => {
            // The kernel: a point of gold light in his chest.
            const J = L.joints('a'), x = (J.neck.x + J.hip.x) / 2, y = (J.neck.y + J.hip.y) / 2 - 2, k = s.alpha;
            c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, 'rgba(255,210,127,' + 0.8 * k + ')'); g.addColorStop(1, 'rgba(255,210,127,0)');
            c.globalAlpha = k; c.fillStyle = g; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
          },
        },
      },
      cam: [
        [0, 800, 96, 1.9], [WALK + 1.5, 820, 90, 2.2, 'sine'],
        // Kneeling, the hand to the light (close), the two faces.
        [KNEEL, 840, 56, 3.4, 'hold'], [HOLD + 1.0, 840, 56, 3.7, 'sine'],
        [HOLD + 1.01, 802, 56, 5.0, 'hold'], [HOLD + 2.0, 802, 56, 5.2, 'sine'],
        [HOLD + 2.01, 870, 64, 5.0, 'hold'], [HOLD + 3.2, 870, 64, 5.2, 'sine'],
        // Wide: the kept going, the form going dark, the man standing out of it.
        [HOLD + 3.21, 840, 110, 1.6, 'hold'], [OUT, 846, 100, 1.9, 'sine'], [STAND + 0.8, 850, 90, 2.4, 'sine'],
        [STAND + 2.0, 846, 84, 2.6, 'sine'],
        // His hands; then the two of them and what is left of the form.
        [STAND + 2.61, SX - 20, 70, 4.2, 'hold'], [15.6, SX - 20, 70, 4.5, 'sine'],
        [15.61, 828, 92, 2.1, 'hold'], [17, 828, 92, 2.25, 'sine'],
      ],
      ev: [
        [WALK + 0.5, L => { L.sfx('land', 0.25, 0.7); }], [WALK + 1.5, L => { L.sfx('land', 0.25, 0.7); }], [WALK + 2.5, L => { L.sfx('land', 0.25, 0.7); }],
        [KNEEL, L => { L.sfx('land', 0.4, 0.6); }],
        [HOLD, L => { L.sfx('superHeal', 0.7, 0.5); L.sfx('stingRise', 0.6, 0.4); const b = core(L); L.ring(b.x, b.y, 60, { col: gold, w: 3, life: 30 }); L.D.log.hold = { hand: (() => { const J = L.joints('k'); return [Math.round(J.lHand.x), Math.round(J.lHand.y)]; })(), core: [Math.round(b.x), Math.round(b.y)] }; }],
        [HOLD + 2.0, L => { L.sfx('soulHarvest', 0.5, 0.4); }],
        [DARK, L => { L.sfx('stingLow', 0.8, 0.35); }],
        [OUT - 0.3, L => { L.sfx('superHeal', 0.8, 0.4); L.sfx('phaseUp', 0.5, 0.4); const b = core(L); L.burst(b.x, b.y, 14, gold); }],
        [STAND + 1.4, L => { L.sfx('land', 0.3, 0.6); }], [STAND + 2.0, L => { L.sfx('land', 0.3, 0.6); }],
      ],
      each: (L, c) => {
        // The form's outline going from starlight to the dark of an empty thing.
        players[1].color = lerpCol('#7fa0ff', '#3a4260', Math.max(0, Math.min(1, (c - DARK) / (OUT - DARK))));
        // The kept leaving: a wisp off one of them every so often while the ring fades.
        if (c > HOLD + 1 && c < DARK + 0.5 && Math.random() < 0.25) L.parts.push({ c: L.D.c, x: SX - 40 + (Math.random() - 0.5) * 660, y: G - 20 - Math.random() * 50, vx: 0, vy: -1.2, life: 40, r: 1.6, col: '#d8dce6', kind: 'wisp' });
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
