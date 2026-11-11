'use strict';
// "Lightning vs Fire": a hand-keyed stick-fight Short in the style of frame-by-frame stickman animation.
// Not game footage: the figures are the game's own rig (FigureRig.solve, black body + neon outline), but every
// pose, the camera, the effects and the timing are authored here, shot by shot. Rendered by anim-render.js.
//
// Timing is authored in 30 fps "beats" (B) and drawn at 60 fps. Bodies update on twos (every 2nd beat = 15
// poses a second, the hand-animated cadence); the camera, effects and debris run on ones.
(function () {
  const W = 1080, H = 1920, GROUND = 1500, S = 5.0;
  const PI = Math.PI, D = d => d * PI / 180;
  const cvs = document.getElementById('c'), ctx = cvs.getContext('2d');

  // ── seeded noise ──
  function rnd(seed) { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

  // ── poses (degrees, facing right; the rig mirrors) ──
  const BASE = { spine: -90, headTilt: 0, upperArmF: 73, foreArmF: 81, upperArmB: 109, foreArmB: 101,
    thighF: 82, shinF: 94, thighB: 99, shinB: 87, rootY: 0, rootX: 0, rootRot: 0, squash: 0, lean: 0 };
  const ANG = ['spine', 'headTilt', 'upperArmF', 'foreArmF', 'upperArmB', 'foreArmB', 'thighF', 'shinF', 'thighB', 'shinB', 'rootRot'];
  const P = o => Object.assign({}, BASE, o);
  const POSE = {
    guard:     P({ spine: -82, thighF: 52, shinF: 100, thighB: 122, shinB: 96, rootY: 7, upperArmF: 25, foreArmF: -15, upperArmB: 55, foreArmB: -8, lean: 2, wpn: -50 }),
    clash:     P({ spine: -76, lean: 3, thighF: 36, shinF: 96, thighB: 138, shinB: 146, rootY: 9, upperArmF: -8, foreArmF: -32, upperArmB: 8, foreArmB: -26, headTilt: 0.15, wpn: -62 }),
    shove:     P({ spine: -58, lean: 10, thighF: 30, shinF: 92, thighB: 142, shinB: 150, rootY: 8, upperArmF: -2, foreArmF: -8, upperArmB: 4, foreArmB: -6, wpn: -80 }),
    recoil:    P({ spine: -112, thighF: 68, shinF: 84, thighB: 118, shinB: 104, rootY: 4, upperArmF: 48, foreArmF: 6, upperArmB: 120, foreArmB: 150, headTilt: -0.25, wpn: -18 }),
    axeRaise:  P({ spine: -104, thighF: 58, shinF: 96, thighB: 122, shinB: 92, rootY: 4, upperArmF: -118, foreArmF: -150, upperArmB: -110, foreArmB: -142, headTilt: -0.2, wpn: -165 }),
    axeSlam:   P({ spine: -34, lean: 12, thighF: 40, shinF: 100, thighB: 134, shinB: 116, rootY: 26, upperArmF: 30, foreArmF: 38, upperArmB: 36, foreArmB: 42, headTilt: 0.3, wpn: 10 }),
    crouch:    P({ spine: -66, thighF: 12, shinF: 118, thighB: 150, shinB: 72, rootY: 30, upperArmF: 70, foreArmF: 30, upperArmB: 140, foreArmB: 160, headTilt: 0.2, wpn: 175 }),
    leap:      P({ spine: -84, thighF: 40, shinF: 140, thighB: 150, shinB: 120, rootY: -6, upperArmF: -40, foreArmF: -70, upperArmB: 160, foreArmB: 190, wpn: -110 }),
    tuck:      P({ spine: -70, thighF: -10, shinF: 110, thighB: 10, shinB: 130, rootY: -4, upperArmF: 30, foreArmF: -40, upperArmB: 60, foreArmB: 20, headTilt: 0.4, wpn: 160 }),
    land:      P({ spine: -60, thighF: 18, shinF: 112, thighB: 160, shinB: 70, rootY: 34, upperArmF: 10, foreArmF: -20, upperArmB: 170, foreArmB: 200, headTilt: 0.15, wpn: 10 }),
    windThrow: P({ spine: -110, thighF: 48, shinF: 98, thighB: 128, shinB: 96, rootY: 6, upperArmF: -150, foreArmF: -175, upperArmB: 70, foreArmB: 40, headTilt: -0.15, wpn: 150 }),
    thrown:    P({ spine: -62, lean: 8, thighF: 34, shinF: 96, thighB: 140, shinB: 150, rootY: 10, upperArmF: -4, foreArmF: -6, upperArmB: 120, foreArmB: 150, headTilt: 0.1 }),
    block:     P({ spine: -86, thighF: 58, shinF: 100, thighB: 124, shinB: 98, rootY: 9, upperArmF: -10, foreArmF: -82, upperArmB: 40, foreArmB: -60, wpn: -8 }),
    catch:     P({ spine: -88, thighF: 60, shinF: 96, thighB: 120, shinB: 92, rootY: 5, upperArmF: -70, foreArmF: -100, upperArmB: 100, foreArmB: 120, wpn: -100 }),
    iaido:     P({ spine: -58, thighF: 20, shinF: 112, thighB: 118, shinB: 172, rootY: 34, upperArmF: 66, foreArmF: 150, upperArmB: 80, foreArmB: 150, headTilt: 0.12, lean: 3, wpn: 172 }),
    charge:    P({ spine: -60, lean: 9, thighF: 22, shinF: 96, thighB: 150, shinB: 160, rootY: 12, upperArmF: -130, foreArmF: -160, upperArmB: -120, foreArmB: -150, headTilt: 0.1, wpn: -170 }),
    swingMiss: P({ spine: -34, lean: 12, thighF: 30, shinF: 98, thighB: 144, shinB: 150, rootY: 20, upperArmF: 58, foreArmF: 80, upperArmB: 62, foreArmB: 84, headTilt: 0.35, wpn: 95 }),
    followThru:P({ spine: -48, lean: 6, thighF: 16, shinF: 98, thighB: 166, shinB: 176, rootY: 34, upperArmF: 2, foreArmF: -4, upperArmB: 150, foreArmB: 160, headTilt: 0.05, wpn: 4 }),
    kneel:     P({ spine: -56, thighF: 24, shinF: 96, thighB: 96, shinB: 176, rootY: 40, upperArmF: 84, foreArmF: 92, upperArmB: 100, foreArmB: 96, headTilt: 0.55 }),
    sheatheIn: P({ spine: -88, thighF: 74, shinF: 94, thighB: 106, shinB: 88, rootY: 1, upperArmF: 88, foreArmF: 150, upperArmB: 100, foreArmB: 150, headTilt: 0.05, wpn: 118 }),
    sheathed:  P({ spine: -90, thighF: 76, shinF: 92, thighB: 104, shinB: 88, upperArmF: 84, foreArmF: 96, upperArmB: 104, foreArmB: 100, headTilt: 0.1 }),
    slump:     P({ spine: -24, thighF: 20, shinF: 96, thighB: 92, shinB: 176, rootY: 52, upperArmF: 100, foreArmF: 104, upperArmB: 96, foreArmB: 100, headTilt: 0.9, lean: 4 }),
    fallen:    P({ spine: -10, thighF: 20, shinF: 40, thighB: 40, shinB: 70, rootY: 60, upperArmF: 60, foreArmF: 20, upperArmB: 120, foreArmB: 160, headTilt: 0.4, rootRot: 6 }),
    rise:      P({ spine: -84, thighF: 66, shinF: 96, thighB: 112, shinB: 92, rootY: 4, upperArmF: 60, foreArmF: 120, upperArmB: 104, foreArmB: 98, wpn: 150 }),
    sheathe:   P({ spine: -88, thighF: 74, shinF: 94, thighB: 106, shinB: 88, rootY: 1, upperArmF: 70, foreArmF: 168, upperArmB: 100, foreArmB: 150, headTilt: 0.05, wpn: 178 }),
  };

  // ── keys: [beat, pose, x, airY, face, ease, extra] ──
  const B = 2;   // frames per beat (render is 60 fps)
  const K = (b, pose, x, y, face, ease, ex) => Object.assign({ f: b * B, pose, x, y: y || 0, face, ease: ease || 'cubic.out' }, ex || {});
  const KAEL = { color: '#3fd2ff', weapon: 'katana', keys: [
    K(0, 'clash', 400, 0, 1), K(14, 'clash', 406, 0, 1),
    K(18, 'recoil', 410, 0, 1, 'expo.out'), K(28, 'recoil', 340, 0, 1, 'cubic.out'),
    K(34, 'guard', 360, 0, 1), K(42, 'crouch', 360, 0, 1, 'cubic.out'),
    K(47, 'leap', 352, -150, 1, 'expo.out'), K(52, 'tuck', 336, -330, 1, 'sine.out', { rot: -150 }),
    K(58, 'tuck', 266, -320, 1, 'sine.inOut', { rot: -330 }), K(62, 'leap', 256, -180, 1, 'sine.in', { rot: -360 }),
    K(66, 'land', 250, 0, 1, 'expo.out', { rot: -360 }), K(72, 'land', 250, 0, 1, 'none', { rot: -360 }),
    K(78, 'guard', 250, 0, 1, 'cubic.out', { rot: -360 }), K(96, 'guard', 250, 0, 1, 'none', { rot: -360 }),
    K(100, 'block', 252, 0, 1, 'expo.out', { rot: -360 }), K(106, 'block', 246, 0, 1, 'none', { rot: -360 }),
    K(112, 'recoil', 230, 0, 1, 'expo.out', { rot: -360 }), K(120, 'guard', 250, 0, 1, 'cubic.out', { rot: -360 }),
    K(128, 'iaido', 270, 0, 1, 'cubic.inOut', { rot: -360 }), K(160, 'iaido', 272, 0, 1, 'none', { rot: -360 }),
    // the dash: gone from here, there (afterimages drawn by the FX)
    K(161, 'followThru', 812, 0, 1, 'none', { rot: -360 }), K(196, 'followThru', 812, 0, 1, 'none', { rot: -360 }),
    K(206, 'rise', 812, 0, 1, 'cubic.inOut', { rot: -360 }), K(222, 'sheathe', 812, 0, 1, 'cubic.inOut', { rot: -360 }),
    K(249, 'sheatheIn', 812, 0, 1, 'cubic.in', { rot: -360 }), K(250, 'sheathed', 812, 0, 1, 'none', { rot: -360, noWeapon: true }),
    K(276, 'sheathed', 812, 0, 1, 'none', { rot: -360, noWeapon: true }),
  ] };
  const VAREK = { color: '#ff4a3a', weapon: 'axe', keys: [
    K(0, 'clash', 690, 0, -1), K(14, 'clash', 684, 0, -1),
    K(18, 'shove', 590, 0, -1, 'expo.out'), K(24, 'guard', 600, 0, -1),
    K(30, 'axeRaise', 610, 0, -1, 'cubic.out'), K(42, 'axeRaise', 612, 0, -1, 'none'),
    K(45, 'axeSlam', 598, 0, -1, 'expo.in'), K(64, 'axeSlam', 598, 0, -1, 'none'),
    K(72, 'guard', 610, 0, -1, 'cubic.out'), K(80, 'windThrow', 618, 0, -1, 'cubic.out'), K(86, 'windThrow', 620, 0, -1, 'none'),
    K(89, 'thrown', 600, 0, -1, 'expo.in', { noWeapon: true }), K(108, 'thrown', 600, 0, -1, 'none', { noWeapon: true }),
    K(112, 'catch', 610, 0, -1, 'expo.out'), K(124, 'guard', 610, 0, -1, 'cubic.out'),
    K(140, 'charge', 610, 0, -1, 'cubic.inOut'), K(150, 'charge', 580, 0, -1, 'sine.in'), K(160, 'charge', 545, 0, -1, 'linear'),
    K(166, 'swingMiss', 520, 0, -1, 'expo.in'), K(186, 'swingMiss', 516, 0, -1, 'none'),
    K(190, 'kneel', 520, 0, -1, 'expo.out', { broken: true }), K(222, 'kneel', 520, 0, -1, 'none', { broken: true }),
    K(250, 'kneel', 520, 0, -1, 'none', { broken: true }), K(256, 'slump', 516, 0, -1, 'expo.in', { broken: true }), K(268, 'slump', 516, 0, -1, 'none', { broken: true }),
  ] };

  // ── camera keys [beat, cx, cy, zoom, ease] ──
  const CAM = [
    [0, 545, GROUND - 270, 2.05], [14, 541, GROUND - 250, 2.12],
    [18, 500, GROUND - 270, 1.59, 'expo.out'], [40, 470, GROUND - 300, 1.39],
    [52, 440, GROUND - 420, 1.25, 'sine.inOut'], [66, 440, GROUND - 290, 1.42, 'cubic.out'],
    [86, 470, GROUND - 280, 1.39], [100, 360, GROUND - 270, 1.78, 'expo.out'], [112, 420, GROUND - 280, 1.46, 'cubic.out'],
    [128, 360, GROUND - 260, 1.65, 'cubic.inOut'], [160, 340, GROUND - 230, 2.31, 'sine.in'],
    [161, 620, GROUND - 280, 1.32, 'none'], [186, 620, GROUND - 280, 1.32], [190, 600, GROUND - 270, 1.48, 'expo.out'],
    [222, 640, GROUND - 270, 1.32, 'sine.inOut'], [260, 640, GROUND - 300, 1.19, 'sine.inOut'],
  ];
  const SHAKES = [[1, 6, 12], [18, 12, 10], [45, 26, 22], [66, 10, 10], [100, 20, 16], [161, 14, 14], [188, 30, 26], [256, 10, 12]].map(s => ({ f: s[0] * B, amt: s[1], dur: s[2] * B }));
  const IMPACT = [[100, 2], [188, 3]].map(s => ({ f: s[0] * B, len: s[1] * B }));   // impact frames (beats)
  // Sound cues (frame, wav key, gain, rate) for anim-render.js.
  window.__SFX = [[0, 'clang', 1], [3, 'parry', 0.7], [18, 'hitBlunt', 0.8], [30, 'flame', 0.8], [45, 'explosion', 1], [46, 'flame', 1],
    [47, 'jump', 0.6], [66, 'landHard', 0.8], [89, 'flame', 0.9], [100, 'clang', 1.1], [100, 'stingImpact', 0.6], [112, 'jump', 0.4],
    [128, 'hitZap', 0.5], [140, 'hitZap', 0.6], [150, 'stingRise', 0.7], [161, 'iaiMark', 1.2], [161, 'hitZap', 0.9],
    [188, 'hitSlash', 1.1], [188, 'heavyHit', 1], [190, 'explosion', 0.6], [256, 'landHard', 0.6], [250, 'iaiSheathe', 1.1]]
    .map(s => ({ f: s[0] * B, k: s[1], g: s[2], r: 1, pan: 0 }));
  window.__FRAMES = 276 * B;
  window.__MARKS = { slam: 45 * B, block: 100 * B, dash: 161 * B, cut: 188 * B, sheathe: 250 * B };

  // ── sampling ──
  const ease = (n, p) => (typeof FigureRig !== 'undefined' ? FigureRig.ease(n, p) : p);
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sampleKeys(keys, f) {
    let i = 0; while (i < keys.length - 1 && keys[i + 1].f <= f) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    if (a === b || f <= a.f) return { a, b: a, t: 0 };
    return { a, b, t: ease(b.ease, Math.min(1, (f - a.f) / (b.f - a.f))) };
  }
  function actorAt(A, f) {
    const s = sampleKeys(A.keys, f), pa = POSE[s.a.pose], pb = POSE[s.b.pose];
    const pose = {};
    for (const k in BASE) {
      const v = lerp(pa[k], pb[k], s.t);
      pose[k] = ANG.indexOf(k) >= 0 && k !== 'headTilt' ? D(v) : v;
    }
    pose.rootRot = D(lerp(s.a.rot || 0, s.b.rot || 0, s.t));
    const wa = pa.wpn === undefined ? 90 : pa.wpn, wb = pb.wpn === undefined ? 90 : pb.wpn;
    return { pose, x: lerp(s.a.x, s.b.x, s.t), y: lerp(s.a.y, s.b.y, s.t), face: s.a.face, wpn: D(lerp(wa, wb, s.t)),
      noWeapon: s.t < 0.5 ? s.a.noWeapon : s.b.noWeapon, broken: s.a.broken || s.b.broken };
  }
  function camAt(f) {
    let i = 0; while (i < CAM.length - 1 && CAM[i + 1][0] * B <= f) i++;
    const a = CAM[i], b = CAM[Math.min(i + 1, CAM.length - 1)];
    const t = a === b ? 0 : ease(b[4] || 'sine.inOut', Math.min(1, (f - a[0] * B) / ((b[0] - a[0]) * B || 1)));
    let cx = lerp(a[1], b[1], t), cy = lerp(a[2], b[2], t), z = lerp(a[3], b[3], t);
    for (const s of SHAKES) {
      const age = f - s.f; if (age < 0 || age > s.dur) continue;
      const k = 1 - age / s.dur;
      cx += (rnd(f * 3.1) - 0.5) * 2 * s.amt * k; cy += (rnd(f * 7.7) - 0.5) * 2 * s.amt * k;
    }
    return { cx, cy, z };
  }

  // ── drawing ──
  function limb(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
  function drawFigure(A, st, opts) {
    opts = opts || {};
    const J = FigureRig.solve(st.pose, st.x, GROUND + st.y, S, st.face);
    const col = opts.silhouette ? '#000' : A.color;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    const parts = [
      [J.shoulder, J.elbowB, J.handB, 0.55], [J.hip, J.kneeB, J.footB, 0.55],
      [J.hip, J.chest], [J.hip, J.kneeF, J.footF], [J.shoulder, J.elbowF, J.handF],
    ];
    for (const pass of [0, 1]) {
      for (const p of parts) {
        const back = typeof p[p.length - 1] === 'number';
        const pts = back ? p.slice(0, -1) : p;
        if (pass === 0) {
          if (opts.silhouette) continue;
          ctx.strokeStyle = col; ctx.lineWidth = 4.6 * S; ctx.shadowColor = col; ctx.shadowBlur = opts.ghost ? 30 : 24;
          ctx.globalAlpha = (opts.alpha === undefined ? 1 : opts.alpha) * (back ? 0.5 : 0.95);
        } else {
          ctx.shadowBlur = 0; ctx.strokeStyle = back ? '#07070c' : '#000'; ctx.lineWidth = 3.1 * S; ctx.globalAlpha = opts.alpha === undefined ? 1 : opts.alpha;
          if (opts.ghost) { ctx.strokeStyle = col; ctx.globalAlpha *= 0.4; }
        }
        limb(pts);
      }
      // head: smaller than the rig's (at this size the stock head reads as a blob), seated on the neck
      const hr = J.headR * 0.72, ndx = J.head.x - J.neck.x, ndy = J.head.y - J.neck.y, nl = Math.hypot(ndx, ndy) || 1;
      const hx = J.neck.x + ndx / nl * hr * 0.95, hy = J.neck.y + ndy / nl * hr * 0.95;
      ctx.beginPath(); ctx.arc(hx, hy, hr, 0, PI * 2);
      if (pass === 0 && !opts.silhouette) { ctx.lineWidth = 1.5 * S; ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.stroke(); }
      if (pass === 1) { ctx.shadowBlur = 0; ctx.fillStyle = opts.ghost ? col : '#000'; ctx.fill(); }
    }
    ctx.restore();
    if (!st.noWeapon && !opts.ghost) drawWeapon(A.weapon, J.handF, st.face > 0 ? st.wpn : PI - st.wpn, opts, st);
    return J;
  }

  function drawWeapon(kind, hand, a, opts, st) {
    const c = Math.cos(a), s = Math.sin(a), sil = opts.silhouette;
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(a); ctx.lineCap = 'round';
    if (kind === 'katana') {
      ctx.strokeStyle = sil ? '#000' : '#222'; ctx.lineWidth = 3.4 * S * 0.6; ctx.beginPath(); ctx.moveTo(-10 * S, 0); ctx.lineTo(4 * S, 0); ctx.stroke();  // grip
      ctx.fillStyle = sil ? '#000' : '#c9a24a'; ctx.fillRect(4 * S - 2, -2.6 * S, 1.4 * S, 5.2 * S);                               // guard
      ctx.beginPath(); ctx.moveTo(5.5 * S, -1.1 * S); ctx.quadraticCurveTo(30 * S, -2.6 * S, 52 * S, -4.2 * S); ctx.lineTo(5.5 * S, 1.0 * S); ctx.closePath();
      if (!sil) { ctx.shadowColor = '#bfefff'; ctx.shadowBlur = 18; }
      ctx.fillStyle = sil ? '#000' : '#e9f6ff'; ctx.fill();
      if (!sil) { ctx.strokeStyle = 'rgba(120,220,255,0.9)'; ctx.lineWidth = 2; ctx.stroke(); }
    } else {
      ctx.strokeStyle = sil ? '#000' : '#4a2c18'; ctx.lineWidth = 3.6 * S * 0.6; ctx.beginPath(); ctx.moveTo(-12 * S, 0); ctx.lineTo(42 * S, 0); ctx.stroke();
      if (!(st && st.broken)) {
        // A single bearded bit on one side of the haft, dark steel with a red-hot cutting edge.
        if (!sil) { ctx.shadowColor = '#ff5a1a'; ctx.shadowBlur = 18; }
        ctx.fillStyle = sil ? '#000' : '#3a3f4a';
        ctx.beginPath(); ctx.moveTo(33 * S, -1.6 * S); ctx.lineTo(41 * S, -1.6 * S);
        ctx.quadraticCurveTo(45 * S, -8 * S, 47 * S, -13 * S);          // top horn
        ctx.quadraticCurveTo(51 * S, -4 * S, 50 * S, 6 * S);            // cutting edge
        ctx.quadraticCurveTo(46 * S, 9 * S, 40 * S, 7 * S);              // beard
        ctx.lineTo(37 * S, 1.6 * S); ctx.lineTo(33 * S, 1.6 * S); ctx.closePath(); ctx.fill();
        if (!sil) {
          ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 0.9 * S; ctx.beginPath();
          ctx.moveTo(47 * S, -13 * S); ctx.quadraticCurveTo(51 * S, -4 * S, 50 * S, 6 * S); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,190,140,0.5)'; ctx.lineWidth = 0.5 * S; ctx.beginPath(); ctx.moveTo(34 * S, -1.6 * S); ctx.lineTo(41 * S, -1.6 * S); ctx.stroke();
        }
      }
    }
    ctx.restore();
    return { x: hand.x + c * (kind === 'katana' ? 50 : 46) * S, y: hand.y + s * (kind === 'katana' ? 50 : 46) * S };
  }
  function axeHeadPos(J, st) {
    const a = st.face > 0 ? st.wpn : PI - st.wpn;
    return { x: J.handF.x + Math.cos(a) * 44 * S, y: J.handF.y + Math.sin(a) * 44 * S };
  }

  // ── effects ──
  function flame(x, y, size, t, seed, alpha) {
    // One hand-drawn-style flame tongue: layered teardrops, flickering.
    const fl = 0.75 + 0.35 * Math.sin(t * 0.9 + seed * 5);
    const layers = [['rgba(255,70,20,0.75)', 1], ['rgba(255,150,40,0.9)', 0.68], ['rgba(255,236,150,0.95)', 0.36]];
    for (const [c, k] of layers) {
      const h = size * fl * k * 2.2, w = size * k * 0.75, sway = Math.sin(t * 0.5 + seed * 3) * size * 0.25;
      ctx.globalAlpha = alpha; ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + sway, y - h);
      ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
      ctx.quadraticCurveTo(x, y + w * 0.6, x - w, y); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function bolt(x1, y1, x2, y2, seed, width, color) {
    const n = 9, pts = [[x1, y1]];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 1; i < n; i++) { const u = i / n, off = (rnd(seed + i * 1.7) - 0.5) * len * 0.28; pts.push([x1 + dx * u + nx * off, y1 + dy * u + ny * off]); }
    pts.push([x2, y2]);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const [lw, c, blur] of [[width * 3, color, 30], [width, '#ffffff', 10]]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.shadowColor = color; ctx.shadowBlur = blur;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
    }
    ctx.restore();
  }
  function sparks(x, y, f, f0, n, seed, color) {
    const age = f - f0; if (age < 0 || age > 28) return;
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = rnd(seed + i) * PI * 2, v = 10 + rnd(seed + i * 3) * 22;
      const px = x + Math.cos(a) * v * age * 0.9, py = y + Math.sin(a) * v * age * 0.9 + 0.35 * age * age;
      const k = 1 - age / 28;
      ctx.strokeStyle = color || '#ffe9a0'; ctx.globalAlpha = k; ctx.lineWidth = 4 * k + 1; ctx.shadowColor = '#ffb040'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a) * v * 1.4, py - Math.sin(a) * v * 1.4); ctx.stroke();
    }
    ctx.restore();
  }
  function dust(x, f, f0, dir) {
    const age = f - f0; if (age < 0 || age > 40) return;
    for (let i = 0; i < 9; i++) {
      const s = dir === 0 ? (i - 4) / 4 : dir * rnd(i + x) ;
      ctx.globalAlpha = (1 - age / 40) * 0.5; ctx.fillStyle = '#b9a9a0';
      ctx.beginPath(); ctx.arc(x + s * age * 7 + (rnd(i) - 0.5) * 30, GROUND - 6 - age * 0.8 * rnd(i * 2), 16 + age * 1.6, 0, PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── background ──
  function drawSky(cam) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#120a26'); g.addColorStop(0.45, '#3a1f4a'); g.addColorStop(0.7, '#a2453a'); g.addColorStop(1, '#2a1410');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // moon, far parallax
    const mx = W * 0.72 - (cam.cx - 540) * 0.05, my = 420 - (cam.cy - 1250) * 0.05;
    const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 260);
    mg.addColorStop(0, 'rgba(255,236,210,0.9)'); mg.addColorStop(0.25, 'rgba(255,200,170,0.35)'); mg.addColorStop(1, 'rgba(255,160,140,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffeedd'; ctx.beginPath(); ctx.arc(mx, my, 70, 0, PI * 2); ctx.fill();
  }
  function drawWorldBack(f, cam) {
    // distant ridge, then a few big broken columns at mid depth (parallax 0.6)
    ctx.save();
    const par = 0.6;
    ctx.translate((cam.cx - 540) * (1 - par), (cam.cy - (GROUND - 280)) * (1 - par));
    ctx.fillStyle = '#2b1730';
    ctx.beginPath(); ctx.moveTo(-1000, GROUND);
    for (let i = -10; i <= 26; i++) ctx.lineTo(i * 100, GROUND - 260 - Math.sin(i * 0.7) * 90 - rnd(i) * 60);
    ctx.lineTo(2600, GROUND); ctx.fill();
    ctx.fillStyle = '#1f1022';
    const cols = [[-180, 760, 0], [140, 600, 1], [930, 820, 0], [1260, 520, 1], [1560, 700, 0]];
    for (const [x, h, br] of cols) {
      ctx.fillRect(x, GROUND - h, 90, h);
      ctx.fillRect(x - 16, GROUND - 26, 122, 26);
      if (br) { ctx.beginPath(); ctx.moveTo(x, GROUND - h); ctx.lineTo(x + 30, GROUND - h - 50); ctx.lineTo(x + 55, GROUND - h - 20); ctx.lineTo(x + 90, GROUND - h - 70); ctx.lineTo(x + 90, GROUND - h); ctx.fill(); }
      else ctx.fillRect(x - 16, GROUND - h - 24, 122, 24);
      ctx.fillStyle = 'rgba(255,150,110,0.12)'; ctx.fillRect(x + 70, GROUND - h, 20, h); ctx.fillStyle = '#1f1022';
    }
    ctx.restore();
    // near ruins: a big arch left and right, warm-lit edges
    ctx.save();
    ctx.fillStyle = '#1a0e14';
    ctx.fillRect(-300, GROUND - 900, 180, 900); ctx.fillRect(1180, GROUND - 980, 200, 980);
    ctx.strokeStyle = 'rgba(255,140,80,0.35)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-120, GROUND - 900); ctx.lineTo(-120, GROUND); ctx.moveTo(1180, GROUND - 980); ctx.lineTo(1180, GROUND); ctx.stroke();
    ctx.restore();
    // ground
    const gg = ctx.createLinearGradient(0, GROUND, 0, GROUND + 500);
    gg.addColorStop(0, '#3a2420'); gg.addColorStop(1, '#120a0a');
    ctx.fillStyle = gg; ctx.fillRect(-1200, GROUND, 3600, 900);
    ctx.strokeStyle = 'rgba(255,170,120,0.45)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-1200, GROUND); ctx.lineTo(2400, GROUND); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3;
    for (let i = -10; i < 30; i++) { ctx.beginPath(); ctx.moveTo(i * 110, GROUND + 4); ctx.lineTo(i * 110 - 50, GROUND + 120); ctx.stroke(); }
    // embers drifting
    for (let i = 0; i < 40; i++) {
      const x = (rnd(i) * 1600 - 260 + f * (0.6 + rnd(i * 2))) % 1700 - 300, y = GROUND - ((f * (1.2 + rnd(i * 3)) + rnd(i * 5) * 1200) % 1200);
      ctx.fillStyle = 'rgba(255,170,90,' + (0.35 + 0.4 * rnd(i * 7)).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, 2.5 + rnd(i * 9) * 3, 0, PI * 2); ctx.fill();
    }
  }

  // ── frame ──
  window.__render = function (f) {
    const fb = f - (f % 2) * 0;            // effects/camera on ones (60 fps)
    const fp = f - (f % (2 * B));           // bodies on twos (15 poses/s)
    const impact = IMPACT.find(i => f >= i.f && f < i.f + i.len);
    const cam = camAt(fb);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (impact) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
    else drawSky(cam);
    ctx.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z);
    if (!impact) drawWorldBack(fb, cam);
    const kS = actorAt(KAEL, fp), vS = actorAt(VAREK, fp);
    const M = window.__MARKS;

    // fire wave from the slam: flame columns marching toward Kael
    if (!impact) for (let i = 0; i < 12; i++) {
      const f0 = M.slam + 2 + i * 3, age = fb - f0;
      if (age < 0 || age > 54) continue;
      const k = age < 8 ? age / 8 : 1 - (age - 8) / 46;
      flame(560 - i * 52, GROUND + 4, 85 * k + 14, fb, i, Math.max(0, k));
    }
    dust(598 - 150, fb, M.slam, 0); dust(300, fb, 66 * B, 0); dust(500, fb, 256 * B, 0);

    // Kael's charge: lightning crawling over him, growing
    const chg = fb >= 128 * B && fb < 161 * B ? (fb - 128 * B) / (33 * B) : 0;

    // afterimages of the dash
    if (fb >= M.dash - 2 && fb < M.dash + 26) {
      const k = 1 - (fb - M.dash + 2) / 28;
      for (let i = 0; i < 6; i++) {
        const st = actorAt(KAEL, 160 * B); st.x = lerp(272, 812, i / 5); st.pose = actorAt(KAEL, i < 3 ? 160 * B : 161 * B).pose;
        drawFigure(KAEL, st, { ghost: true, alpha: k * 0.55 * (0.4 + i / 8) });
      }
      ctx.save(); ctx.globalAlpha = Math.max(0, k);
      bolt(270, GROUND - 210, 820, GROUND - 200, Math.floor(fb / 2) * 3, 9, '#7fe8ff'); ctx.restore();
    }

    // figures
    const vJ = drawFigure(VAREK, vS, { silhouette: !!impact });
    const kJ = drawFigure(KAEL, kS, { silhouette: !!impact });

    // the axe on fire from the raise to the slam, then the thrown wheel and its return
    if (!impact && fb >= 30 * B && fb < 66 * B && !vS.noWeapon) {
      const h = axeHeadPos(vJ, vS);
      for (let i = 0; i < 4; i++) flame(h.x + (rnd(i) - 0.5) * 40, h.y + 20, 34, fb, i + 20, 0.9);
    }
    if (fb >= 89 * B && fb < 112 * B) {
      // out: from Varek's hand to Kael's block (beats 89-100); back: an arc up and home (100-112)
      const out = fb < 100 * B, u = out ? (fb - 89 * B) / (11 * B) : (fb - 100 * B) / (12 * B);
      const from = out ? { x: 590, y: GROUND - 300 } : { x: 330, y: GROUND - 250 }, to = out ? { x: 330, y: GROUND - 250 } : { x: 600, y: GROUND - 380 };
      const x = lerp(from.x, to.x, u), y = lerp(from.y, to.y, u) - (out ? 0 : Math.sin(u * PI) * 220);
      const spin = fb * 0.55;
      ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
      if (!impact) { for (let i = 0; i < 6; i++) flame(Math.cos(i) * 60, Math.sin(i) * 60, 30, fb, i + 40, 0.7); }
      drawWeapon('axe', { x: -18 * S, y: 0 }, 0, { silhouette: !!impact });
      ctx.restore();
    }
    sparks(338, GROUND - 260, fb, M.block, 26, 7, '#ffe9a0');
    sparks(541, GROUND - 360, fb % 12 === 0 && fb < 18 * B ? fb : -999, fb, 10, fb, '#ffe9a0');
    if (fb < 14 * B) sparks(541, GROUND - 360, fb, Math.floor(fb / 10) * 10, 8, Math.floor(fb / 10), '#fff0b0');

    if (!impact && chg > 0) {
      const n = 2 + Math.floor(chg * 6);
      for (let i = 0; i < n; i++) {
        const sd = Math.floor(fb / 4) * 7 + i * 13, a = rnd(sd) * PI * 2, r = 60 + rnd(sd + 1) * 120 * (0.5 + chg);
        bolt(kJ.chest.x, kJ.chest.y, kJ.chest.x + Math.cos(a) * r, kJ.chest.y + Math.sin(a) * r, sd, 3 + chg * 3, '#6fe0ff');
      }
      ctx.save(); const gr = ctx.createRadialGradient(kJ.chest.x, kJ.chest.y, 10, kJ.chest.x, kJ.chest.y, 260 * (0.4 + chg));
      gr.addColorStop(0, 'rgba(120,230,255,' + (0.35 * chg).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(kJ.chest.x - 400, kJ.chest.y - 400, 800, 800); ctx.restore();
    }
    // the cut lands: a giant slash across Varek, arcs over him, the axe head in two pieces flying
    if (fb >= M.cut && fb < M.cut + 60) {
      const age = fb - M.cut, k = Math.max(0, 1 - age / 40);
      ctx.save(); ctx.strokeStyle = impact ? '#000' : '#eaffff'; ctx.lineWidth = 26 * k + 4; ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = impact ? 0 : 40;
      ctx.beginPath(); ctx.moveTo(320, GROUND - 120); ctx.lineTo(830, GROUND - 330); ctx.stroke(); ctx.restore();
      if (!impact) {
        for (let i = 0; i < 3; i++) bolt(vJ.chest.x, vJ.chest.y, vJ.chest.x + (rnd(fb + i) - 0.5) * 260, vJ.chest.y + (rnd(fb * 2 + i) - 0.5) * 260, fb * 5 + i, 4, '#6fe0ff');
        for (let p = 0; p < 2; p++) {
          const x = 430 + (p ? -1 : 1) * age * 6, y = GROUND - 300 - age * 9 + 0.5 * age * age * 0.4;
          if (y > GROUND) continue;
          ctx.save(); ctx.translate(x, y); ctx.rotate(age * (p ? 0.3 : -0.25)); ctx.fillStyle = '#9aa4b4'; ctx.shadowColor = '#ff6a2a'; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, p ? -60 : 60, 60, p ? -40 : 40); ctx.lineTo(10, p ? -6 : 6); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        sparks(vJ.chest.x, vJ.chest.y, fb, M.cut + 6, 30, 11, '#bff4ff');
      }
    }

    // screen-space: speed lines in the dash and the cut, vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sl = (fb >= M.dash - 2 && fb < M.dash + 14) || (fb >= M.cut && fb < M.cut + 10);
    if (sl) {
      ctx.save(); ctx.strokeStyle = impact ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.55)'; ctx.lineWidth = 4;
      for (let i = 0; i < 40; i++) {
        const a = rnd(i + Math.floor(fb / 2) * 0.01) * PI * 2, r0 = 380 + rnd(i * 3 + fb) * 300;
        ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * 1600, H / 2 + Math.sin(a) * 1600); ctx.stroke();
      }
      ctx.restore();
    }
    if (!impact) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
  };
})();
