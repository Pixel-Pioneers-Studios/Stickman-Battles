'use strict';
// The pocket (canon: matter kept off the substrate, outside the universe; time does not run properly there). Racks of the
// red copies he keeps, things he stored hanging where he left them; sparks stay where a blow threw them.
//   1. Kael out of the door, the room, the racks. He forms the katana; two clashes.
//   2. Sovereign at home, still past his own level: the cut, the palm, the kick, without a wind-up. A spear off the rack
//      for the leap, the sweep, and he walks over with the sword.
//   3. Canon: a fragment can only exist inside the universe. The pocket will not hold it: cyan fractures run out from
//      Kael through the floor and the dark, the stored things start to fall (time running near him), and the floor
//      breaks. Both drop out of it.
module.exports = {
  arena: 'city', frames: 651, endC: 9.4,
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    AS.stage(); CR.veins = [];
    const red = AS.red, cyan = AS.cyan;
    const FORM = 1.75, CUTK = 3.0, PALM = 3.12, KICK = 3.24, AIR = 4.86, SWEEP = 5.06, REJ = 6.5, PULSE = 7.4, BREAK = 8.05;
    const DOORX = 452;
    const doorK = [[0, 1], [0.7, 1], [1.05, 0, 'in']];
    const crackK = [[0, 0], [REJ, 0], [PULSE, 0.45, 'io'], [PULSE + 0.1, 0.7, 'out'], [BREAK, 1, 'io']];
    // The racks: every arm Kael has formed, as a red copy, hanging point down; rows go back into the dark.
    const rackF = AS.copy(CA.proxy(red, 'sword'));
    const KEYS = ['sword', 'katana', 'spear', 'axe', 'hammer', 'scythe', 'dagger', 'greatsword'].filter(k => WEAPONS[k] && typeof WEAPON_SPRITES !== 'undefined' && WEAPON_SPRITES[k]);
    // Stored matter hanging still: glass and stone from the Lab, rain from somewhere else.
    const R = CA.srand(77), held = [];
    for (let i = 0; i < 90; i++) held.push({ x: 200 + R() * 1100, y: G - 20 - R() * 300, r: 1 + R() * 3.4, a: R() * P, kind: R() < 0.35 ? 'rain' : R() < 0.6 ? 'glass' : 'stone' });
    // The fractures: branches from Kael's feet, along the floor and up into the dark.
    const FX = 720, cr = [];
    { const r = CA.srand(9);
      for (let i = 0; i < 14; i++) {
        const up = i >= 6, pts = [[FX + (r() - 0.5) * 10, G]]; let an = up ? -P / 2 + (r() - 0.5) * 2.4 : (i % 2 ? 0 : P) + (r() - 0.5) * 0.08, x = pts[0][0], y = G;
        const n = 8 + Math.floor(r() * 6);
        for (let j = 0; j < n; j++) { const l = 30 + r() * 50; an += (r() - 0.5) * (up ? 0.9 : 0.12); x += Math.cos(an) * l; y = up ? y + Math.sin(an) * l : G + (r() - 0.5) * 2; pts.push([x, y]); }
        cr.push({ pts, d0: r() * 0.15 });
      }
    }
    const drawCracks = (c, k) => {
      if (k <= 0.01) return;
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      for (const b of cr) {
        const u = Math.max(0, Math.min(1, (k - b.d0) / (1 - b.d0))) * (b.pts.length - 1); if (u <= 0) continue;
        c.beginPath(); c.moveTo(b.pts[0][0], b.pts[0][1]);
        for (let i = 0; i < b.pts.length - 1 && i < u; i++) { const f = Math.min(1, u - i), p = b.pts[i], q = b.pts[i + 1]; c.lineTo(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f); }
        c.shadowColor = cyan; c.shadowBlur = 14; c.strokeStyle = cyan; c.globalAlpha = 0.85; c.lineWidth = 3; c.stroke();
        c.shadowBlur = 0; c.strokeStyle = '#e8fdff'; c.globalAlpha = 1; c.lineWidth = 1; c.stroke();
      }
      c.restore();
    };
    L.setup(H, {
      tempo: 1, vignette: 0.7, plant: true,
      fall: [[0, 0], [BREAK, 0], [9.4, 0]],
      backdrop: (c, L) => {
        const t = L.D.c, v = L.view(), W = v.x1 - v.x0;
        // The dark, red at the bottom; below the floor, once it has gone, the city's light coming up.
        const g = c.createLinearGradient(0, G - 420, 0, G + 40); g.addColorStop(0, '#030001'); g.addColorStop(1, '#1a0302');
        c.fillStyle = g; c.fillRect(v.x0 - 20, v.y0 - 20, W + 40, v.y1 - v.y0 + 40);
        if (t > BREAK - 0.05) { const cg = c.createLinearGradient(0, G, 0, G + 700); cg.addColorStop(0, 'rgba(18,18,40,0)'); cg.addColorStop(0.5, 'rgba(30,30,70,0.8)'); cg.addColorStop(1, 'rgba(255,200,120,0.35)'); c.fillStyle = cg; c.fillRect(v.x0 - 20, G, W + 40, 900); }
        // Racks, three rows back.
        for (const [p, sc, y, gap, al] of [[0.3, 0.5, G - 150, 52, 0.25], [0.55, 0.72, G - 110, 74, 0.38], [0.78, 0.9, G - 80, 104, 0.5]]) {
          const ox = v.cx * (1 - p);
          for (let i = Math.floor((v.x0 - ox) / gap) - 1; i * gap + ox < v.x1 + gap; i++) {
            const x = i * gap + ox, wk = KEYS[((i % KEYS.length) + KEYS.length) % KEYS.length];
            // Stored things fall once time runs near them.
            const dt = t > BREAK ? t - BREAK : 0, yy = y + 140 * dt * dt * (0.6 + 0.4 * Math.sin(i));
            c.save(); c.globalAlpha = al; c.strokeStyle = 'rgba(255,60,30,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 120); c.lineTo(x, yy - 4); c.stroke();
            rackF.weaponKey = wk; rackF.weapon = WEAPONS[wk];
            CA.loose(c, rackF, x, yy, P / 2 + Math.sin(t * 0.3 + i) * 0.02, sc); c.restore();
          }
        }
        // The floor: black glass with the red under it, until it breaks.
        if (t < BREAK) {
          c.fillStyle = '#070102'; c.fillRect(v.x0 - 20, G, W + 40, 600);
          c.strokeStyle = 'rgba(255,51,17,0.5)'; c.lineWidth = 1.4; c.shadowColor = red; c.shadowBlur = 10; c.beginPath(); c.moveTo(v.x0 - 20, G); c.lineTo(v.x1 + 20, G); c.stroke(); c.shadowBlur = 0;
          c.strokeStyle = 'rgba(255,51,17,0.08)'; c.beginPath(); for (let x = Math.floor((v.x0 - 200) / 90) * 90; x < v.x1 + 200; x += 90) { c.moveTo(x, G); c.lineTo(x + (x - v.cx) * 0.5, G + 120); } c.stroke();
        } else {
          const r = CA.srand(31), u = t - BREAK;
          for (let x = Math.floor((v.x0 - 60) / 52) * 52; x < v.x1 + 60; x += 52) {
            const d = Math.abs(x - FX) / 600, w = Math.max(0, u - d * 0.25), fall = 420 * w * w, rot = (r() - 0.5) * w * 2.2, al = Math.max(0, 1 - w * 0.9);
            if (al <= 0) continue;
            c.save(); c.globalAlpha = al; c.translate(x + 26, G + fall); c.rotate(rot); c.fillStyle = '#070102'; c.fillRect(-26, 0, 52, 40);
            c.strokeStyle = cyan; c.lineWidth = 1.2; c.shadowColor = cyan; c.shadowBlur = 8; c.strokeRect(-26, 0, 52, 40); c.restore();
          }
        }
        drawCracks(c, L.curve(crackK, t)[0]);
        // Held matter: still until time runs near Kael, then falling.
        c.save();
        for (const h of held) {
          const near = Math.abs(h.x - FX) < 260 ? 1 : 0, t0 = near ? PULSE + Math.abs(h.x - FX) / 600 : BREAK + 0.1, dt = Math.max(0, t - t0), y = h.y + 260 * dt * dt;
          c.globalAlpha = h.kind === 'rain' ? 0.35 : 0.6;
          if (h.kind === 'rain') { c.strokeStyle = 'rgba(170,190,230,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(h.x, y); c.lineTo(h.x - 1.2, y + 8 + dt * 30); c.stroke(); }
          else { c.fillStyle = h.kind === 'glass' ? 'rgba(200,235,230,0.7)' : '#2a2224'; c.save(); c.translate(h.x, y); c.rotate(h.a + dt * 3); c.fillRect(-h.r, -h.r * 0.6, h.r * 2, h.r * 1.2); c.restore(); }
        }
        c.restore();
        AS.door(c, DOORX, G, 150, L.curve(doorK, t)[0], t);
      },
      actors: {
        k: { scale: 1, z: 2, beats: [[0, 'flyBack']], pos: [[0, DOORX + 4, 30]], face: [[0, -1]], weapon: [[0, false]],
          aura: [[0, 0.4], [REJ, 0.4], [PULSE, 1.2, 'out'], [9.4, 0.9]], glowK: [[0, 0.25], [REJ, 0.25], [PULSE, 1, 'out']],
          eyes: [[0, 1]], expr: [[0, 'hurt'], [1.2, 'intense'], [CUTK, 'hurt'], [4.2, 'angry'], [SWEEP, 'hurt'], [REJ + 0.4, 'intense']],
          post: (c, L) => {
            const t = L.D.c, J = L.joints('k');
            AS.bodyVeins(c, L, 'k', L.curve([[0, 0.5], [REJ, 0.5], [PULSE, 1.4, 'out']], t)[0], AS.ARMS, 11, 1.4);
            // The fragment pushing out of his chest as the pocket rejects it.
            const k = L.curve([[0, 0], [REJ, 0], [PULSE, 1, 'in'], [BREAK, 1.3]], t)[0];
            if (k > 0.01) { const x = J.shoulder.x * 0.7 + J.hip.x * 0.3, y = J.shoulder.y * 0.7 + J.hip.y * 0.3, gr = c.createRadialGradient(x, y, 1, x, y, 30 * k); gr.addColorStop(0, 'rgba(230,255,255,' + Math.min(1, k) + ')'); gr.addColorStop(0.3, 'rgba(0,212,255,' + 0.6 * Math.min(1, k) + ')'); gr.addColorStop(1, 'rgba(0,212,255,0)'); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.beginPath(); c.arc(x, y, 30 * k, 0, P * 2); c.fill(); }
          } },
        s: { scale: 1.08, z: 1, wAbs: true, wkey: [[0, AS.COUNTER.katana]], weapon: [[0, true]], beats: [[0, 'sovReady']], pos: [[0, DOORX + 6, 0]], face: [[0, 1]],
          aura: [[0, 0.7], [9.4, 0.5]], auraColor: red, eyes: [[0, 1]], eyeColor: red, expr: [[0, 'neutral']],
          hidden: [[0, true], [0.55, false]], alphaK: [[0, 0], [0.55, 0], [0.7, 1, 'out']],
          post: (c, L) => { const t = L.D.c; AS.wound(c, L, 's', 1); AS.reach(c, L, 's', L.curve([[0, 0.7], [REJ, 0.6], [PULSE, 0.25, 'io']], t)[0]); } },
      },
      cam: [[0, 520, 80, 2.0]],
      ev: [],
    });
    const a = L.actors, K = AS.kit(L), { kb, sb, kp, sp, karc, sfx, swish, whoosh, clash, hit } = K, ev = L.spec.ev;
    K.kf(0, -1); K.sf(0, 1);
    // In here a spark stays where a blow put it.
    const still = (x, y, n, col) => { for (let i = 0; i < n; i++) { const an = Math.random() * P * 2, d = 4 + Math.random() * 26; L.parts.push({ c: L.D.c, x: x + Math.cos(an) * d, y: y + Math.sin(an) * d, vx: Math.cos(an) * 0.05, vy: Math.sin(an) * 0.05, g: 0, life: 9999, r: 1.4 + Math.random(), col, kind: 'spark', spin: 0, floor: G + 2000 }); } };

    // ── 1. out of the door ──
    kb(0.08, 'flyBack', 'xout'); karc(0, DOORX + 4, 30, 0.5, 610, 0, 46); kb(0.5, 'skid', 'xout'); kb(0.9, 'kneel', 'io'); kp(0.75, 624, 0, 'out');
    ev.push([0.02, l => { l.sfx('portalOpen', 0.6, 0.45); }]); sfx(0.5, 'landHard', 0.7, 0.9); ev.push([0.5, l => l.dust(610, 6, 60, { a: 0.18, col: '#3a1010' })]);
    sp(0.55, DOORX + 6); K.SB.push(...AS.walk(0.6, 1.1, 0.25, null, 'sovWalkA', 'sovWalkB')); sp(1.1, 512, 0, 'lin'); sb(1.2, 'sovReady', 'io');
    ev.push([1.05, l => l.sfx('portalOpen', 0.35, 1.6)]); sfx(1.0, 'stingLow', 0.6, 0.55);
    kb(1.3, 'kneelLook', 'io', { headTilt: -16 }); kb(1.55, 'rising', 'io');
    const KW = [[0, 'katana']], KWON = [[0, false], [FORM, true]], KA = [[0, 0], [FORM, 0], [FORM + 0.3, 1, 'in']];
    ev.push([FORM, l => { l.manifest('k', cyan, 0.4); l.sfx('phaseUp', 0.6, 1); }]);
    kb(FORM + 0.15, 'guard', 'out');
    kb(2.22, 'runA', 'out'); kb(2.34, 'runB'); kp(2.2, 624); kp(2.45, 566, 0, 'in'); whoosh(2.24);
    kb(2.36, 'windBack', 'out', { rArm: -160, rFore: -140 }); kb(2.48, 'slashOut', 'xout', { rArm: -30, rFore: -22 }); swish(2.44);
    sb(2.3, 'sovBlock', 'out', { rFore: -84, rArm: 30 }); sb(2.48, 'sovBlock', 'io', { rFore: -84, rArm: 30 }); clash(2.48, 0.3, cyan);
    ev.push([2.52, l => { const x = AS.cross(l, 'k', 's', 2.52); still(x.x, x.y, 10, '#ffe9a0'); }]);
    kb(2.62, 'highGuard', 'out'); kb(2.78, 'cutDown', 'xout', { rArm: -10, rFore: 14, torso: 14 }); swish(2.72, 0.9);
    sb(2.64, 'blockHigh', 'out'); sb(2.78, 'blockHigh', 'io'); clash(2.78, 0.3, cyan);
    ev.push([2.82, l => { const x = AS.cross(l, 'k', 's', 2.82); still(x.x, x.y, 10, '#ffe9a0'); }]);

    // ── 2. he is at home ──
    sb(CUTK - 0.06, 'windBack', 'xout', { rArm: 150, rFore: 176 }); sb(CUTK, 'slashOut', 'xout', { rArm: -6, rFore: 6, torso: 20 }); swish(CUTK - 0.05, 0.9);
    ev.push([CUTK + 0.03, l => { const J = l.joints('k'), p = { x: J.shoulder.x * 0.7 + J.hip.x * 0.3, y: J.shoulder.y * 0.7 + J.hip.y * 0.3 }; AS.cutLine(l, p.x, p.y, 0.6, 18, red); l.sfx('hitSlash', 0.9, 0.9); l.shake(8); still(p.x, p.y, 8, '#ff8060'); }]);
    kb(CUTK + 0.04, 'hitBack', 'xout'); kp(CUTK, 566); kp(CUTK + 0.1, 576, 0, 'out');
    sb(PALM, 'sovPalm', 'xout'); hit(PALM, 's', 'lHand', 'k', 'chest', 'heavy', 9); kb(PALM + 0.05, 'headSnap', 'xout');
    sb(KICK, 'sovKick', 'xout'); hit(KICK, 's', 'lFoot', 'k', 'gut', 'heavy', 14); sp(CUTK, 512); sp(PALM, 554, 0, 'out'); sp(KICK, 562, 0, 'out');
    ev.push([KICK + 0.06, l => { const p = CA.point('k', 'gut', KICK + 0.06); still(p.x, p.y, 14, '#ffe9a0'); }]);
    kb(KICK + 0.06, 'flyBack', 'xout'); karc(KICK + 0.04, 590, 0, 3.66, 760, 0, 40); kb(3.66, 'skid', 'xout'); kb(3.95, 'kneel', 'io'); kp(3.85, 772, 0, 'out');
    sfx(3.66, 'landHard', 0.7, 1);
    a.s.trail = [[2.95, 3.3, 4, 0.02, 0.3]]; a.s.trailColor = red;
    sb(3.45, 'sovReady', 'io');
    // A spear off the rack.
    const SW = [[0, AS.COUNTER.katana]], SA = [[0, 1]];
    const pull = (t, wk) => { SA.push([t, 1], [t + 0.1, 0], [t + 0.2, 0], [t + 0.36, 1, 'in']); SW.push([t + 0.16, wk]); ev.push([t, l => AS.portal(l, 's', 0.5)]); };
    pull(3.9, 'spear');
    kb(4.25, 'rising', 'io'); kb(4.42, 'crouch', 'out'); kb(4.56, 'airHigh', 'out'); kb(AIR, 'airCut', 'xout'); karc(4.5, 772, 0, 5.0, 640, 0, 92); sfx(4.5, 'jump', 0.6, 1); swish(AIR - 0.06, 1);
    sp(4.3, 550); sp(4.7, 604, 0, 'out'); sb(4.6, 'sovReady', 'out', { rArm: 120, rFore: 150 }); sb(AIR, 'upperCut', 'xout'); clash(AIR, 0.3, cyan);
    sb(5.0, 'sovReady', 'io'); sb(SWEEP, 'sovSweep', 'xout', { rFore: 22 }); swish(SWEEP - 0.06, 0.8);
    kb(5.0, 'crouchLand', 'xout'); hit(SWEEP, 's', 'rHand', 'k', 'lFoot', 'heavy', 10);
    ev.push([SWEEP + 0.03, l => { l.disperse('k', cyan, 0.5); }]); KWON.push([SWEEP + 0.03, false]);
    kb(SWEEP + 0.06, 'flyBack', 'xout', { rot: -60 }); karc(SWEEP + 0.04, 640, 0, 5.5, 720, 0, 30); kb(5.5, 'fallen', 'xout'); kp(5.6, 722, 0, 'out');
    sfx(5.5, 'landHard', 0.8, 0.8);
    sb(5.3, 'sovReady', 'io');
    K.SB.push(...AS.walk(5.6, 6.2, 0.2, null, 'sovWalkA', 'sovWalkB')); sp(5.6, 604); sp(6.2, 676, 0, 'lin');
    pull(5.9, AS.COUNTER.katana);
    kb(5.9, 'pushUp', 'io', { headTilt: -20 }); kb(6.3, 'kneel', 'io', { headTilt: -20 });
    sb(6.3, 'sovRaise', 'out'); sfx(6.3, 'iaiMark', 0.6, 0.8);

    // ── 3. the pocket will not hold it ──
    sfx(REJ, 'hitZap', 0.5, 0.5); sfx(REJ + 0.1, 'stingRise', 0.6, 0.8);
    for (let i = 0; i < 6; i++) sfx(REJ + 0.15 + i * 0.13, 'hitSnap', 0.35, 0.7 + i * 0.08);
    sb(6.75, 'sovRaise', 'io', { headTilt: 18 }); sb(7.1, 'sovRaise', 'io', { headTilt: 26, torso: -2 });
    kb(6.9, 'rising', 'io', { headTilt: -6 }); kb(PULSE, 'pulseOpen', 'xout'); kp(6.9, 722);
    ev.push([PULSE, l => { l.sfx('stingImpact', 1, 0.7); l.sfx('explosion', 0.5, 1.2); l.shake(16); l.flash('#00d4ff', 0.12, 10); const J = l.joints('k'); l.ring(J.hip.x, J.hip.y - 20, 300, { col: cyan, w: 4, life: 28 }); }]);
    sb(PULSE + 0.1, 'sovRaise', 'io', { headTilt: 10, torso: -8 }); sb(7.9, 'sovRaise', 'io', { headTilt: 30 });
    kb(7.7, 'pulseOpen', 'io', { headTilt: 10 });
    ev.push([BREAK, l => { l.sfx('explosion', 0.9, 0.6); l.sfx('clang', 0.7, 0.5); l.sfx('hitSnap', 1, 0.6); l.shake(24); l.impact(2, { tint: '#bfefff' }); }]);
    // Down: both out of the bottom of it.
    kb(BREAK + 0.1, 'airHigh', 'out', { rot: 20 }); karc(BREAK, 722, 0, 9.4, 760, -520, 0); kb(9.2, 'tuck', 'io', { rot: 60 });
    sb(BREAK + 0.15, 'sovReady', 'out', { rLeg: 90, lLeg: 70, rShin: 100, lShin: 90 }); K.SP.push(...CA.arc(BREAK + 0.05, 676, 0, 9.4, 690, -480, 0, 14));
    a.k.below = [BREAK, 99]; a.s.below = [BREAK, 99];
    a.k.wkey = KW; a.k.weapon = KWON; a.k.wAlphaK = KA; a.s.wkey = SW; a.s.wAlphaK = SA;
    a.k.trail = [[0, 0.5, 3, 0.03, 0.2], [2.2, 2.9, 10, 0.03, 0.18], [4.5, 5.0, 10, 0.03, 0.16]]; a.k.trailColor = cyan;
    K.finish();
    K.solveClash(AIR, 's', 90); K.solveClash(2.78, 's', 40);
    CA.blows(L, K.blows);
    L.spec.speed = CA.hitch(K.stops.sort((p, r) => p[0] - r[0]));
    L.spec.fade = [[0, 0], [9.0, 0], [9.4, 1, 'in']];
    L.spec.cam = [
      [0, 520, 70, 2.0, 'hold'], [0.6, 560, 74, 1.9, 'sine'],
      // The room he keeps.
      [1.2, 600, 130, 1.25, 'sine'], [1.9, 590, 110, 1.4, 'sine'],
      ...CA.follow(L, 'k', 's', 2.0, 6.2, { zMax: 2.4, zMin: 1.6, lift: 18, cut: false }),
      // It runs out from him.
      [REJ, 700, 90, 2.0, 'sine'], [PULSE, 700, 120, 1.4, 'sine'], [BREAK, 700, 110, 1.35, 'sine'],
      [8.6, 720, -150, 1.5, 'sine'], [9.4, 730, -420, 1.6, 'sine'],
    ];
  },
  tick: function (H) { FILM.tick(H); },
};
