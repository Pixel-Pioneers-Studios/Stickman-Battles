'use strict';
// Out of the bottom of the pocket and into the sky over the city at night, falling between the towers (film 1's city).
// Everything is authored in a frame that falls (spec.fall), so the fight keeps its spacing while the city goes up past it.
//   1. Out of the tear, tumbling. Kael rights himself, forms the katana, and steps off his own light (a cyan disc).
//   2. Down at him: a clash; his hand on the wrist; Kael's knee breaks it. Kael's thrown crescent: cut in half.
//   3. A step of light behind him and the cut goes in, through him. He turns in the air and looks at it. It does not finish.
//   4. His elbow, his kick; the katana goes to light. He takes Kael by the collar and they go down together into the roof.
module.exports = {
  arena: 'city', frames: 650, endC: 7.4,
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    AS.stage(); CR.veins = [];
    const red = AS.red, cyan = AS.cyan;
    const FORM = 0.9, STEP = 1.3, CL = 1.55, GRAB = 1.8, KNEE = 2.02, CRES = 2.6, BLINK = 3.32, STAB = 3.42, ELB = 4.55, KICK = 4.72, COLLAR = 5.25, ROOF = 6.7;
    // How far the frame has fallen: picking up speed, then terminal.
    const FALL = [[0, 0], [1.0, 160, 'in'], [ROOF, 2400, 'lin']];
    const ROOFY = G + 2380;
    // The tear they came out of, left above.
    const tearY = G - 260;
    L.setup(H, {
      tempo: 1, vignette: 0.55, plant: false, fall: FALL,
      backdrop: (c, L) => {
        const t = L.D.c;
        L.paintCity(c, { street: ROOFY, left: 540, right: 1010, leftTop: G + 700, rightTop: G + 980, rain: true, rainStretch: 24, rainRise: -L.curve(FALL, t)[0] * 0.6 });
        // The roof coming up: the Lab's, a dark slab across the alley with a lit hatch.
        c.fillStyle = '#15151f'; c.fillRect(300, ROOFY, 1000, 400); c.fillStyle = 'rgba(0,212,255,0.25)'; c.fillRect(760, ROOFY, 110, 2);
        // The tear: a ragged cyan line in the sky with the red dark showing through.
        const k = Math.max(0, 1 - Math.max(0, t - 1.2) / 1.5);
        if (k > 0.01) {
          c.save(); c.globalAlpha = k; c.fillStyle = '#1a0302'; c.beginPath(); const r = CA.srand(4);
          c.moveTo(560, tearY); for (let i = 0; i <= 12; i++) c.lineTo(560 + i * 34, tearY - 6 - r() * 16); for (let i = 12; i >= 0; i--) c.lineTo(560 + i * 34, tearY + 6 + r() * 14); c.closePath(); c.fill();
          c.globalCompositeOperation = 'lighter'; c.strokeStyle = cyan; c.shadowColor = cyan; c.shadowBlur = 14; c.lineWidth = 2; c.stroke(); c.restore();
        }
      },
      actors: {
        k: { scale: 1, z: 2, beats: [[0, 'tuck', 'io', { rot: 120 }]], pos: [[0, 760, 230]], face: [[0, -1]], weapon: [[0, false]],
          aura: [[0, 0.9], [ELB, 0.9], [KICK, 0.5]], glowK: [[0, 0.6], [KICK, 0.3]], eyes: [[0, 1]],
          expr: [[0, 'hurt'], [0.7, 'intense'], [GRAB, 'angry'], [STAB, 'angry'], [ELB, 'hurt']],
          post: (c, L) => AS.bodyVeins(c, L, 'k', L.curve([[0, 1], [ELB, 1], [KICK + 0.3, 0.5]], L.D.c)[0], AS.ARMS, 11, 1.4) },
        s: { scale: 1.08, z: 1, wAbs: true, wkey: [[0, AS.COUNTER.katana]], weapon: [[0, true]], beats: [[0, 'sovReady', 'io', { rLeg: 92, lLeg: 70, lShin: 96 }]], pos: [[0, 690, 250]], face: [[0, 1]],
          aura: [[0, 0.6]], auraColor: red, eyes: [[0, 1]], eyeColor: red, expr: [[0, 'neutral']],
          post: (c, L) => { const t = L.D.c; AS.wound(c, L, 's', 1); AS.wound(c, L, 's', L.curve([[0, 0], [STAB + 0.02, 0], [STAB + 0.06, 1]], t)[0], red, 0.15, 0.3); AS.reach(c, L, 's', 0.5); } },
      },
      cam: [[0, 730, 320, 1.3]],
      ev: [],
    });
    const a = L.actors, K = AS.kit(L), { kb, sb, kp, sp, sfx, swish, whoosh, clash, hit } = K, ev = L.spec.ev;
    K.kf(0, -1); K.sf(0, 1);
    const AIRLEG = { rLeg: 92, lLeg: 70, rShin: 104, lShin: 96 };
    // Wind the whole way down.
    for (let t = 0.2; t < ROOF; t += 1.4) sfx(t, 'swing', 0.25, 0.45);
    ev.push([0.02, l => { l.sfx('hitSnap', 0.8, 0.5); l.sfx('explosion', 0.4, 0.6); }]);

    // ── 1. out of the tear ──
    kb(0.3, 'tuck', 'lin', { rot: 250 }); kb(0.62, 'airHigh', 'out', { rot: 350 }); kb(0.7, 'airHigh', 'io'); kp(0.7, 790, 250, 'out');
    sb(0.5, 'sovReady', 'io', AIRLEG); sp(0.7, 690, 270, 'io');
    const KW = [[0, 'katana']], KWON = [[0, false], [FORM, true]], KA = [[0, 0], [FORM, 0], [FORM + 0.3, 1, 'in']];
    ev.push([FORM, l => { l.manifest('k', cyan, 0.4); l.sfx('phaseUp', 0.6, 1); }]);
    kb(FORM + 0.1, 'guard', 'io', AIRLEG); kb(1.18, 'crouch', 'out');
    // His own light under his foot, for one step.
    ev.push([STEP - 0.02, l => { const J = l.joints('k'); l.ring(J.lFoot.x, J.lFoot.y + 2, 26, { sq: 0.25, col: cyan, w: 3, life: 14 }); l.sfx('hitZap', 0.5, 1.3); l.sfx('jump', 0.5, 1); }]);
    kb(STEP, 'airHigh', 'out'); kb(CL, 'airCut', 'xout'); kp(STEP, 790, 250); kp(CL, 730, 270, 'out'); swish(CL - 0.05);
    sb(1.38, 'blockHigh', 'out', AIRLEG); sb(CL, 'blockHigh', 'io', AIRLEG); clash(CL, 0.3, cyan); sp(CL, 690, 268);
    // His hand on the wrist; the knee.
    sb(GRAB, 'sovCatch', 'xout', { lArm: -20, lFore: -40, lArmLen: 1.1 }); K.blows.push({ t: GRAB, by: 's', with: 'lHand', on: 'k', at: 'rHand', kind: 'catch', range: 90, lead: 0.02 });
    kb(GRAB, 'airCut', 'io'); kp(GRAB, 722, 262); kp(KNEE, 702, 266, 'out'); kp(2.12, 706, 264); sfx(GRAB + 0.02, 'hitBlunt', 0.8, 0.8);
    kb(KNEE, 'kneeUp', 'xout', { rArm: -10, rFore: -10 }); hit(KNEE, 'k', 'lKnee', 's', 'gut', 'heavy', 10, cyan);
    sb(KNEE + 0.06, 'headSnap', 'xout', AIRLEG); sp(KNEE + 0.06, 690, 268); sp(2.4, 640, 290, 'out'); sb(2.4, 'sovReady', 'io', AIRLEG);
    kb(2.2, 'airHigh', 'io'); kp(2.3, 800, 240, 'out');
    // The crescent: thrown, and cut in two.
    kb(2.45, 'windBack', 'out'); kb(CRES, 'slashOut', 'xout'); swish(CRES - 0.05, 0.9);
    let cres = null;
    ev.push([CRES, l => { const J = l.joints('k'); cres = { x0: J.rHand.x, y0: J.rHand.y, c0: l.D.c }; l.sfx('hitZap', 0.7, 0.9); l.sfx('swingHeavy', 0.6, 0.6); }]);
    L.add({ t: 'draw', life: 99999, fn: c => {
      if (!cres) return; const t = L.D.c, u = (t - cres.c0) / 0.32; if (u < 0 || u > 1.6) return;
      const S = L.joints('s'), x = cres.x0 + (S.hip.x + 10 - cres.x0) * Math.min(1, u), y = cres.y0 + (S.shoulder.y - cres.y0) * Math.min(1, u);
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = cyan; c.shadowColor = cyan; c.shadowBlur = 18; c.lineCap = 'round';
      if (u <= 1) { c.lineWidth = 5; c.beginPath(); c.ellipse(x, y, 16, 30, 0, -P / 2, P / 2, true); c.stroke(); }
      else { const v = u - 1; c.globalAlpha = 1 - v / 0.6; c.lineWidth = 4; c.beginPath(); c.ellipse(x - 10 - v * 60, y - 14 - v * 80, 16, 15, 0, -P / 2, 0, true); c.stroke(); c.beginPath(); c.ellipse(x - 10 - v * 60, y + 14 + v * 80, 16, 15, 0, 0, P / 2, true); c.stroke(); }
      c.restore();
    } });
    sb(2.78, 'sovReady', 'out', { rArm: -60, rFore: -100, ...AIRLEG }); sb(CRES + 0.32, 'slashOut', 'xout', { rArm: 40, rFore: 60, torso: 10 }); swish(CRES + 0.28, 1.2);
    ev.push([CRES + 0.33, l => { l.sfx('clang', 0.6, 1.5); l.shake(5); }]);
    sb(3.1, 'sovReady', 'io', AIRLEG);

    // ── 3. a step of light, behind him; through ──
    kb(3.1, 'crouch', 'out'); kp(3.1, 800, 240);
    ev.push([BLINK, l => { l.sfx('portalOpen', 0.5, 1.6); l.ring(800, l.G - 260 + l.curve(FALL, BLINK)[0] - 0, 30, { col: cyan, w: 2, life: 10 }); }]);
    kp(BLINK - 0.01, 800, 240); kp(BLINK, 600, 268, 'lin'); K.kf(BLINK, 1); a.k.blinks = [BLINK];
    kb(BLINK, 'thrust', 'xout', { rArm: 0, rFore: 0 }); kb(STAB, 'thrust', 'io', { rArm: 0, rFore: 0, torso: 40 }); kp(STAB, 620, 268, 'xout');
    K.stops.push([STAB + 0.01, 0.12, 0.3]);
    ev.push([STAB + 0.02, l => { const p = CA.point('s', 'chest', STAB + 0.02); l.sfx('hitPierce', 1, 0.7); l.sfx('stingImpact', 0.8, 0.6); l.shake(14); l.impact(1, { tint: '#bfefff' }); l.debris(p.x, p.y, 12, { kind: 'spark', col: '#ff8060', v: 3, r: 1.5, g: 0, spread: 120, dir: 0, life: 24 }); }]);
    sb(STAB + 0.04, 'sovTakeFold', 'xout', AIRLEG); sb(3.9, 'sovLook', 'io', { headTilt: 30, ...AIRLEG }); sb(4.25, 'sovLook', 'io', { headTilt: 24, ...AIRLEG });
    // He turns round on it, looking down at the wound; then at Kael.
    K.sf(4.0, -1); a.s.pivot = 0.12; sp(4.0, 690, 268);
    sfx(3.9, 'stingLow', 0.5, 0.6);
    kb(3.9, 'thrust', 'io', { rArm: 4, rFore: 4, torso: 20 }); kp(4.1, 616, 268);
    // ── 4. down ──
    sb(4.4, 'sovReady', 'out', AIRLEG); sb(ELB, 'elbow', 'xout', { ...AIRLEG }); hit(ELB, 's', 'lElbow', 'k', 'chest', 'heavy', 10);
    kb(ELB + 0.05, 'headSnap', 'xout'); kp(ELB, 616, 268); sp(ELB, 634, 262, 'out');
    sb(KICK, 'sovKick', 'xout'); hit(KICK, 's', 'lFoot', 'k', 'gut', 'heavy', 14);
    ev.push([KICK + 0.03, l => { l.disperse('k', cyan, 0.5); }]); KWON.push([KICK + 0.03, false]);
    kb(KICK + 0.05, 'flyBack', 'xout'); kp(KICK, 614, 268); kp(5.1, 560, 300, 'out'); sp(KICK, 646, 268);
    // His hand in the collar; the reach in him; down, fast, together.
    sp(5.1, 590, 290, 'out'); sb(COLLAR, 'sovCatch', 'xout', { lArm: -10, lFore: -10, lArmLen: 1.05 });
    K.blows.push({ t: COLLAR, by: 's', with: 'lHand', on: 'k', at: 'neck', kind: 'catch', range: 90, lead: 0.02 }); sfx(COLLAR, 'hitBlunt', 0.9, 0.7);
    kb(COLLAR, 'heldUp', 'out', { rot: 30 }); kp(COLLAR, 556, 300);
    sb(5.6, 'sovCatch', 'io', { lArm: 70, lFore: 80, lArmLen: 1.05, torso: 20, rLeg: 120, lLeg: 60 }); kb(5.6, 'heldUp', 'io', { rot: 80 });
    sp(5.6, 600, 240, 'io'); kp(5.6, 590, 210, 'io');
    sb(ROOF, 'sovCatch', 'io', { lArm: 80, lFore: 86, torso: 26 }); kb(ROOF, 'fallen', 'io', { rot: -88 });
    sp(ROOF, 610, 60, 'in'); kp(ROOF, 610, 40, 'in');
    ev.push([5.6, l => { l.lines(66, { dir: -90, col: '#ffd0c0', n: 50 }); l.sfx('stingRise', 0.7, 0.7); }]);
    ev.push([ROOF, l => { l.sfx('explosion', 1, 0.5); l.sfx('landHard', 1.1, 0.5); l.sfx('heavyHit', 1, 0.45); l.shake(30); l.impact(3, { tint: '#ffb0a0' }); }]);
    a.k.wkey = KW; a.k.weapon = KWON; a.k.wAlphaK = KA;
    a.k.trail = [[STEP, CL + 0.1, 4, 0.03, 0.22], [BLINK, STAB + 0.1, 5, 0.02, 0.3], [KICK, 5.1, 3, 0.03, 0.2]]; a.k.trailColor = cyan;
    a.s.trail = [[5.3, ROOF, 4, 0.03, 0.2]]; a.s.trailColor = red;
    K.finish();
    K.solveClash(CL, 's', 50);
    CA.blows(L, K.blows);
    L.spec.speed = CA.hitch(K.stops.sort((p, r) => p[0] - r[0]));
    L.spec.fade = [[0, 0], [ROOF, 0], [ROOF + 0.02, 1]];
    L.spec.cam = [
      [0, 730, 320, 1.3], [0.8, 740, 320, 1.7, 'sine'],
      [1.5, 740, 320, 2.1, 'sine'], [2.3, 720, 330, 2.0, 'sine'], [3.0, 740, 330, 1.8, 'sine'],
      [3.45, 650, 330, 2.4, 'sine'], [4.3, 660, 340, 2.6, 'sine'],
      [4.8, 630, 340, 2.1, 'sine'], [5.6, 600, 310, 1.7, 'sine'],
      // Out wide as the roof comes up at them.
      [6.2, 620, 200, 1.15, 'sine'], [ROOF, 620, 160, 1.2, 'sine'], [7.4, 620, 160, 1.2],
    ];
  },
  tick: function (H) { FILM.tick(H); },
};
