'use strict';
// Act 3, the sheath decides. Kael's super is the katana's own: Shadow Step — gone, behind him, three cuts and a
// draw straight through. In Death's Dojo the cuts wait. Kael opens his hand, the blade goes back to light, and
// every waiting cut lands at once. Sovereign goes to one knee, blade planted in the street like the night began.
// Kael's super spent, he heals (canon: recovery from a clean zero). Sovereign rises — he never concedes — files
// what he has seen, and steps back into his pocket, outside the world. Kael alone in the rain.
module.exports = {
  arena: 'city', frames: 1000, endC: 13.2,
  install: function (H) {
    const L = FILM, G = H.D.G;
    const red = '#ff3311', cyan = '#00d4ff', pale = '#ccccff', white = '#ffffff';
    const TEAR = 780;
    const mark = (L, joint, ang, len) => {
      const p = L.joints('s')[joint];
      L.cutMark(p.x, p.y, ang, len, 's', joint); L.sfx('hitSlash', 1, 1.15); L.sfx('iaiMark', 0.5, 1.4); L.shake(8);
      L.streaks(p.x, p.y, 8, 36, { col: '#e6e6ff', life: 10, w: 1.6 });
    };
    const smoke = (L, x) => {
      L.dust(x, 12, 60, { v: 2.5, life: 34, col: '#5fd8ff', a: 0.3, r: 7 });
      L.ring(x, G - 40, 60, { col: cyan, w: 4, life: 16 }); L.streaks(x, G - 40, 12, 50, { col: '#bff4ff', life: 12 });
    };
    L.setup(H, {
      tempo: 0.92, vignette: 0.6, domX: 550, dojoX: 520,
      backdrop: (c, L) => { L.paintCity(c, { street: G, left: 120, right: 850, leftTop: G - 1600, rightTop: G - 1500 }); crater(c); tear(c); },
      dominion: [[0, 440, 0.3], [3.44, 440, 0.3], [3.6, 700, 0, 'xout']],
      dojo: [[0, 300, 1], [3.44, 300, 1], [4.4, 520, 0, 'out']],
      fade: [[0, 0], [11.9, 0], [13.0, 1, 'sine']],
      speed: [[0, 1], [1.7, 1], [1.74, 0.35, 'xout'], [3.2, 0.35], [3.42, 1, 'in'], [3.45, 0.2, 'xout'], [3.7, 0.2], [4.1, 1, 'in']],
      world: [[0, 1], [1.7, 1], [1.74, 0.05, 'xout'], [3.42, 0.05], [3.5, 0.5, 'in'], [5.5, 0.5], [6.4, 1, 'in']],
      actors: {
        k: {
          beats: [[0, 'iaido'], [0.85, 'iaido', 'lin', { hipDrop: 26 }],
            [1.05, 'windBack', 'xout'], [1.12, 'slashOut', 'xout'], [1.2, 'highGuard', 'out'], [1.27, 'cutDown', 'xout'], [1.35, 'windBack', 'out'], [1.42, 'upperCut', 'xout'],
            [1.55, 'iaido', 'out'], [1.7, 'follow', 'xout'], [3.2, 'follow', 'lin', { headTilt: 6 }],
            // The hand opens.
            [3.4, 'follow', 'io', { rArm: 40, rFore: 30 }], [4.2, 'sheathe', 'io'], [5.6, 'stand', 'io', { headTilt: 8 }],
            [6.2, 'stand', 'io', { headTilt: -4 }], [9.0, 'stand', 'lin', { headTilt: -6 }], [11.0, 'stand', 'io', { headTilt: 14, lArm: 60, lFore: 10 }], [13.2, 'stand', 'lin', { headTilt: 18, lArm: 60, lFore: 10 }]],
          pos: [[0, 430, 0], [1.05, 724, 0, 'hold'], [1.42, 712, 0], [1.55, 716, 0], [1.7, 380, 0, 'xout'], [13.2, 380, 0]],
          face: [[0, 1], [1.0, -1], [6.0, 1]],
          hidden: [[0, false], [0.92, true], [1.04, false]],
          weapon: [[0, true], [3.45, false]],
          eyes: [[0, 0.9], [4.0, 0.9], [5.6, 0.4], [13.2, 0.25]],
          aura: [[0, 0.6], [0.6, 1.2], [1.7, 0.8], [3.4, 0.4], [4.5, 0.2], [13.2, 0.08]],
          glowK: [[0, 0.3], [0.6, 1.0], [1.8, 0.6], [3.5, 0.9], [5.5, 0.15]],
          trail: [[1.04, 1.5, 3, 0.02, 0.35], [1.55, 1.75, 10, 0.012, 0.6]],
          arcColor: pale,
          expr: [[0, 'intense'], [4.2, 'neutral']],
        },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: [[0, 'guard'], [0.9, 'guard', 'lin', { headTilt: 10 }], [1.12, 'hitBack', 'xout', { torso: -6 }], [1.27, 'hitBack', 'xout', { torso: 10 }], [1.42, 'hitBack', 'xout', { torso: -16 }],
            [1.7, 'hitBack', 'lin', { torso: -10 }], [3.4, 'hitBack', 'lin', { torso: -12 }],
            [3.46, 'flyBack', 'xout'], [3.9, 'kneel', 'in'], [4.4, 'sovKneelPlant', 'out'], [6.8, 'sovKneelPlant', 'lin', { headTilt: 34 }],
            [7.6, 'sovPlant', 'io'], [8.0, 'sovPlantLook', 'io', { headTilt: -4 }], [8.3, 'sovRaise', 'xout'], [8.6, 'sovReady', 'io'],
            [9.2, 'sovReady'], [9.5, 'sovWalkA', 'sine'], [9.9, 'sovWalkB', 'sine'], [10.3, 'sovWalkA', 'sine'], [10.7, 'sovReady', 'sine']],
          pos: [[0, 664, 0], [3.44, 664, 0], [3.9, 640, 0, 'xout'], [8.6, 640, 0], [9.2, 640, 0], [10.7, TEAR, 0, 'lin']],
          face: [[0, -1], [9.2, 1]],
          sink: [[0, false], [4.4, true], [8.3, false]],
          breath: [[0, 1], [4.3, 1], [4.4, 0], [8.3, 0], [8.6, 1]],
          alphaK: [[0, 1], [10.1, 1], [10.6, 0, 'in']],
          aura: [[0, 0.4], [3.4, 0.4], [3.6, 0], [7.4, 0], [8.0, 0.5], [9.2, 0.35]],
          auraColor: red,
          eyes: [[0, 0.6], [3.45, 0], [7.3, 0], [7.9, 1.0, 'out'], [9.2, 0.7]],
        },
      },
      cam: [
        [0, 450, 56, 2.6], [0.88, 440, 54, 3.0, 'sine'],
        [0.9, 560, 70, 2.3, 'hold'], [1.5, 600, 66, 2.45, 'sine'], [1.7, 540, 66, 2.1, 'xout'],
        [3.2, 520, 66, 2.25, 'sine'], [3.44, 560, 70, 2.6, 'xout'], [4.1, 560, 66, 2.3, 'sine'],
        // Healing: on Kael.
        [4.3, 392, 50, 3.3, 'hold'], [5.8, 392, 52, 3.5, 'sine'],
        // Sovereign rises, files him, and goes.
        [5.81, 520, 62, 2.0, 'hold'], [7.4, 520, 62, 2.1, 'sine'], [8.0, 512, 66, 2.15, 'sine'], [9.0, 560, 66, 2.2, 'sine'], [10.8, 600, 70, 2.0, 'sine'],
        // Kael, alone.
        [10.81, 390, 56, 2.9, 'hold'], [13.2, 420, 150, 1.4, 'sine'],
      ],
      ev: [
        // The three cuts from the exchange are still waiting on him.
        [0, L => { const J = L.joints('s'); L.cutMark(J.hip.x, J.hip.y, -30, 46, 's', 'hip'); L.cutMark(J.shoulder.x, J.shoulder.y, 60, 40, 's', 'shoulder'); L.cutMark(J.rKnee.x, J.rKnee.y, 10, 36, 's', 'rKnee'); }],
        [0.05, L => { L.surge('k', pale, 1.5); L.surge('k', cyan, 1.0); L.sfx('superActivate', 1, 0.8); L.sfx('stingRise', 0.9, 0.7); L.shake(12); }],
        // Shadow Step.
        [0.92, L => { smoke(L, 430); L.sfx('swing', 1, 1.4); L.sfx('hitZap', 0.6, 1.2); }],
        [1.04, L => { smoke(L, 724); L.sfx('swingLight', 0.9, 1.3); }],
        [1.12, L => mark(L, 'hip', -20, 44)], [1.27, L => mark(L, 'shoulder', 70, 42)], [1.42, L => mark(L, 'neck', 30, 38)],
        [1.6, L => { L.sfx('iaiMark', 1.2, 0.8); L.lines(20, { dir: 180, n: 44, col: '#e6e6ff' }); }],
        [1.7, L => {
          L.sfx('iaiSheathe', 1.2, 0.9); L.sfx('swing3', 1, 0.8); L.shake(14);
          const J = L.joints('s'); mark(L, 'hip', 8, 70);
          L.streaks(J.hip.x, J.hip.y - 10, 20, 120, { col: '#e6e6ff', dir: 180, spread: 20, life: 16, w: 2 });
        }],
        [1.8, L => { L.sfx('stingLow', 0.8, 0.5); }],
        // The hand opens.
        [3.38, L => { L.disperse('k', pale, 1.2); L.sfx('soulRip', 0.5, 1.1); }],
        [3.45, L => {
          L.detonate(); L.impact(3, { invert: true }); L.shake(40);
          L.sfx('explosion', 1.3, 0.7); L.sfx('heavyHit', 1.3, 0.5); L.sfx('stingImpact', 1.2, 0.5); L.sfx('iaiSheathe', 1, 0.6);
          const J = L.joints('s');
          L.ring(J.hip.x, J.hip.y - 20, 260, { col: white, w: 12, life: 46 }); L.ring(J.hip.x, J.hip.y - 20, 160, { col: pale, w: 6, life: 36 });
          L.ring(J.hip.x, G, 360, { sq: 0.12, col: pale, w: 8, life: 50 });
          L.streaks(J.hip.x, J.hip.y - 20, 40, 220, { col: '#f0f0ff', life: 30, w: 3 });
          L.lines(50, { n: 70, col: '#ffffff' });
          // His walls come down in pieces.
          for (const wx of [550 - 440, 550 + 440]) L.debris(wx, G - 200, 50, { v: 5, col: '#7a1206', r: 5, spread: 120, dir: 90, g: 0.25, life: 90 });
          L.dust(J.hip.x, 24, 260, { v: 5, life: 80, a: 0.5 });
        }],
        [3.9, L => { L.sfx('landHard', 1, 0.7); L.shake(14); L.dust(640, 10, 60); }],
        [4.4, L => { L.sfx('clang', 0.8, 0.5); L.crack(640, 40, { col: red, life: 1e6 }); L.debris(640, G - 2, 8, { v: 3, kind: 'spark', col: '#ff6a40', r: 2, life: 20, g: 0.2 }); }],
        // He heals: the super is spent; recovery from a clean zero.
        [4.5, L => { L.sfx('superHeal', 1, 0.9); L.sfx('stingRise', 0.5, 1.3); }],
        // Rain again. He looks back.
        [6.0, L => { L.sfx('stingLow', 0.5, 0.8); }],
        // Sovereign rises.
        [7.4, L => { L.sfx('respawn', 0.4, 0.6); }],
        [7.9, L => { L.sfx('hitZap', 0.5, 0.6); L.catalogue('k', 1.4); }],
        [8.3, L => { L.sfx('swingHeavy', 0.8, 0.8); L.debris(640, G - 2, 12, { v: 6, col: '#7d7a88', r: 3, spread: 70 }); L.surge('s', red, 0.7); }],
        // The tear: his pocket, outside the world.
        [9.1, L => { L.sfx('portalOpen', 0.8, 0.6); }],
        [10.6, L => { L.sfx('portalOpen', 0.5, 0.45); }],
        [11.2, L => { L.sfx('stingLow', 0.6, 0.5); }],
      ],
      each: (L, c) => {
        // Healing: cyan-white motes rising around him, the light settling back into him.
        if (c > 4.4 && c < 6.0) {
          const J = L.joints('k');
          if (L.D.f % 2 === 0) L.parts.push({ c, x: J.hip.x + (Math.random() - 0.5) * 50, y: L.G - Math.random() * 6, vx: (Math.random() - 0.5) * 0.3, vy: -1.2 - Math.random(),
            life: 50 + Math.random() * 30, r: 1.5 + Math.random() * 2, col: Math.random() < 0.5 ? '#bff4ff' : '#ffffff', kind: 'wisp' });
        }
      },
    });
    function crater(c) {
      c.fillStyle = '#0c0c14'; c.beginPath(); c.ellipse(480, G + 3, 110, 16, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#3a3a50'; c.lineWidth = 3; c.beginPath(); c.ellipse(480, G + 3, 110, 16, 0, Math.PI, 0); c.stroke();
    }
    // A vertical tear: red at the lips, black inside — a room that is not on the substrate.
    function tear(c) {
      const t = L.D.c, open = Math.max(0, Math.min(1, (t - 9.1) / 0.5)) * Math.max(0, Math.min(1, (10.9 - t) / 0.4));
      if (open <= 0) return;
      const w = 26 * open, top = G - 150, bot = G;
      c.save();
      c.fillStyle = '#000'; c.shadowColor = red; c.shadowBlur = 30;
      c.beginPath(); c.moveTo(TEAR + 14, top); c.quadraticCurveTo(TEAR + 14 + w, (top + bot) / 2, TEAR + 14, bot); c.quadraticCurveTo(TEAR + 14 - w, (top + bot) / 2, TEAR + 14, top); c.fill();
      c.strokeStyle = red; c.lineWidth = 2.5; c.stroke();
      c.globalAlpha = 0.5 * open; c.strokeStyle = '#ffb090'; c.lineWidth = 1; c.stroke();
      c.restore();
    }
  },
  tick: function (H) { FILM.tick(H); },
};
