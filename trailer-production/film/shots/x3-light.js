'use strict';
// Act 1, light. Kael gets up out of the dent. The Axiom raises a hand and a star is lit over Kael's head; the hand
// closes and the star collapses in a heartbeat (canon: in the First Laws that is how long it took) into a black hole.
// It lifts Kael off the floor; he lets it swing him half round and comes out over the top straight at the Axiom,
// blade high. Two fingers, and light is aimed like a blade (canon): Kael takes it on the katana in the air and it
// drives him back across the Void and along the floor on one knee, the blade glowing. Then the size shift: the Axiom
// grows until Kael is a figure at his feet. Black.
module.exports = {
  arena: 'void', frames: 760, endC: 11.6,
  match: { p2: 'gauntlet', p2Color: '#7fa0ff' },
  install: function (H) {
    const L = FILM, G = H.D.G;
    const star = CA.star;
    CA.stage();
    const SX = 640, SH = 14, HX = 440, HH = 170, OR = 72;
    const STAR = 0.9, CLOSE = 1.6, ORB0 = 2.55, ORB1 = 3.2, BEAM = 3.72, BEAM1 = 5.8, GROW = 7.2;
    const holeK = [[0, 0], [CLOSE, 0], [CLOSE + 0.08, 1, 'xout'], [ORB1 + 0.1, 1], [ORB1 + 0.5, 0, 'in']];
    const beamK = [[0, 0], [BEAM, 0], [BEAM + 0.04, 1, 'lin'], [BEAM1 - 0.2, 1], [BEAM1, 0, 'lin']];
    const scaleK = [[0, 1.3], [GROW, 1.3], [GROW + 2.2, 5.6, 'io'], [11.6, 5.8]];
    const heatK = [[0, 0], [BEAM, 0], [BEAM + 0.3, 1], [BEAM1 + 1.2, 1], [GROW + 1.5, 0.3]];
    // Kael's centre on the half orbit: from straight under the hole, round the far side, out over the top.
    const orbit = c => { const u = Math.max(0, Math.min(1, (c - ORB0) / (ORB1 - ORB0))), an = Math.PI / 2 + Math.PI * L.EASE.io(u); return { x: HX + Math.cos(an) * OR, y: G - HH + Math.sin(an) * OR }; };
    const contact = (L) => { const t = L.tip('k'); return { x: t.hand.x + (t.x - t.hand.x) * 0.45, y: t.hand.y + (t.y - t.hand.y) * 0.45 }; };
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: true,
      fade: [[0, 0], [11.25, 0], [11.4, 1, 'lin'], [11.6, 1]],
      speed: [[0, 1], [CLOSE - 0.05, 1], [CLOSE, 0.4], [CLOSE + 0.3, 0.4], [CLOSE + 0.5, 1], [BEAM - 0.04, 1], [BEAM, 0.35], [BEAM + 0.25, 0.35], [BEAM + 0.45, 1]],
      backdrop: (c, L) => {
        const t = L.D.c;
        CA.paintVoid(c, { gy: -60, galaxy: 0.75 });
        CA.floor(c);
        CA.crater(c, 478, 160, 18, 1);
        // The star lit over Kael, then gone into the dark.
        const sk = L.curve([[0, 0], [STAR, 0], [CLOSE - 0.1, 1, 'out'], [CLOSE, 1.4, 'in'], [CLOSE + 0.02, 0, 'lin']], t)[0];
        if (sk > 0.01) {
          c.save(); c.globalCompositeOperation = 'lighter';
          const r = 6 + sk * 22, g = c.createRadialGradient(HX, G - HH, 0, HX, G - HH, r * 3);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.2, 'rgba(255,240,210,' + 0.8 * Math.min(1, sk) + ')'); g.addColorStop(1, 'rgba(120,140,255,0)');
          c.fillStyle = g; c.beginPath(); c.arc(HX, G - HH, r * 3, 0, Math.PI * 2); c.fill();
          c.restore();
        }
        CA.pull(c, HX, G - HH, L.curve(holeK, t)[0] * (t < ORB1 ? 1 : 0.4), t);
        CA.hole(c, HX, G - HH, 24, L.curve(holeK, t)[0], t);
        // The lance: from his two fingers to where it meets the blade.
        const bk = L.curve(beamK, t)[0];
        if (bk > 0.01) { const J = L.joints('s'), p = contact(L); CA.beam(c, J.rHand.x, J.rHand.y, p.x + 6, p.y, 4, bk, t); }
      },
      actors: {
        k: {
          beats: [[0, 'rising', 'io', { headTilt: -20 }], [0.6, 'guard'], [STAR + 0.2, 'guard', 'io', { headTilt: -24 }],
            [CLOSE + 0.2, 'braceBack', 'io', { torso: -4, headTilt: -20 }], [2.1, 'tuck'], [ORB0, 'airHigh', 'io', { rot: -20 }],
            [ORB0 + 0.35, 'tuck', 'lin', { rot: -110 }], [ORB1, 'airHigh', 'out', { rot: 0 }], [BEAM - 0.1, 'airHigh'], [BEAM, 'airBlock', 'xout'],
            [BEAM + 1.3, 'airBlock', 'io', { torso: -20 }], [BEAM + 1.45, 'kneelBlock', 'out', { torso: -10 }], [BEAM1, 'kneelBlock', 'out'],
            [BEAM1 + 1.4, 'kneelBlock', 'io', { torso: 16, headTilt: 12 }], [GROW + 0.4, 'kneelBlock', 'io', { headTilt: -16 }], [GROW + 2.4, 'rising', 'io', { headTilt: -30 }],
            [10.4, 'guard', 'io', { headTilt: -32 }], [11.6, 'guard', 'io', { headTilt: -32 }]],
          pos: [[0, 438, 0], [0.6, 440, 0], [CLOSE, 440, 0], [2.4, 438, 60, 'out']],
          face: [[0, 1]], trail: [[ORB0, BEAM, 4, 0.03, 0.4], [BEAM, BEAM1, 3, 0.04, 0.3]],
          aura: [[0, 0.3], [BEAM1, 0.15], [GROW + 1.5, 0.6]], glowK: [[0, 0.3]], eyes: [[0, 0], [10.0, 1]], expr: [[0, 'intense'], [BEAM, 'hurt'], [BEAM1 + 1, 'intense']],
          post: (c, L) => CR.bladeCracks(c, 'k', L.curve(heatK, L.D.c)[0] * 2.6, 'sepia(1) saturate(3) brightness(1.7)', '#ffe0b0'),
        },
        s: CA.actor({
          beats: [[0, 'caFloat', 'io', { headTilt: 6 }], [0.5, 'caFloat'], [STAR - 0.1, 'caClose'], [CLOSE - 0.05, 'caClose'], [CLOSE, 'caFist', 'xout'], [ORB1, 'caFist'],
            [BEAM - 0.12, 'caFloat'], [BEAM, 'caAim', 'xout'], [BEAM1, 'caAim'], [BEAM1 + 0.6, 'caFloat'], [GROW, 'caFloat'], [GROW + 2.2, 'caFloat', 'io', { headTilt: 14, torso: 6 }], [11.6, 'caFloat', 'io', { headTilt: 16, torso: 6 }]],
          pos: [[0, SX, SH], [GROW, SX, SH], [GROW + 2.2, SX + 40, 4, 'io'], [11.6, SX + 40, 4]], face: [[0, -1]],
          neb: [[0, 1]], crust: [[0, 0.45]], aura: [[0, 0.4], [CLOSE, 0.9], [BEAM1 + 0.5, 0.4], [GROW, 1]], eyes: [[0, 1]],
        }),
      },
      cam: [
        [0, 470, 84, 2.3], [STAR, 450, 110, 2.0, 'sine'],
        // The star over his head; the collapse.
        [STAR + 0.01, HX + 10, 112, 2.5, 'hold'], [CLOSE, HX + 10, 118, 2.6, 'sine'],
        [CLOSE + 0.6, HX + 30, 150, 2.1, 'sine'], [ORB1, 490, 190, 1.75, 'sine'],
        // Out over the top at him; the beam.
        [BEAM, 540, 140, 2.0, 'sine'], [BEAM + 0.01, 530, 142, 2.4, 'hold'], [BEAM + 0.4, 530, 142, 2.5, 'sine'],
        [BEAM + 0.41, 420, 90, 1.5, 'hold'], [BEAM1, 330, 80, 1.7, 'sine'],
        // On one knee, the blade hot.
        [BEAM1 + 0.01, 172, 62, 2.9, 'hold'], [GROW, 172, 64, 3.1, 'sine'],
        // He grows: up from Kael to the face.
        [GROW + 0.01, 300, 90, 2.0, 'hold'], [GROW + 2.4, 420, 262, 0.86, 'io'], [11.6, 424, 268, 0.84, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('land', 0.4, 0.8); }],
        [STAR, L => { L.sfx('stingRise', 0.7, 0.7); L.sfx('superHeal', 0.5, 0.5); }],
        [CLOSE, L => {
          L.sfx('explosion', 1, 0.35); L.sfx('stingImpact', 1, 0.45); L.shake(14);
          L.add({ t: 'ring', x: HX, y: G - HH, r0: 140, r1: 4, life: 14, w: 5, sq: 1, col: star });
          L.flash('#cfe0ff', 0.25, 8);
        }],
        [CLOSE + 0.3, L => { L.sfx('soulAbsorb', 0.8, 0.5); L.debris(478, G - 2, 16, { col: '#1a1a26', v: 5, r: 3, g: -0.12, dir: -90, spread: 60 }); }],
        [ORB0, L => { L.sfx('swingHeavy', 0.8, 0.6); }], [ORB0 + 0.3, L => { L.sfx('swingHeavy', 0.9, 0.5); }],
        [ORB1, L => { L.sfx('jump', 0.6, 0.7); L.lines(18, { cx: 0.6, cy: 0.4 }); }],
        [BEAM, L => {
          const p = contact(L); L.D.log.beam = { at: [Math.round(p.x), Math.round(p.y)], hand: (() => { const J = L.joints('s'); return [Math.round(J.rHand.x), Math.round(J.rHand.y)]; })() };
          L.sfx('hitZap', 1, 0.5); L.sfx('superActivate', 0.9, 0.6); L.sfx('clang', 1, 0.5); L.shake(12); L.impact(2, { tint: '#bfd0ff' });
        }],
        [BEAM + 1.45, L => { L.sfx('landHard', 0.9, 0.7); }],
        [GROW, L => { L.sfx('stingLow', 1, 0.4); L.sfx('phaseUp', 0.8, 0.35); }],
        [GROW + 1.2, L => { L.sfx('stingLow', 0.9, 0.3); L.shake(6); }],
        [10.0, L => { L.sfx('iaiMark', 0.5, 0.7); }],
      ],
      each: (L, c) => {
        const k = L.actors.k, s = L.actors.s;
        s.scale = L.curve(scaleK, c)[0];
        // Flung round the hole, then straight at him, then carried back by the beam and along the floor.
        if (c >= ORB0 && c < ORB1) { const o = orbit(c), J = L.joints('k'), st = L.state(k, c); k.pos = [[0, st.x + o.x - J.hip.x, st.h - (o.y - J.hip.y)]]; k._o = { x: st.x + o.x - J.hip.x, h: st.h - (o.y - J.hip.y) }; }
        else if (c >= ORB1 && k._o && !k._out) {
          k._out = true;
          k.pos = [[ORB1, k._o.x, k._o.h], [BEAM, 470, 116, 'lin'], [BEAM + 1.3, 250, 30, 'out'], [BEAM + 1.45, 230, 0, 'lin'], [BEAM1, 150, 0, 'out'], [11.6, 150, 0]];
        }
        // The floor carved under him while the beam drives him.
        if (c > BEAM + 1.45 && c < BEAM1 && Math.random() < 0.25) { const J = L.joints('k'); L.debris(J.lFoot.x, G - 2, 1, { kind: 'spark', col: star, v: 3, r: 1.6, g: 0.2, dir: -60, spread: 40 }); }
        if (c > BEAM && c < BEAM1 - 0.2 && Math.random() < 0.6) { const p = contact(L); L.debris(p.x, p.y, 2, { kind: 'spark', col: '#ffffff', v: 4, r: 1.6, g: 0.1, dir: 180, spread: 120 }); }
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
