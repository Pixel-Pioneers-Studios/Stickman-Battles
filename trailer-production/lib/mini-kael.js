'use strict';
// Mini Kael: the channel's narrator, drawn over footage in the overlay page (engine.js pageScripts, after
// js/smb-figure-rig.js and js/smb-figure-skin.js), so his skeleton and look are the game's own:
// the films' CinRig figure: black body, #00d4ff neon outline, long capsule limbs, round head.
//
// Overlay item: { type: 'kael', from, to, S, track: [key...], mouth: [0..1 per output frame], ground: [y px...] }
// key = { t, x, y, face, clip, move: 'jump'|'dash'|'run'|undefined, h (jump height px), flip, fx: 'burst', expr, look }
//   t: output frame the figure ARRIVES at (x, y) (feet, frame px). The move runs from the previous key's arrival
//   (or its `go` frame, if set) to t. move 'stay' changes the clip in place (x, y copied from the previous key). Then `clip` (a FigureRig clip) plays until the next key's departure.
(function () {
  const PI = Math.PI, H = PI / 2;
  const R = FigureRig;
  // Extra poses (facing-right space, radians from +X, +Y down).
  Object.assign(R.POSES, {
    jumpCoil: { rootY: 9, spine: -H + 0.32, squash: -0.10, upperArmF: H + 0.9, foreArmF: H + 1.1, upperArmB: H + 1.1, foreArmB: H + 1.3,
      thighF: H - 0.95, shinF: H + 0.55, thighB: H - 0.35, shinB: H + 0.85 },
    jumpAir: { rootY: -4, spine: -H + 0.12, squash: 0.06, upperArmF: -H + 0.55, foreArmF: -H + 0.25, upperArmB: H + 1.25, foreArmB: H + 1.6,
      thighF: H - 1.25, shinF: H + 0.35, thighB: H - 0.45, shinB: H + 1.0 },
    tuck: { rootY: -6, spine: -H + 0.5, squash: -0.05, upperArmF: H - 0.6, foreArmF: -H + 0.9, upperArmB: H - 0.3, foreArmB: -H + 1.2,
      thighF: -0.35, shinF: H + 0.2, thighB: 0.0, shinB: H + 0.5 },
    land: { rootY: 11, spine: -H + 0.38, squash: -0.14, upperArmF: H - 0.9, foreArmF: H - 0.4, upperArmB: H + 1.0, foreArmB: H + 0.7,
      thighF: H - 1.05, shinF: H + 0.5, thighB: H - 0.2, shinB: H + 0.95 },
    dash: { rootY: 4, spine: -H + 0.75, upperArmF: PI - 0.2, foreArmF: PI - 0.1, upperArmB: PI - 0.5, foreArmB: PI - 0.35,
      thighF: H - 0.6, shinF: H + 0.3, thighB: H + 0.9, shinB: PI - 0.4 },
    lean: { rootY: 3, spine: -H + 0.30, headTilt: 0.12, upperArmF: H - 0.75, foreArmF: -H + 0.9, upperArmB: H + 0.25, foreArmB: H + 0.05,
      thighF: H - 0.32, shinF: H + 0.12, thighB: H + 0.22, shinB: H - 0.02 },
    shrug: { rootY: -1, spine: -H - 0.04, headTilt: -0.10, upperArmF: H - 0.9, foreArmF: -H + 0.35, upperArmB: H + 0.9, foreArmB: -H - 0.35 },
    // One arm aimed down at the fight below him; the other relaxed. (The rig's 'point' raises both arms.)
    aim: { rootY: 1, lean: 2, spine: -H + 0.10, headTilt: 0.22, upperArmF: 0.55, foreArmF: 0.45, upperArmB: H + 0.40, foreArmB: H + 0.25 },
    cross: { rootY: 0.5, spine: -H - 0.02, headTilt: 0.10, upperArmF: H - 0.25, foreArmF: PI - 0.25, upperArmB: H - 0.05, foreArmB: PI + 0.05 },
    cheer: { rootY: -2, spine: -H - 0.06, headTilt: -0.12, upperArmF: -H + 0.35, foreArmF: -H + 0.1, upperArmB: -H - 0.6, foreArmB: -H - 0.35 },
  });
  const one = (name, dur) => ({ loop: false, hold: true, dur: dur || 20, keys: [{ t: 0, pose: name }, { t: dur || 20, pose: name }] });
  Object.assign(R.CLIPS, {
    lean: { loop: false, hold: true, dur: 120, keys: [{ t: 0, pose: 'stand' }, { t: 14, pose: 'lean', ease: 'back.out' }, { t: 120, pose: 'lean' }] },
    shrug: { loop: false, hold: true, dur: 90, keys: [{ t: 0, pose: 'stand' }, { t: 10, pose: 'shrug', ease: 'back.out' }, { t: 60, pose: 'shrug' }, { t: 90, pose: 'listenA', ease: 'sine.inOut' }] },
    cheer: { loop: false, hold: true, dur: 60, keys: [{ t: 0, pose: 'land' }, { t: 9, pose: 'cheer', ease: 'back.out' }, { t: 60, pose: 'cheer' }] },
    landHold: one('land', 6),
    aim: { loop: false, hold: true, dur: 80, keys: [{ t: 0, pose: 'tellA' }, { t: 10, pose: 'aim', ease: 'back.out' }, { t: 80, pose: 'aim' }] },
    cross: { loop: false, hold: true, dur: 80, keys: [{ t: 0, pose: 'stand' }, { t: 12, pose: 'cross', ease: 'back.out' }, { t: 80, pose: 'cross' }] },
    // Bigger than the story talk clip: at narrator size the small gestures don't read.
    tell: { loop: true, dur: 104, keys: [
      { t: 0, pose: 'tellA' }, { t: 16, pose: 'tellB', ease: 'back.out' }, { t: 34, pose: 'tellC', ease: 'cubic.out' },
      { t: 52, pose: 'tellA', ease: 'back.out' }, { t: 70, pose: 'tellD', ease: 'cubic.out' }, { t: 104, pose: 'tellA', ease: 'sine.inOut' }] },
  });
  Object.assign(R.POSES, {
    tellA: { rootY: 0.5, lean: 2, spine: -H + 0.08, headTilt: -0.10, upperArmF: H - 1.15, foreArmF: -0.55, upperArmB: H + 0.35, foreArmB: H + 0.12 },
    tellB: { rootY: 2.5, lean: 4, spine: -H + 0.20, headTilt: 0.12, upperArmF: H - 1.55, foreArmF: -0.9, upperArmB: H + 0.75, foreArmB: H + 1.1 },
    tellC: { rootY: -1.5, lean: -1, spine: -H - 0.06, headTilt: -0.18, upperArmF: H - 0.4, foreArmF: -H + 0.6, upperArmB: H + 0.30, foreArmB: H + 0.05 },
    tellD: { rootY: 1.5, lean: 3, spine: -H + 0.14, headTilt: 0.06, upperArmF: H - 1.35, foreArmF: 0.25, upperArmB: H + 0.25, foreArmB: H + 0.5 },
  });
  const PAL = { accent: '#00d4ff', eye: '#0b1a26' };
  const lerp = (a, b, t) => a + (b - a) * t;
  const cl = t => Math.max(0, Math.min(1, t));
  const eo = u => 1 - Math.pow(1 - cl(u), 3), eio = u => (u = cl(u), u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const LAND = 9, BLEND = 8;

  // ── where the figure is at frame f ─────────────────────────────────────
  function state(tr, f) {
    let i = 0; while (i + 1 < tr.length && f >= go(tr, i + 1)) i++;
    const k = tr[i], n = tr[i + 1];
    // Moving toward key i (between its departure and arrival)?
    if (i > 0 && f < k.t) {
      const p = tr[i - 1], d0 = go(tr, i), u = (f - d0) / Math.max(1, k.t - d0);
      const mv = k.move || 'jump';
      let x, y, pose, rot = 0;
      if (mv === 'jump') {
        x = lerp(p.x, k.x, eio(u * 0.85 + u * u * 0.15)); y = lerp(p.y, k.y, u) - (k.h || 260) * 4 * u * (1 - u);
        pose = u < 0.12 ? R.blend(R.POSES.jumpCoil, R.POSES.jumpAir, eo(u / 0.12), {}) : u > 0.8 ? R.blend(R.POSES.jumpAir, R.POSES.land, eo((u - 0.8) / 0.2), {}) : (k.flip ? R.POSES.tuck : R.POSES.jumpAir);
        if (k.flip) rot = -2 * PI * eio((u - 0.12) / 0.7) * (k.flip < 0 ? -1 : 1);
      } else if (mv === 'dash') {
        x = lerp(p.x, k.x, eo(u)); y = lerp(p.y, k.y, eo(u)); pose = R.POSES.dash;
      } else {
        x = lerp(p.x, k.x, u); y = lerp(p.y, k.y, u); pose = R.sample('run', f - d0, {});
      }
      const face = k.face || (k.x >= p.x ? 1 : -1);
      return { x, y, pose: Object.assign({}, R.blend(pose, pose, 0, {}), { rootRot: rot }), face, moving: mv, u, air: mv === 'jump', key: k, prev: p };
    }
    // Arrived: land squash, then the key's clip.
    const since = f - k.t, landed = i > 0 && (k.move || 'jump') === 'jump';
    let pose = R.sample(k.clip || 'idle', since - (landed ? LAND : 0), { phase: 0 }) || R.POSES.stand;
    pose = R.blend(R.POSES.stand, pose, 1, {});
    if (landed && since < LAND) pose = R.blend(R.POSES.land, pose, eio(since / LAND), {});
    else if (i > 0 && k.move === 'dash' && since < BLEND) pose = R.blend(R.POSES.dash, pose, eo(since / BLEND), {});
    return { x: k.x, y: k.y, pose, face: k.face || 1, moving: null, key: k, since };
  }
  // A key's departure frame from the previous one: `go`, or (for a jump) a short coil before arrival.
  function go(tr, i) { const k = tr[i]; if (k.move === 'stay') return k.t; return k.go !== undefined ? k.go : k.t - (k.dur || 22); }

  // Smooth clip-to-clip changes while standing: blend from the pose BLEND frames earlier.
  function poseAt(tr, f) {
    const s = state(tr, f);
    if (!s) return s;
    if (!s.moving && s.since !== undefined && s.since < BLEND && s.key.blendIn !== false) {
      const i = tr.indexOf(s.key);
      if (i > 0 && tr[i - 1].x === s.key.x && tr[i - 1].y === s.key.y) {
        const prev = state(tr, s.key.t - 1);
        if (prev) s.pose = R.blend(prev.pose, s.pose, eio(s.since / BLEND), {});
      }
    }
    return s;
  }

  // ── drawing ────────────────────────────────────────────────────────────
  // Drawn by CinRig, the game's cinematic figure (same as the films: long capsule limbs, film head size and
  // line width). The rig poses above are in the same facing-right angle space, so they map bone for bone.
  function toCin(q, face) {
    const A = a => face > 0 ? a : PI - a, sq = q.squash || 0;
    return { x: 0, y: 0, facing: face, scale: 0.9, headScale: 0.77, torso: q.spine + H, headTilt: q.headTilt || 0,
      hipDrop: q.rootY || 0, rot: (q.rootRot || 0) * face, sx: 1 - sq * 0.55, sy: 1 + sq,
      rArm: A(q.upperArmF), rFore: A(q.foreArmF), lArm: A(q.upperArmB), lFore: A(q.foreArmB),
      rLeg: A(q.thighF), rShin: A(q.shinF), lLeg: A(q.thighB), lShin: A(q.shinB) };
  }
  // Grounded legs closed into one column at this size: open the stance a little.
  function spread(pose, on) {
    if (!on) return pose;
    return Object.assign({}, pose, { thighF: pose.thighF - 0.20, thighB: pose.thighB + 0.20, shinF: pose.shinF - 0.08, shinB: pose.shinB + 0.08 });
  }
  // (x, y) is where the lowest sole touches: crouches keep their feet planted and jumps fly the feet along the arc.
  function placed(s) {
    const m = toCin(spread(s.pose, !s.moving), s.face), J = CinRig.joints(m);
    m.y = -(Math.max(J.rFoot.y, J.lFoot.y) + 2.6);
    return m;
  }
  const EXPR = { intense: 'intense', angry: 'angry', hurt: 'hurt' };
  function figure(ctx, s, S, alpha, ghost, f, it) {
    const m = placed(s);
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(S, S);
    if (!ghost && !s.air && !s.moving) {
      ctx.save(); ctx.globalAlpha = 0.45 * alpha; ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, 0.5, 17, 3.2, 0, 0, PI * 2); ctx.fill(); ctx.restore();
    }
    const blink = !ghost && (f % 197) < 6;
    const J = CinRig.draw(ctx, m, PAL.accent, { width: 5.2, outline: 1, alpha, face: !ghost, blink,
      expr: EXPR[(s.key && s.key.expr)] || 'neutral', glow: ghost ? PAL.accent : 'rgba(0,212,255,0.55)', glowBlur: ghost ? 10 : 7 });
    if (!ghost && !blink) mouth(ctx, J, m, (it.mouth && it.mouth[f]) || 0);
    ctx.restore();
  }
  // CinRig's face has no talking mouth; this one opens with the voice's loudness.
  function mouth(ctx, J, m, open) {
    if (open < 0.08) return;
    const r = J.headR, fc = m.facing, x = J.head.x + fc * r * 0.40, y = J.head.y + r * 0.40;
    ctx.save();
    if (m.rot) { ctx.translate(J.hip.x, J.hip.y); ctx.rotate(m.rot); ctx.translate(-J.hip.x, -J.hip.y); }
    ctx.fillStyle = 'rgba(16,20,28,0.92)';
    ctx.beginPath(); ctx.ellipse(x, y, r * (0.15 + 0.06 * open), r * (0.04 + 0.15 * open), 0, 0, PI * 2); ctx.fill();
    ctx.restore();
  }

  window.__OVX = window.__OVX || {};
  window.__OVX.kael = function (ctx, it, f) {
    if (f < it.from || f >= it.to) return;
    const tr = it.track, S = it.S || 3.1;
    const a = cl((f - it.from) / 4) * cl((it.to - f) / 6);
    const s = poseAt(tr, f);
    if (!s) return;
    // Dash afterimages and jump trails.
    if (s.moving === 'dash' || (s.air && s.key.trail)) {
      for (let g = 4; g >= 1; g--) {
        const q = poseAt(tr, f - g * 2);
        if (!q || !q.moving) continue;
        figure(ctx, q, S, a * (0.34 - g * 0.06), true, f, it);
      }
    }
    // Ability burst: a cyan ring off the feet at departure.
    for (const k of tr) {
      if (!k.fx) continue;
      const i = tr.indexOf(k), d0 = i > 0 ? go(tr, i) : k.t, p = i > 0 ? tr[i - 1] : k, u = (f - d0) / 18;
      if (u < 0 || u > 1) continue;
      ctx.save(); ctx.globalAlpha = a * (1 - u); ctx.strokeStyle = PAL.accent; ctx.shadowColor = PAL.accent; ctx.shadowBlur = 18;
      ctx.lineWidth = 10 * (1 - u) + 2; ctx.beginPath(); ctx.ellipse(p.x, p.y - 4, 30 + 150 * eo(u), 8 + 34 * eo(u), 0, 0, PI * 2); ctx.stroke(); ctx.restore();
    }
    // Landing dust.
    for (let i = 1; i < tr.length; i++) {
      const k = tr[i]; if ((k.move || 'jump') !== 'jump') continue;
      const u = (f - k.t) / 16; if (u < 0 || u > 1) continue;
      ctx.save(); ctx.fillStyle = '#d8f6ff';
      for (let n = 0; n < 6; n++) {
        const dir = n < 3 ? -1 : 1, sp = 1 + (n % 3) * 0.6;
        ctx.globalAlpha = a * 0.55 * (1 - u);
        ctx.beginPath(); ctx.arc(k.x + dir * (20 + 70 * sp * eo(u)), k.y - 6 - 24 * sp * u * (1 - u) * 2, 9 * (1 - u * 0.6), 0, PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    figure(ctx, s, S, a, false, f, it);
  };
})();
