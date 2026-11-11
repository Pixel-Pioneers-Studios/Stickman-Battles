'use strict';
// Page-side film library (window.FILM), evaluated before a shot's install. A shot hands FILM.setup a spec of
// keyed actors, camera, speed ramps, effects and events, then calls FILM.tick(H) every frame.
//
// Time: everything is keyed in choreography seconds `c`. Each frame c advances by the current speed (the
// `speed` keys), so a speed ramp slows the bodies, camera, effects and the game's particles together.
//
// Poses: degrees, facing-RIGHT space (0 = right, 90 = down), r* = weapon arm (drawn in front). They are
// mirrored at draw time for a left-facing actor (CinRig limb angles are world angles: theta -> 180 - theta).
// The bodies are drawn by CinRig (the game's cinematic figure: black body, neon outline) and the weapon by the
// fighter's own drawWeapon, so the look is the game's.
(function () {
  const P = Math.PI, RAD = d => d * P / 180;
  const LIMBS = ['rArm', 'rFore', 'lArm', 'lFore', 'rLeg', 'rShin', 'lLeg', 'lShin'];
  const ANG = LIMBS.concat(['torso', 'headTilt', 'rot']);

  // ── pose library (degrees) ────────────────────────────────────────────────
  const STAND = { rArm: 104, rFore: 104, lArm: 76, lFore: 76, rLeg: 101, rShin: 101, lLeg: 79, lShin: 79 };
  const POSES = { stand: STAND };
  const def = (name, from, o) => { POSES[name] = Object.assign({}, POSES[from] || STAND, o); };
  FILM_POSES_DEFINE(def);

  function toRad(q) {
    const o = {};
    for (const k in q) o[k] = ANG.includes(k) ? RAD(q[k]) : q[k];
    return o;
  }
  function resolve(spec, extra) {
    const base = typeof spec === 'string' ? POSES[spec] : spec && spec.from ? Object.assign({}, POSES[spec.from], spec) : Object.assign({}, STAND, spec || {});
    if (!base) throw new Error('no pose ' + spec);
    return toRad(Object.assign({ rot: 0 }, base, extra || {}));
  }

  // ── curves ────────────────────────────────────────────────────────────────
  const EASE = {
    io: u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2,
    lin: u => u, out: u => 1 - Math.pow(1 - u, 3), in: u => u * u * u,
    xout: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u), xin: u => u <= 0 ? 0 : Math.pow(2, 10 * u - 10),
    back: u => { const s = 1.70158, c3 = s + 1; return 1 + c3 * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2); },
    hold: () => 0, sine: u => -(Math.cos(P * u) - 1) / 2,
  };
  // keys: [c, v1, v2, ..., ease?]; ease on the TO key.
  function curve(keys, c) {
    if (!keys || !keys.length) return null;
    let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= c) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const n = a.length - (typeof a[a.length - 1] === 'string' ? 1 : 0);
    if (a === b || c <= a[0]) return a.slice(1, n);
    const e = EASE[typeof b[b.length - 1] === 'string' ? b[b.length - 1] : 'io'] || EASE.io;
    const u = e(Math.max(0, Math.min(1, (c - a[0]) / (b[0] - a[0]))));
    const o = []; for (let k = 1; k < n; k++) o.push(a[k] + (b[k] - a[k]) * u);
    return o;
  }
  // Pose beats: [c, pose, ease?, extra?]
  function poseAt(beats, c) {
    let i = 0; while (i < beats.length - 1 && beats[i + 1][0] <= c) i++;
    const a = beats[i], b = beats[Math.min(i + 1, beats.length - 1)];
    if (!a._q) a._q = resolve(a[1], a[3]);
    if (!b._q) b._q = resolve(b[1], b[3]);
    if (a === b || c <= a[0]) return Object.assign({}, a._q);
    const e = EASE[b[2] || 'io'] || EASE.io;
    const u = e(Math.max(0, Math.min(1, (c - a[0]) / (b[0] - a[0]))));
    const o = {};
    for (const k in a._q) o[k] = typeof a._q[k] === 'number' && typeof b._q[k] === 'number' ? a._q[k] + (b._q[k] - a._q[k]) * u : a._q[k];
    for (const k in b._q) if (o[k] === undefined) o[k] = b._q[k];
    return o;
  }
  function stepAt(keys, c, dflt) {
    if (!keys || !keys.length) return dflt;
    let v = dflt; for (const k of keys) if (k[0] <= c) v = k[1];
    return v;
  }

  // ── figure drawing ────────────────────────────────────────────────────────
  function mirror(q) {
    const o = Object.assign({}, q);
    for (const k of LIMBS) if (o[k] !== undefined) o[k] = P - o[k];
    if (o.headTilt) o.headTilt = -o.headTilt;
    if (o.rot) o.rot = -o.rot;
    return o;
  }
  // Draw fighter f's body (+ weapon) in pose q (radians, facing-right space) with feet at (x, y).
  function drawFig(f, q, x, y, face, o) {
    o = o || {};
    const m = face < 0 ? mirror(q) : Object.assign({}, q);
    const rot = m.rot || 0; m.rot = 0;
    m.x = x; m.y = y; m.facing = face;
    m.scale = (m.scale || 1) * 0.9 * (o.scale || 1);
    m.headScale = (m.headScale || 1) * 0.77;
    if (o.alpha !== undefined) m.alpha = o.alpha;
    const J0 = CinRig.joints(m);
    ctx.save();
    if (rot) { ctx.translate(J0.hip.x, J0.hip.y); ctx.rotate(rot); ctx.translate(-J0.hip.x, -J0.hip.y); }
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    const ghost = !!o.color;
    const J = CinRig.draw(ctx, m, o.color || f.color, {
      width: 5.2, outline: o.scale || 1, expr: o.expr || 'neutral', blink: false, face: !ghost,
      glow: o.glow || false, glowBlur: o.glowBlur || 12,
    });
    if (o.weapon !== false && f.weaponKey && f.weaponKey !== 'gauntlet' && (o.wAlpha === undefined || o.wAlpha > 0.01)) {
      const fc = f.facing; f.facing = face;
      ctx.save();
      if (o.wAlpha !== undefined) ctx.globalAlpha *= o.wAlpha;
      // Sunk: nothing of the blade below the floor line.
      if (o.clipY !== undefined) { ctx.beginPath(); ctx.rect(x - 4000, y - 4000, 8000, o.clipY - (y - 4000)); ctx.clip(); }
      let wa = m.rFore + (o.wTilt ? (face < 0 ? -RAD(o.wTilt) : RAD(o.wTilt)) : 0);
      if (o.wAbs) wa -= carryTilt(f.weaponKey, face);
      try { f.drawWeapon(J.rHand.x, J.rHand.y, wa, false, null, 1.5 * m.scale); } catch (e) {}
      ctx.restore();
      f.facing = fc;
    }
    ctx.restore();
    J.rot = rot;
    return J;
  }
  function carryTilt(k, face) {
    const swg = typeof WEAPON_SWINGS !== 'undefined' ? WEAPON_SWINGS[k] : null;
    const ct = (swg && swg.carry && swg.carry.tilt) || 0;
    return face < 0 ? -ct : ct;
  }
  // Drawn blade length past the hand (world px) for fighter f at actor scale sc.
  function bladeLen(f, sc) {
    const spr = typeof WEAPON_SPRITES !== 'undefined' ? WEAPON_SPRITES[f.weaponKey] : null;
    return spr ? spr.len * (1 - spr.anchor) * 1.5 * 0.9 * (sc || 1) : 60;
  }
  // Joint position after the body rotation drawFig applies.
  function rotPt(J, pt) {
    if (!J.rot) return { x: pt.x, y: pt.y };
    const dx = pt.x - J.hip.x, dy = pt.y - J.hip.y, c = Math.cos(J.rot), s = Math.sin(J.rot);
    return { x: J.hip.x + dx * c - dy * s, y: J.hip.y + dx * s + dy * c };
  }

  // ── the film state ────────────────────────────────────────────────────────
  const L = window.FILM = { P, RAD, POSES, resolve, curve, poseAt, drawFig, rotPt, mirror, EASE };

  L.setup = function (H, spec) {
    const D = H.D;
    L.H = H; L.D = D; L.spec = spec; L.G = D.G;
    D.c = spec.c0 || 0; D.sfx = [];
    L.fx = []; L.parts = []; L.cracks = []; L.screenFx = [];
    L.actors = {};
    const ps = players.filter(Boolean);
    for (const key in spec.actors) {
      const a = spec.actors[key];
      a.key = key; a.f = a.f || (key === 'k' ? ps[0] : ps[1]);
      a.f.drawScale = a.scale || 1;
      L.actors[key] = a;
    }
    // Every fighter is drawn by the film; the game's own body draw is skipped.
    const order = Object.values(L.actors);
    for (const p of ps) p.draw = function () {};
    const first = ps[0];
    first.draw = function () {
      L.layer('under');
      const list = order.slice().sort((a, b) => (a.z || 0) - (b.z || 0));
      for (const a of list) L.drawActor(a);
      L.layer('over');
    };
    D.screen.push((c, W, Hh) => L.drawScreen(c, W, Hh));
    for (const e of spec.ev || []) e.done = false;
    L.place();
    L.camera(true);
  };

  // Overlapping action: the arms trail the body and the forearms trail the arms, the head trails last, so a
  // move travels through the figure instead of every joint arriving on the same frame.
  const LAG = { rArm: 0.02, rFore: 0.04, lArm: 0.03, lFore: 0.055, headTilt: 0.05, headOff: 0.05 };
  L.pose = function (a, c) {
    const q = poseAt(a.beats, c), m = a.lag === undefined ? 1 : a.lag;
    if (m > 0) {
      const memo = {};
      for (const k in LAG) { const t = (c - LAG[k] * m).toFixed(4); const p = memo[t] || (memo[t] = poseAt(a.beats, +t)); if (p[k] !== undefined) q[k] = p[k]; }
    }
    if (a.rotFn) q.rot = (q.rot || 0) + RAD(a.rotFn(c));
    // A hold is never dead still: a slow breath through the chest, shoulders and head.
    const b = a.breath ? curve(a.breath, c)[0] : 1;
    if (b > 0.001) {
      const ph = a.key === 's' ? 1.7 : 0, sn = Math.sin(c * 2.4 + ph), sn2 = Math.sin(c * 2.4 + ph - 0.7);
      q.torso = (q.torso || 0) + RAD(1.4) * sn * b;
      q.hipDrop = (q.hipDrop || 0) + 0.7 * (sn + 1) * b;
      q.headTilt = (q.headTilt || 0) + RAD(1.6) * sn2 * b;
      if (q.lArm !== undefined) q.lArm += RAD(2.2) * sn2 * b;
      if (q.rArm !== undefined) q.rArm += RAD(1.4) * sn2 * b;
    }
    return q;
  };
  L.state = function (a, c) {
    // a.posFn(c): the position as a function of time (a hand-lock or a ride), for what keys can't express.
    const pos = (a.posFn ? a.posFn(c) : curve(a.pos, c) || [450, 0]).slice();
    // A shared fall: positions are authored relative to a frame that drops by spec.fall.
    if (L.spec.fall) pos[1] -= curve(L.spec.fall, c)[0];
    const q0 = L.pose(a, c), face0 = stepAt(a.face, c, 1);
    // spec.plant: a figure on or near the floor stands ON it, whatever its pose's bend does to the length of its legs.
    if (L.spec.plant && pos[1] < 18 && !q0.rot) {
      const m = face0 < 0 ? mirror(q0) : Object.assign({}, q0);
      m.rot = 0; m.x = pos[0]; m.y = L.G; m.facing = face0; m.scale = (m.scale || 1) * 0.9 * (a.scale || 1); m.headScale = 0.77;
      const J = CinRig.joints(m), low = Math.max(J.rFoot.y, J.lFoot.y, J.rKnee.y, J.lKnee.y) - L.G;
      pos[1] += low * (1 - Math.max(0, pos[1]) / 18);
    }
    return { q: q0, x: pos[0], h: pos[1], face: face0,
      hidden: stepAt(a.hidden, c, false), weapon: stepAt(a.weapon, c, true), expr: stepAt(a.expr, c, 'neutral'),
      alpha: a.alphaK ? curve(a.alphaK, c)[0] : 1 };
  };
  L.joints = function (key, c) {
    const a = L.actors[key], s = L.state(a, c === undefined ? L.D.c : c);
    L.applyWeapon(a, c === undefined ? L.D.c : c);
    const m = s.face < 0 ? mirror(s.q) : Object.assign({}, s.q);
    const rot = m.rot || 0; m.rot = 0;
    m.x = s.x; m.y = L.G - s.h; m.facing = s.face; m.scale = (m.scale || 1) * 0.9 * (a.scale || 1); m.headScale = (m.headScale || 1) * 0.77;
    const J = CinRig.joints(m); J.rot = rot;
    const out = {};
    for (const k of ['hip', 'shoulder', 'neck', 'head', 'rElbow', 'rHand', 'lElbow', 'lHand', 'rKnee', 'rFoot', 'lKnee', 'lFoot']) out[k] = rotPt(J, J[k]);
    out.headR = J.headR; out.rFore = m.rFore + rot; out.face = s.face;
    out.wAng = m.rFore + rot + (a.wAbs ? 0 : carryTilt(a.f.weaponKey, s.face)); out.bLen = bladeLen(a.f, a.scale);
    return out;
  };
  // Where a point sits against an actor's drawn blade: { d: distance, u: 0 at the hand .. 1 at the tip }.
  L.onBlade = function (key, p, c) {
    const t = L.tip(key, undefined, c), h = t.hand, dx = t.x - h.x, dy = t.y - h.y, l2 = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((p.x - h.x) * dx + (p.y - h.y) * dy) / l2));
    return { d: Math.round(Math.hypot(h.x + dx * u - p.x, h.y + dy * u - p.y)), u: +u.toFixed(2), hand: [Math.round(h.x), Math.round(h.y)], tip: [Math.round(t.x), Math.round(t.y)] };
  };
  // World tip of the actor's blade (len px past the hand; default the drawn blade's length).
  L.tip = function (key, len, c) {
    const J = L.joints(key, c), l = len === undefined ? J.bLen : len;
    return { x: J.rHand.x + Math.cos(J.wAng) * l, y: J.rHand.y + Math.sin(J.wAng) * l, hand: J.rHand };
  };

  // a.wkey: [[c, weaponKey]] — the pattern changing (a different dead bearer's weapon).
  L.applyWeapon = function (a, c) {
    if (!a.wkey) return;
    const k = stepAt(a.wkey, c, a.f.weaponKey);
    if (k && a.f.weaponKey !== k && WEAPONS[k]) { a.f.weaponKey = k; a.f.weapon = WEAPONS[k]; }
  };
  L.drawActor = function (a) {
    const c = L.D.c;
    L.applyWeapon(a, c);
    // Afterimages: [c0, c1, count, gapSeconds, alpha]
    for (const t of a.trail || []) {
      if (c < t[0] || c > t[1]) continue;
      for (let i = t[2]; i >= 1; i--) {
        const cc = c - i * t[3]; const s = L.state(a, cc); if (s.hidden) continue;
        drawFig(a.f, s.q, s.x, L.G - s.h, s.face, { alpha: (t[4] || 0.5) * (1 - i / (t[2] + 1)), color: a.trailColor || a.f.color, scale: a.scale, weapon: false });
      }
    }
    const s = L.state(a, a.twos ? Math.floor(c * 30) / 30 : c);
    if (s.hidden) { a._eyes = 0; return; }
    if (a.aura) L.aura(a, s);
    const glow = a.glowK ? curve(a.glowK, c)[0] : 0;
    a.f.facing = s.face;
    const wAlpha = a.wAlphaK ? curve(a.wAlphaK, c)[0] : undefined;
    a._eyes = a.eyes ? curve(a.eyes, c)[0] : 0;
    if (s.weapon && wAlpha !== 0) L.bladeArc(a, c);
    // Per-actor layers drawn behind (pre) and in front of (post) the body, e.g. the Creator's mantle and halo.
    if (a.pre) { ctx.save(); try { a.pre(ctx, L, a, s); } finally { ctx.restore(); } }
    // a.filter: a canvas filter over this figure and its blade (a prediction is one colour, sprite included).
    if (a.filter) ctx.filter = a.filter;
    // a.pivot (s): a facing change drawn as a turn, the body narrowing to edge-on and opening the other way.
    let sq = 1;
    if (a.pivot && a.face) for (let i = 1; i < a.face.length; i++) { const d = Math.abs(c - a.face[i][0]); if (d < a.pivot && a.face[i][1] !== a.face[i - 1][1]) sq = Math.min(sq, 0.2 + 0.8 * d / a.pivot); }
    if (sq < 1) { ctx.save(); ctx.translate(s.x, 0); ctx.scale(sq, 1); ctx.translate(-s.x, 0); }
    drawFig(a.f, s.q, s.x, L.G - s.h, s.face, { scale: a.scale, expr: s.expr, weapon: s.weapon, alpha: s.alpha < 1 ? s.alpha : undefined,
      glow: glow > 0.01 ? a.f.color : false, glowBlur: 6 + glow * 24, wTilt: a.wTilt, wAbs: a.wAbs, wAlpha,
      clipY: (sk => sk === true ? L.G : typeof sk === 'number' ? L.G + sk : undefined)(stepAt(a.sink, c, false)) });
    if (sq < 1) ctx.restore();
    if (a.filter) ctx.filter = 'none';
    if (a.post) { ctx.save(); try { a.post(ctx, L, a, s); } finally { ctx.restore(); } }
  };

  // The eyes lit: a.eyes [[c, 0..1]]. Drawn in screen space after the grade so a drained world keeps them.
  L.eyeGlow = function (c2) {
    for (const a of Object.values(L.actors)) {
      if (!a._eyes || a._eyes < 0.01) continue;
      const J = L.joints(a.key), cm = L.cam, k = Math.min(canvas.width / GAME_W, canvas.height / GAME_H) * cm.z;
      const ex = J.head.x + J.face * J.headR * 0.38, ey = J.head.y - J.headR * 0.1;
      const sx = canvas.width / 2 + (ex - cm.x) * k, sy = canvas.height / 2 + (ey - cm.y) * k, r = J.headR * k * 0.22;
      const col = a.eyeColor || a.f.color;
      const g = c2.createRadialGradient(sx, sy, 0, sx, sy, r * 3.2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c2.globalCompositeOperation = 'lighter'; c2.globalAlpha = a._eyes; c2.fillStyle = g; c2.beginPath(); c2.arc(sx, sy, r * 3.2, 0, P * 2); c2.fill();
      c2.globalAlpha = a._eyes * 0.6; c2.strokeStyle = col; c2.lineWidth = r * 0.6; c2.beginPath(); c2.moveTo(sx, sy); c2.lineTo(sx - J.face * r * (5 + 2 * Math.sin(L.D.c * 9)), sy - r * 0.4); c2.stroke();
      c2.globalCompositeOperation = 'source-over'; c2.globalAlpha = 1;
    }
  };

  // The blade's arc: a ribbon swept by the outer blade over the last few frames, drawn only when it moves fast.
  // This is the smear a hand-drawn swing has; without it a 60 fps swing reads as a stick teleporting.
  L.bladeArc = function (a, c) {
    if (a.arcs === false) return;
    const N = 7, dt = 1 / 60, pts = [];
    for (let i = 0; i < N; i++) {
      const J = L.joints(a.key, c - i * dt);
      const h = J.rHand, l = J.bLen, an = J.wAng;
      pts.push({ an, ax: h.x + Math.cos(an) * l * 0.55, ay: h.y + Math.sin(an) * l * 0.55, bx: h.x + Math.cos(an) * l, by: h.y + Math.sin(an) * l });
    }
    // Only a swing draws an arc: the blade has to be turning, not just carried along by a moving body.
    let turn = 0; for (let i = 1; i < 3; i++) { let d = Math.abs(pts[i].an - pts[i - 1].an); if (d > P) d = 2 * P - d; turn += d; }
    if (turn < 0.12) return;
    const moved = turn * 120;
    const col = a.arcColor || a.f.color;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = col; ctx.shadowBlur = 14;
    for (let i = 0; i < N - 1; i++) {
      const p = pts[i], q = pts[i + 1], k = 1 - i / (N - 1);
      const dd = Math.hypot(p.bx - q.bx, p.by - q.by);
      if (dd < 2 || dd > 42) continue;
      ctx.globalAlpha = Math.min(1, moved / 40) * 0.32 * k * k;
      ctx.fillStyle = i < 2 ? '#ffffff' : col;
      ctx.beginPath(); ctx.moveTo(p.ax, p.ay); ctx.lineTo(p.bx, p.by); ctx.lineTo(q.bx, q.by); ctx.lineTo(q.ax, q.ay); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  // Rising wisps from the body: a.aura = [[c, intensity]].
  L.aura = function (a, s) {
    const k = curve(a.aura, L.D.c)[0]; if (k <= 0.01) return;
    const J = L.joints(a.key);
    const pts = [J.hip, J.shoulder, J.head, J.rHand, J.lHand, J.rFoot, J.lFoot, J.rKnee, J.lKnee];
    const n = (Math.random() < k * 1.4 * (L.speed || 1) ? 1 : 0) + (Math.random() < k * 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const p = pts[Math.floor(Math.random() * pts.length)];
      L.parts.push({ c: L.D.c, x: p.x + (Math.random() - 0.5) * 10, y: p.y + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 0.5, vy: -0.9 - Math.random() * 1.4 * k,
        life: 16 + Math.random() * 18, r: 1.2 + Math.random() * 1.8 * k, col: a.auraColor || a.f.color, kind: 'wisp' });
    }
  };

  L.place = function () {
    for (const a of Object.values(L.actors)) {
      const s = L.state(a, L.D.c), f = a.f;
      // The game kills a fighter below its death line and stops drawing past the edges; the film draws its own
      // bodies from the choreography, so the game copy stays inside the arena.
      f.x = Math.max(-40, Math.min(900, s.x - f.w / 2)); f.y = Math.max(-300, Math.min(L.G - f.h, L.G - s.h - f.h)); f.vx = 0; f.vy = 0; f.onGround = s.h < 1; f.facing = s.face;
    }
  };
  L.camera = function (snap) {
    const k = curve(L.spec.cam, L.D.c); if (!k) return;
    // A slow handheld drift so no shot is locked off.
    const c = L.D.c, d = L.spec.drift === undefined ? 1 : L.spec.drift;
    const dx = (Math.sin(c * 0.71) * 2.2 + Math.sin(c * 1.93 + 1) * 0.7) * d / Math.max(1, k[2] * 0.6);
    const dy = (Math.cos(c * 0.89) * 1.5 + Math.sin(c * 2.3) * 0.4) * d / Math.max(1, k[2] * 0.6);
    const fall = L.spec.fall ? curve(L.spec.fall, c)[0] : 0;
    L.cam = { x: k[0] + dx, y: L.G - k[1] + dy + fall, z: k[2] * (1 + Math.sin(c * 0.53) * 0.006 * d) };
    L.H.snap(L.cam.x, L.cam.y, L.cam.z);
  };

  // ── per frame ─────────────────────────────────────────────────────────────
  L.tick = function (H) {
    const D = L.D, spec = L.spec;
    const sp = spec.speed ? curve(spec.speed, D.c)[0] : 1;
    L.speed = sp;
    if (D.f > 1) D.c += sp * (spec.tempo || 1) / 60;
    const ws = spec.world ? curve(spec.world, D.c)[0] : 1;
    L.rainT = (L.rainT || 0) + Math.min(sp, ws);
    slowMotion = Math.max(0.02, Math.min(1, sp, ws));
    for (const e of spec.ev || []) if (!e.done && D.c >= e[0]) { e.done = true; try { e[1](L); } catch (er) { (D.log.err || (D.log.err = [])).push('ev ' + e[0] + ': ' + er.message); } }
    if (spec.each) spec.each(L, D.c);
    L.place();
    L.camera();
  };

  // ── effects (world space; ages run in choreography frames, so slow motion slows them) ──
  const age = fx => (L.D.c - fx.c) * 60;
  L.add = function (fx) { fx.c = L.D.c; L.fx.push(fx); return fx; };
  L.slash = (x, y, r, a0, a1, o) => L.add(Object.assign({ t: 'slash', x, y, r, a0: RAD(a0), a1: RAD(a1), life: 14, w: 16, col: '#ffffff' }, o || {}));
  L.ring = (x, y, r1, o) => L.add(Object.assign({ t: 'ring', x, y, r0: 6, r1, life: 22, w: 6, sq: 1, col: '#ffffff' }, o || {}));
  L.streaks = (x, y, n, len, o) => {
    const fx = L.add(Object.assign({ t: 'streaks', x, y, life: 12, col: '#ffffff', w: 3, rays: [] }, o || {}));
    const dir = fx.dir !== undefined ? RAD(fx.dir) : null, spread = RAD(fx.spread || 360);
    for (let i = 0; i < n; i++) {
      const a = dir === null ? Math.random() * P * 2 : dir + (Math.random() - 0.5) * spread;
      fx.rays.push({ a, len: len * (0.5 + Math.random() * 0.8), d0: Math.random() * 10 });
    }
    return fx;
  };
  L.debris = (x, y, n, o) => {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = RAD((o.dir !== undefined ? o.dir : -90) + (Math.random() - 0.5) * (o.spread || 120)), v = (o.v || 6) * (0.4 + Math.random() * 0.9);
      L.parts.push({ c: L.D.c, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g !== undefined ? o.g : 0.32, life: o.life || 50 + Math.random() * 30,
        r: (o.r || 4) * (0.5 + Math.random()), col: o.col || '#6b6670', kind: o.kind || 'rock', spin: Math.random() * 6, floor: L.G });
    }
  };
  L.dust = (x, n, spread, o) => {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) - 0.5 : 0;
      L.parts.push({ c: L.D.c + (i % 3) / 60, x: x + k * spread, y: (o.y !== undefined ? o.y : L.G) - 4, vx: k * (o.v || 2.4), vy: -(0.3 + (i % 4) * 0.15),
        life: (o.life || 42) + (i % 5) * 6, r: (o.r || 10) + (i % 3) * 3, a: o.a || 0.45, col: o.col || (i % 2 ? '#8d8a9a' : '#5d5a6a'), kind: 'dust' });
    }
  };
  L.crack = (x, w, o) => { L.cracks.push(Object.assign({ c: L.D.c, x, w, seed: Math.random() * 1000, col: '#ff3311' }, o || {})); };
  L.burst = (x, y, n, col) => { spawnParticles(x, y, col || '#ffe9a0', n); spawnParticles(x, y, '#ffffff', Math.round(n / 2)); };
  // Screen effects: flash, impact frame, speed lines.
  L.flash = (col, a, life) => L.screenFx.push({ t: 'flash', c: L.D.c, col: col || '#ffffff', a: a || 0.6, life: life || 10 });
  L.impact = (len, o) => L.screenFx.push(Object.assign({ t: 'impact', c: L.D.c, life: len || 3 }, o || {}));
  L.lines = (life, o) => L.screenFx.push(Object.assign({ t: 'lines', c: L.D.c, life: life || 20, col: '#ffffff', n: 40, seed: Math.random() * 100 }, o || {}));
  L.sfx = (k, g, r, pan) => L.D.sfx.push({ f: L.D.f, k, g: g === undefined ? 0.9 : g, r: r || 1, pan: pan || 0 });
  L.shake = n => { screenShake = Math.max(screenShake, n); };
  // Sovereign's read: a ghost of `key` posed `lead` seconds ahead of now.
  L.ghosts = [];
  // A prediction that is wrong: the ghost holds a pose Kael never takes; shatter it at c1.
  L.ghostPose = (key, c0, c1, pose, o) => L.ghosts.push(Object.assign({ key, c0, c1, pose, lead: 0, col: '#ff3311' }, o || {}));
  L.shatter = (key, pose, dx, col) => {
    const a = L.actors[key], s = L.state(a, L.D.c);
    const J = (() => { const q = resolve(pose); const m = s.face < 0 ? mirror(q) : q; m.x = s.x + (dx || 0); m.y = L.G - s.h; m.facing = s.face; m.scale = 0.9 * (a.scale || 1); m.headScale = 0.77; return CinRig.joints(m); })();
    const pts = [J.head, J.neck, J.hip, J.rHand, J.lHand, J.rFoot, J.lFoot, J.rElbow, J.lElbow, J.rKnee, J.lKnee];
    for (const p of pts) L.debris(p.x, p.y, 4, { v: 3, kind: 'spark', col: col || '#ff3311', r: 2.4, life: 30, g: 0.08, spread: 360 });
    L.ring(J.hip.x, J.hip.y - 10, 50, { col: col || '#ff3311', w: 2, life: 16 });
  };
  L.ghost = (key, c0, c1, lead, o) => L.ghosts.push(Object.assign({ key, c0, c1, lead, col: '#ff3311' }, o || {}));

  // Energy surge: the body's power breaking out all at once (column of flame-light, a ring, a glow bloom).
  L.surge = function (key, col, power, o) {
    o = o || {};
    const pw = power || 1, J = L.joints(key);
    const pts = [J.hip, J.shoulder, J.head, J.rHand, J.lHand, J.rFoot, J.lFoot, J.rKnee, J.lKnee];
    for (let i = 0; i < Math.round(40 * pw); i++) {
      const p = pts[i % pts.length];
      L.parts.push({ c: L.D.c + (i % 6) / 60, x: p.x + (Math.random() - 0.5) * 16, y: p.y + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 1.6 * pw, vy: -2 - Math.random() * 3.5 * pw,
        life: 22 + Math.random() * 26, r: 1.8 + Math.random() * 3 * pw, col, kind: 'wisp' });
    }
    L.ring(J.hip.x, L.G, 70 * pw + 30, { sq: 0.2, col, w: 6, life: 30 });
    L.add({ t: 'draw', life: o.life || 40, fn: (c, k) => {
      const J2 = L.joints(key), cx = J2.shoulder.x, cy = (J2.head.y + L.G) / 2, r = (60 + 50 * pw) * (0.6 + k * 0.6);
      const g = c.createRadialGradient(cx, cy, 4, cx, cy, r);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.45 * (1 - k) * Math.min(1, pw); c.fillStyle = g;
      c.beginPath(); c.ellipse(cx, cy, r * 0.7, r, 0, 0, P * 2); c.fill();
      // Rising columns of light.
      c.globalAlpha = 0.6 * (1 - k); c.strokeStyle = col; c.lineCap = 'round'; c.shadowColor = col; c.shadowBlur = 16;
      for (let i = 0; i < 7; i++) {
        const x = cx + (i - 3) * 9 + Math.sin(i * 7 + k * 6) * 4, h = (70 + (i * 37) % 60) * pw * (0.4 + k);
        c.lineWidth = 2.4 * (1 - k) + 0.6; c.beginPath(); c.moveTo(x, L.G - 2); c.lineTo(x + Math.sin(i + k * 9) * 5, L.G - 2 - h); c.stroke();
      }
    } });
  };

  // The manifested arm (canon): the weapon crystallizes out of fragment-light, shards converging along the
  // line of the grip. Draw this while the actor's wAlphaK brings the blade in.
  L.manifest = function (key, col, dur) {
    const shards = [];
    for (let i = 0; i < 26; i++) shards.push({ u: Math.random(), a: Math.random() * P * 2, r: 40 + Math.random() * 70, w: 2 + Math.random() * 4, sp: 0.7 + Math.random() * 0.6 });
    L.add({ t: 'draw', life: (dur || 0.6) * 60, fn: (c, k) => {
      const J = L.joints(key), h = J.rHand, an = J.wAng, l = J.bLen;
      c.globalCompositeOperation = 'lighter'; c.shadowColor = col; c.shadowBlur = 12; c.fillStyle = col;
      for (const sh of shards) {
        const kk = Math.min(1, k * sh.sp * 1.4), e = 1 - Math.pow(1 - kk, 3);
        const tx = h.x + Math.cos(an) * l * (sh.u * 1.15 - 0.15), ty = h.y + Math.sin(an) * l * (sh.u * 1.15 - 0.15);
        const x = tx + Math.cos(sh.a) * sh.r * (1 - e), y = ty + Math.sin(sh.a) * sh.r * (1 - e);
        c.globalAlpha = (kk < 1 ? 0.9 : 0.9 * (1 - (k - 0.7) / 0.3)) * Math.min(1, k * 8);
        c.save(); c.translate(x, y); c.rotate(sh.a + k * 4); c.beginPath(); c.moveTo(-sh.w, 0); c.lineTo(0, -sh.w * 0.45); c.lineTo(sh.w, 0); c.lineTo(0, sh.w * 0.45); c.closePath(); c.fill(); c.restore();
      }
      // The grip line lighting up as it resolves.
      c.globalAlpha = Math.sin(Math.min(1, k * 1.2) * P) * 0.8; c.strokeStyle = '#ffffff'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + Math.cos(an) * l * Math.min(1, k * 1.6), h.y + Math.sin(an) * l * Math.min(1, k * 1.6)); c.stroke();
    } });
  };

  // The reverse: the pattern letting go, the weapon breaking back into light (canon: slower than forming).
  L.disperse = function (key, col, dur) {
    const J = L.joints(key), h = J.rHand, an = J.wAng, l = J.bLen, shards = [];
    for (let i = 0; i < 30; i++) { const u = Math.random(); shards.push({ x: h.x + Math.cos(an) * l * u, y: h.y + Math.sin(an) * l * u, a: Math.random() * P * 2, v: 0.4 + Math.random() * 1.4, w: 2 + Math.random() * 3.5 }); }
    L.add({ t: 'draw', life: (dur || 0.9) * 60, fn: (c, k, ag) => {
      c.globalCompositeOperation = 'lighter'; c.shadowColor = col; c.shadowBlur = 10; c.fillStyle = col;
      for (const sh of shards) {
        const x = sh.x + Math.cos(sh.a) * sh.v * ag, y = sh.y + Math.sin(sh.a) * sh.v * ag - ag * 0.3;
        c.globalAlpha = 0.85 * (1 - k);
        c.save(); c.translate(x, y); c.rotate(sh.a + ag * 0.1); c.beginPath(); c.moveTo(-sh.w, 0); c.lineTo(0, -sh.w * 0.45); c.lineTo(sh.w, 0); c.lineTo(0, sh.w * 0.45); c.closePath(); c.fill(); c.restore();
      }
    } });
  };

  // A dead bearer: a grey stranger, translucent, holding the weapon of his pattern. Sovereign has all ninety-four
  // on file, so he sees the bearer before Kael moves. bearer(key, c0, c1, lead, weaponKey): drawn in Kael's own
  // motion `lead` seconds ahead, a little offset, as a different person.
  L.bearers = [];
  L.bearer = (key, c0, c1, lead, wk, o) => L.bearers.push(Object.assign({ key, c0, c1, lead, wk, col: '#aab0bc', dx: -10 }, o || {}));
  L.drawBearers = function () {
    const c = L.D.c;
    for (const b of L.bearers) {
      if (c < b.c0 || c > b.c1) continue;
      const a = L.actors[b.key], s = L.state(a, c + b.lead);
      const fin = Math.min(1, (c - b.c0) * 60 / 8) * Math.min(1, (b.c1 - c) * 60 / 8);
      const gf = b.f || (b.f = Object.create(a.f));
      gf.weaponKey = b.wk; gf.weapon = WEAPONS[b.wk]; gf.color = b.col; gf.weaponTheme = null;
      const q = Object.assign({}, s.q, { headScale: 1.08, torsoW: 1.15 });
      drawFig(gf, q, s.x + b.dx, L.G - s.h, s.face, { alpha: 0.42 * fin, color: b.col, scale: (a.scale || 1) * 1.06, glow: '#ffffff', glowBlur: 8 });
    }
  };

  // Sovereign's domain (the game's Absolute Dominion): red walls closing a corridor around a centre line,
  // the field tinted, the light raked by red lines. spec.dominion: [[c, halfWidth, strength]], spec.domX.
  L.drawDominion = function (which, c2, W, Hh) {
    if (!L.spec.dominion) return;
    const k = curve(L.spec.dominion, L.D.c), hw = k[0], st = k[1]; if (st <= 0.01) return;
    const cx = L.spec.domX || 450, c = L.D.c;
    if (which === 'world') {
      const ctx2 = ctx;
      for (const side of [-1, 1]) {
        const ex = cx + side * hw;
        ctx2.save();
        const g = ctx2.createLinearGradient(ex, 0, ex + side * 120, 0);
        g.addColorStop(0, 'rgba(255,51,17,' + (0.55 * st) + ')'); g.addColorStop(0.15, 'rgba(70,0,0,' + (0.75 * st) + ')'); g.addColorStop(1, 'rgba(20,0,0,' + (0.85 * st) + ')');
        ctx2.fillStyle = g; ctx2.fillRect(side < 0 ? ex - 3000 : ex, L.G - 2000, 3000, 2600);
        ctx2.strokeStyle = '#ff3311'; ctx2.lineWidth = 3; ctx2.shadowColor = '#ff3311'; ctx2.shadowBlur = 24; ctx2.globalAlpha = st;
        ctx2.beginPath(); ctx2.moveTo(ex, L.G - 2000); ctx2.lineTo(ex, L.G + 600); ctx2.stroke();
        // Charge running up the wall face.
        ctx2.lineWidth = 1.4;
        for (let i = 0; i < 6; i++) {
          const y = L.G - ((c * 140 + i * 97) % 600);
          ctx2.globalAlpha = st * 0.7; ctx2.beginPath(); ctx2.moveTo(ex, y); ctx2.lineTo(ex + side * 18, y - 14); ctx2.stroke();
        }
        ctx2.restore();
      }
      return;
    }
    // Screen: the red grade and the raking lines (the game's sovereign domain background).
    c2.fillStyle = 'rgba(40,0,0,' + (0.38 * st) + ')'; c2.fillRect(0, 0, W, Hh);
    c2.strokeStyle = '#ff3311'; c2.lineWidth = 1.2 * W / 1920;
    for (let i = 0; i < 12; i++) {
      const gx = ((i * 190 + c * 40) % (W + 200)) - 100;
      c2.globalAlpha = st * 0.12; c2.beginPath(); c2.moveTo(gx, 0); c2.lineTo(gx - 60, Hh); c2.stroke();
    }
    c2.globalAlpha = 1;
  };

  // Kael's domain, Death's Dojo (the Ronin domain in the game: "Every cut waits. The sheath decides."): an ink-dark
  // field, a pale duel ring on the ground, ash drifting. spec.dojo: [[c, radius, strength]], spec.dojoX.
  L.drawDojo = function (which, c2, W, Hh) {
    if (!L.spec.dojo) return;
    const k = curve(L.spec.dojo, L.D.c), r = k[0], st = k[1]; if (st <= 0.01) return;
    const cx = L.spec.dojoX || 450, c = L.D.c;
    if (which === 'world') {
      ctx.save();
      ctx.strokeStyle = '#ccccff'; ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 18; ctx.globalAlpha = 0.8 * st; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(cx, L.G + 2, r, r * 0.12, 0, 0, P * 2); ctx.stroke();
      ctx.globalAlpha = 0.35 * st; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, L.G + 2, r * 0.82, r * 0.1, 0, 0, P * 2); ctx.stroke();
      // The ring's edge rising as a faint wall of light.
      const g = ctx.createLinearGradient(0, L.G, 0, L.G - 260);
      g.addColorStop(0, 'rgba(204,204,255,' + (0.16 * st) + ')'); g.addColorStop(1, 'rgba(204,204,255,0)');
      ctx.fillStyle = g; ctx.shadowBlur = 0; ctx.fillRect(cx - r, L.G - 260, 3, 260); ctx.fillRect(cx + r - 3, L.G - 260, 3, 260);
      // Ash.
      ctx.fillStyle = '#e8e8ff';
      for (let i = 0; i < 46; i++) {
        const sx = ((i * 97.3 + c * 18 * (1 + (i % 3) * 0.3)) % (r * 2)) + cx - r, sy = L.G - ((i * 53.1 + c * 30 * (0.5 + (i % 4) * 0.2)) % 300);
        ctx.globalAlpha = st * (0.25 + (i % 5) * 0.08); ctx.beginPath(); ctx.ellipse(sx, sy, 1.6, 0.8, i, 0, P * 2); ctx.fill();
      }
      ctx.restore();
      return;
    }
    c2.fillStyle = 'rgba(5,5,25,' + (0.32 * st) + ')'; c2.fillRect(0, 0, W, Hh);
  };
  // Cuts that wait: a pale slash left hanging where a cut landed, until L.detonate().
  L.marks = [];
  // With key + joint, the mark rides on that joint of that actor (it was cut into him).
  L.cutMark = (x, y, ang, len, key, joint) => {
    const m = { x, y, a: RAD(ang), len: len || 40, c: L.D.c, boom: null, key, joint };
    if (key) { const p = L.joints(key)[joint]; m.ox = x - p.x; m.oy = y - p.y; }
    L.marks.push(m);
  };
  const markPos = m => { if (!m.key) return m; const p = L.joints(m.key)[m.joint]; return { x: p.x + m.ox, y: p.y + m.oy }; };
  L.detonate = () => {
    L.marks.forEach((m, i) => {
      m.boom = L.D.c + i * 0.025;
      L.add({ t: 'draw', life: 30, fn: (c, k, ag) => {
        if (L.D.c < m.boom) return;
        const kk = Math.min(1, (L.D.c - m.boom) * 60 / 22);
        c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffffff'; c.shadowColor = '#ccccff'; c.shadowBlur = 24;
        c.globalAlpha = 1 - kk; c.lineWidth = 10 * (1 - kk) + 1;
        const l = m.len * (1 + kk * 1.4), q = markPos(m);
        c.beginPath(); c.moveTo(q.x - Math.cos(m.a) * l, q.y - Math.sin(m.a) * l); c.lineTo(q.x + Math.cos(m.a) * l, q.y + Math.sin(m.a) * l); c.stroke();
        c.beginPath(); c.arc(q.x, q.y, 30 * kk + 4, 0, P * 2); c.stroke();
      } });
    });
  };
  L.drawMarks = function () {
    const c = L.D.c;
    for (const m of L.marks) {
      if (m.boom !== null && c >= m.boom) continue;
      const a = Math.min(1, (c - m.c) * 60 / 4), l = m.len * a, q = markPos(m);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#e6e6ff'; ctx.shadowColor = '#ccccff'; ctx.shadowBlur = 12;
      ctx.globalAlpha = 0.85 + Math.sin(c * 20 + m.x) * 0.1; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(q.x - Math.cos(m.a) * l, q.y - Math.sin(m.a) * l); ctx.lineTo(q.x + Math.cos(m.a) * l, q.y + Math.sin(m.a) * l); ctx.stroke();
      ctx.restore();
    }
  };

  // ── painted city (the game's city palette: dark slabs, warm square windows, a cold far skyline) ──
  function srand(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  // The world rectangle the camera sees.
  L.view = function () {
    const cm = L.cam || { x: 450, y: L.G - 100, z: 1 }, k = Math.min(canvas.width / GAME_W, canvas.height / GAME_H) * cm.z;
    return { x0: cm.x - canvas.width / 2 / k, x1: cm.x + canvas.width / 2 / k, y0: cm.y - canvas.height / 2 / k, y1: cm.y + canvas.height / 2 / k, cx: cm.x, cy: cm.y };
  };
  // o: { street: y of the street (world), left: x of the left tower's alley face, right: x of the right tower's face,
  //      leftTop / rightTop: roof y of each tower, rain }
  L.paintCity = function (c, o) {
    const v = L.view(), W = v.x1 - v.x0, Hh = v.y1 - v.y0;
    // Sky.
    const g = c.createLinearGradient(0, v.y0, 0, v.y1);
    g.addColorStop(0, '#060614'); g.addColorStop(1, '#121228');
    c.fillStyle = g; c.fillRect(v.x0 - 20, v.y0 - 20, W + 40, Hh + 40);
    // Far and mid skylines, parallax in both axes (the camera falling past them).
    const layer = (p, seed, base, hMin, hMax, body, win, ww, wh, sx, sy) => {
      const ox = v.cx * (1 - p), oy = v.cy * (1 - p);
      const R = srand(seed); const blds = []; let bx = -2400;
      while (bx < 4200) { const bw = 50 + R() * 110, bh = hMin + R() * (hMax - hMin); blds.push({ x: bx, w: bw, h: bh, s: R() * 1000 }); bx += bw + 6 + R() * 10; }
      for (const b of blds) {
        const x = b.x + ox, top = base - b.h + oy;
        if (x > v.x1 || x + b.w < v.x0) continue;
        c.fillStyle = body; c.fillRect(x, top, b.w, base + oy + 4000 - top);
        const r2 = srand(b.s);
        for (let wy = top + 8; wy < Math.min(v.y1, base + oy + 4000); wy += sy) {
          if (wy < v.y0 - 10) continue;
          for (let wx = x + 5; wx < x + b.w - 6; wx += sx) if (r2() > 0.45) { c.fillStyle = win; c.fillRect(wx, wy, ww, wh); }
        }
      }
    };
    layer(0.12, 7, L.G + 80, 140, 420, 'rgba(16,18,32,0.95)', 'rgba(190,205,255,0.16)', 3, 5, 9, 14);
    layer(0.4, 11, L.G + 60, 160, 520, 'rgb(13,13,24)', 'rgba(255,235,160,0.14)', 4, 6, 12, 16);
    // The two towers the alley runs between.
    const tower = (x0, x1, top, seed, faceSide) => {
      if (x1 < v.x0 || x0 > v.x1) return;
      const bot = (o.street || L.G + 3000) + 200;
      c.fillStyle = 'rgb(28,28,44)'; c.fillRect(x0, top, x1 - x0, bot - top);
      c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(faceSide > 0 ? x1 - 10 : x0, top, 10, bot - top);
      const R = srand(seed);
      for (let wy = top + 14; wy < bot - 30; wy += 17) {
        const on = wy > v.y0 - 20 && wy < v.y1 + 20;
        for (let wx = x0 + 8; wx < x1 - 10; wx += 14) { const lit = R() > 0.3; if (!on || wx < v.x0 - 10 || wx > v.x1) continue; c.fillStyle = lit ? 'rgba(255,245,160,0.65)' : 'rgba(40,40,60,0.55)'; c.fillRect(wx, wy, 7, 9); }
      }
      // Window ledges jutting into the alley every few floors (footholds).
      const ex = faceSide > 0 ? x1 : x0;
      for (let ly = top + 120; ly < bot - 60; ly += 150) {
        if (ly < v.y0 - 20 || ly > v.y1 + 20) continue;
        c.fillStyle = 'rgb(52,52,74)'; c.fillRect(faceSide > 0 ? ex : ex - 18, ly, 18, 6);
        c.fillStyle = 'rgba(120,120,160,0.6)'; c.fillRect(faceSide > 0 ? ex : ex - 18, ly, 18, 1.5);
      }
    };
    const ag = c.createLinearGradient(o.left, 0, o.right, 0);
    ag.addColorStop(0, 'rgba(0,0,0,0.55)'); ag.addColorStop(0.5, 'rgba(0,0,0,0.2)'); ag.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = ag; c.fillRect(o.left, v.y0 - 20, o.right - o.left, Hh + 40);
    tower(-2600, o.left, o.leftTop, 21, 1);
    tower(o.right, o.right + 2600, o.rightTop, 33, -1);
    // The roof slab on the left tower (where they fought).
    c.fillStyle = '#33334a'; c.fillRect(-2600, o.leftTop, 2600 + o.left, 14);
    c.fillStyle = '#55556a'; c.fillRect(-2600, o.leftTop, 2600 + o.left, 2);
    // The street.
    if (o.street && o.street < v.y1 + 50) {
      const y = o.street;
      c.fillStyle = '#1c1c28'; c.fillRect(v.x0 - 20, y, W + 40, 400);
      c.fillStyle = '#2a2a3a'; c.fillRect(v.x0 - 20, y, W + 40, 5);
      c.fillStyle = 'rgba(230,220,140,0.5)';
      for (let x = Math.floor((v.x0 - 40) / 60) * 60; x < v.x1 + 40; x += 60) c.fillRect(x, y + 18, 30, 2.5);
      // Street lamps along the far kerb, light pooling on the road.
      for (let x = Math.floor((v.x0 - 200) / 260) * 260 + 40; x < v.x1 + 200; x += 260) {
        c.fillStyle = '#2b2b3d'; c.fillRect(x, y - 120, 3, 120); c.fillRect(x, y - 120, 22, 3);
        const lg = c.createRadialGradient(x + 20, y - 6, 2, x + 20, y - 6, 90);
        lg.addColorStop(0, 'rgba(255,230,160,0.22)'); lg.addColorStop(1, 'rgba(255,230,160,0)');
        c.fillStyle = lg; c.fillRect(x - 80, y - 120, 200, 140);
        c.fillStyle = '#ffe9a8'; c.fillRect(x + 16, y - 117, 8, 3);
      }
    }
    // Rain: world-space streaks keyed to the camera so they cover the frame.
    if (o.rain !== false) {
      const R = srand(5), n = 140, t = L.rainT || 0;
      c.strokeStyle = 'rgba(170,190,230,0.22)'; c.lineWidth = 1;
      c.beginPath();
      for (let i = 0; i < n; i++) {
        const rx = R(), ry = R(), sp = 9 + R() * 5;
        const x = v.x0 + ((rx * W + t * 1.2) % W), y = v.y0 + ((ry * Hh + t * sp + (o.rainRise || 0)) % Hh);
        c.moveTo(x, y); c.lineTo(x - 1.6, y + 10 + (o.rainStretch || 0));
      }
      c.stroke();
    }
  };

  // Sovereign's recognition (canon: a candidate set collapsing). Past opponents flicker over the target, in
  // stances that are not his, and narrow down until one remains: the one he is.
  L.catalogue = function (key, dur, o) {
    o = o || {};
    const names = Object.keys(POSES).filter(n => !/^sov|fallen|stand$/.test(n));
    const slots = []; for (let i = 0; i < 14; i++) slots.push({ dx: (Math.random() - 0.5) * 34, pose: names[Math.floor(Math.random() * names.length)], until: 0 });
    L.add({ t: 'draw', life: dur * 60, fn: (c, k, ag) => {
      const a = L.actors[key], s = L.state(a, L.D.c);
      const n = o.expand ? Math.max(1, Math.round(14 * Math.pow(k, 0.7))) : Math.max(1, Math.round(14 * Math.pow(1 - k, 1.6)));
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const sl = slots[i];
        if (ag >= sl.until) { sl.pose = names[Math.floor(Math.random() * names.length)]; sl.until = ag + 3 + Math.floor(Math.random() * 5); sl.dx = (Math.random() - 0.5) * 30 * (1 - k); }
        const last = n === 1 && !o.expand;
        const q = last ? s.q : resolve(sl.pose);
        drawFig(a.f, q, s.x + (last ? 0 : sl.dx), L.G - s.h, s.face, { alpha: (last ? 0.55 : 0.16 + Math.random() * 0.1) * Math.min(1, ag / 6) * (1 - Math.max(0, k - 0.85) / 0.15),
          color: last ? (o.col || '#ff3311') : (i % 3 ? '#a04a40' : '#7a7a8a'), scale: a.scale, weapon: false });
      }
    } });
  };

  L.layer = function (which) {
    const c = L.D.c;
    if (which === 'under') {
      if (L.spec.backdrop) { ctx.save(); try { L.spec.backdrop(ctx, L); } finally { ctx.restore(); } }
      L.drawDominion('world');
      L.drawDojo('world');
      L.drawBearers();
      // Ground cracks.
      for (const k of L.cracks) {
        const a = (c - k.c) * 60, grow = Math.min(1, a / 6), fade = k.life ? Math.max(0, 1 - Math.max(0, a - k.life) / 40) : 1;
        if (fade <= 0) continue;
        ctx.save(); ctx.globalAlpha = fade; ctx.strokeStyle = k.col; ctx.shadowColor = k.col; ctx.shadowBlur = 10; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        let s = k.seed; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
        for (let j = 0; j < 7; j++) {
          const dir = j % 2 ? 1 : -1; let x = k.x, y = L.G + 1; ctx.beginPath(); ctx.moveTo(x, y);
          const len = k.w * (0.4 + R() * 0.6) * grow;
          for (let st = 0; st < 5; st++) { x += dir * len / 5; y += (R() - 0.3) * 3; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.restore();
      }
      // Sovereign's reads (behind the bodies).
      for (const g of L.ghosts) {
        if (c < g.c0 || c > g.c1) continue;
        const a = L.actors[g.key], cc = c + g.lead, s = L.state(a, cc);
        if (g.pose) s.q = resolve(g.pose);
        const fin = Math.min(1, (c - g.c0) * 60 / 6) * Math.min(1, (g.c1 - c) * 60 / 6);
        const jit = (Math.random() - 0.5) * 6;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (g.pose) { drawFig(a.f, s.q, s.x + jit + (g.dx || 0), L.G - s.h, s.face, { alpha: 0.5 * fin, color: g.col, scale: a.scale, weapon: false, glow: g.col, glowBlur: 16 }); ctx.restore(); continue; }
        drawFig(a.f, s.q, s.x + jit + (g.dx || 0), L.G - s.h, s.face, { alpha: 0.5 * fin, color: g.col, scale: a.scale, weapon: false, glow: g.col, glowBlur: 16 });
        drawFig(a.f, s.q, s.x - jit * 1.5 + 4 + (g.dx || 0), L.G - s.h, s.face, { alpha: 0.2 * fin, color: '#ffffff', scale: a.scale, weapon: false });
        // Scan lines across the ghost.
        ctx.globalAlpha = 0.35 * fin; ctx.fillStyle = g.col;
        const J = L.joints(g.key, cc);
        for (let yy = J.head.y - J.headR; yy < L.G - s.h; yy += 5) if (Math.random() < 0.5) ctx.fillRect(s.x - 26 + Math.random() * 6, yy, 52, 1.2);
        ctx.restore();
      }
      return;
    }
    // over: particles and effects
    L.drawMarks();
    const keep = [];
    for (const p of L.parts) {
      const a = (c - p.c) * 60; if (a < 0) { keep.push(p); continue; } if (a > p.life) continue; keep.push(p);
      const k = a / p.life;
      ctx.save();
      if (p.kind === 'dust') {
        ctx.globalAlpha = (1 - k) * p.a; ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x + p.vx * a, p.y + p.vy * a, p.r * (0.6 + k * 1.8), 0, P * 2); ctx.fill();
      } else if (p.kind === 'wisp') {
        ctx.globalAlpha = (1 - k) * 0.55; ctx.fillStyle = p.col; ctx.shadowColor = p.col; ctx.shadowBlur = 8;
        const x = p.x + p.vx * a + Math.sin(a * 0.25 + p.r * 3) * 2, y = p.y + p.vy * a;
        ctx.beginPath(); ctx.ellipse(x, y, p.r * (1 - k * 0.6), p.r * (2.6 - k * 1.4), 0, 0, P * 2); ctx.fill();
      } else {
        const x = p.x + p.vx * a, y = Math.min(p.floor - 2, p.y + p.vy * a + 0.5 * (p.g || 0) * a * a);
        ctx.globalAlpha = Math.min(1, (1 - k) * 2); ctx.fillStyle = p.col;
        if (p.kind === 'spark') { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = p.col; ctx.lineWidth = p.r * 0.6; ctx.shadowColor = p.col; ctx.shadowBlur = 8;
          const vy = p.vy + (p.g || 0) * a; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * 2.5, y - vy * 2.5); ctx.stroke(); }
        else { ctx.translate(x, y); ctx.rotate(p.spin + a * 0.1); ctx.fillRect(-p.r, -p.r * 0.7, p.r * 2, p.r * 1.4); }
      }
      ctx.restore();
    }
    L.parts = keep;
    const live = [];
    for (const fx of L.fx) {
      const a = age(fx); if (a > fx.life) continue; live.push(fx); if (a < 0) continue;
      const k = a / fx.life;
      ctx.save(); ctx.lineCap = 'round';
      if (fx.t === 'slash') {
        // A crescent that sweeps open over the first frames and thins as it fades.
        const reveal = Math.min(1, a / (fx.open || 3)), a1 = fx.a0 + (fx.a1 - fx.a0) * reveal;
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = fx.glow || fx.col; ctx.shadowBlur = 22;
        const steps = 18;
        for (let i = 0; i < steps; i++) {
          const u0 = i / steps, u1 = (i + 1) / steps;
          const wv = fx.w * Math.sin(Math.min(1, (u0 + u1) / 2) * P) * (1 - k);
          if (wv < 0.3) continue;
          ctx.strokeStyle = i > steps * 0.55 ? '#ffffff' : (fx.glow || fx.col); ctx.globalAlpha = (1 - k);
          ctx.lineWidth = wv; ctx.beginPath(); ctx.ellipse(fx.x, fx.y, fx.r, fx.r * (fx.sq || 1), RAD(fx.tilt || 0), fx.a0 + (a1 - fx.a0) * u0, fx.a0 + (a1 - fx.a0) * u1, fx.a1 < fx.a0); ctx.stroke();
        }
      } else if (fx.t === 'ring') {
        const r = fx.r0 + (fx.r1 - fx.r0) * (1 - Math.pow(1 - k, 3));
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = fx.col; ctx.lineWidth = fx.w * (1 - k) + 0.5; ctx.shadowColor = fx.col; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.ellipse(fx.x, fx.y, r, r * fx.sq, 0, 0, P * 2); ctx.stroke();
      } else if (fx.t === 'streaks') {
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = fx.col; ctx.shadowColor = fx.col; ctx.shadowBlur = 10;
        for (const r of fx.rays) {
          const d0 = r.d0 + r.len * 0.9 * k, d1 = d0 + r.len * (1 - k);
          ctx.globalAlpha = 1 - k; ctx.lineWidth = fx.w * (1 - k) + 0.4;
          ctx.beginPath(); ctx.moveTo(fx.x + Math.cos(r.a) * d0, fx.y + Math.sin(r.a) * d0); ctx.lineTo(fx.x + Math.cos(r.a) * d1, fx.y + Math.sin(r.a) * d1); ctx.stroke();
        }
      } else if (fx.t === 'draw' && fx.fn) {
        fx.fn(ctx, k, a);
      }
      ctx.restore();
    }
    L.fx = live;
  };

  // ── screen layer: effects, grade, letterbox ───────────────────────────────
  L.drawScreen = function (c2, W, Hh) {
    if (window.__ENV.NOSCREEN) return;
    const c = L.D.c, keep = [];
    for (const s of L.screenFx) {
      const a = (c - s.c) * 60; if (a > s.life) continue; keep.push(s); if (a < 0) continue;
      const k = a / s.life;
      if (s.t === 'flash') { c2.globalAlpha = s.a * (1 - k); c2.fillStyle = s.col; c2.fillRect(0, 0, W, Hh); c2.globalAlpha = 1; }
      else if (s.t === 'impact') {
        // Two-tone impact frame: the frame inverted to high-contrast black and white, tinted.
        // Dark by default (black field, the shapes cut out in light): a white field is a full-screen flash, and those
        // are a budget kept for the finale (s.invert).
        if (s.invert) { c2.filter = 'grayscale(1) invert(1) contrast(6)'; c2.drawImage(canvas, 0, 0); c2.filter = 'none'; }
        else {
          const off = L._off || (L._off = document.createElement('canvas'));
          if (off.width !== W || off.height !== Hh) { off.width = W; off.height = Hh; }
          const oc = off.getContext('2d'); oc.clearRect(0, 0, W, Hh); oc.drawImage(canvas, 0, 0);
          c2.fillStyle = '#000'; c2.fillRect(0, 0, W, Hh);
          c2.filter = 'grayscale(1) brightness(1.25) contrast(14)'; c2.drawImage(off, 0, 0); c2.filter = 'none';
        }
        if (s.tint) { c2.globalCompositeOperation = 'multiply'; c2.fillStyle = s.tint; c2.fillRect(0, 0, W, Hh); c2.globalCompositeOperation = 'source-over'; }
      } else if (s.t === 'lines') {
        // Speed lines: radial (toward cx, cy) or parallel (dir in degrees).
        let sd = s.seed; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
        c2.strokeStyle = s.col; c2.lineCap = 'round';
        const fade = Math.min(1, a / 3) * (1 - k);
        for (let i = 0; i < s.n; i++) {
          c2.globalAlpha = fade * (0.25 + R() * 0.5); c2.lineWidth = 1 + R() * 3 * (W / 1920);
          if (s.dir !== undefined) {
            const d = RAD(s.dir), y = R() * Hh, x = ((R() * W * 2 + a * 90 * (W / 1920)) % (W * 1.6)) - W * 0.3, len = (80 + R() * 260) * (W / 1920);
            c2.beginPath(); c2.moveTo(x, y); c2.lineTo(x + Math.cos(d) * len, y + Math.sin(d) * len); c2.stroke();
          } else {
            const an = R() * P * 2, r0 = (0.32 + R() * 0.3) * W * (1 - k * 0.2), r1 = W * 1.2;
            const cx = (s.cx !== undefined ? s.cx : 0.5) * W, cy = (s.cy !== undefined ? s.cy : 0.5) * Hh;
            c2.beginPath(); c2.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); c2.lineTo(cx + Math.cos(an) * r1, cy + Math.sin(an) * r1); c2.stroke();
          }
        }
        c2.globalAlpha = 1;
      }
    }
    L.screenFx = keep;
    L.drawDojo('screen', c2, W, Hh);
    L.drawDominion('screen', c2, W, Hh);
    // Colour drained out of the world (time stopping): spec.desat [[c, 0..1]].
    if (L.spec.desat) { const d = curve(L.spec.desat, c)[0]; if (d > 0.01) { c2.globalCompositeOperation = 'saturation'; c2.globalAlpha = d; c2.fillStyle = '#808080'; c2.fillRect(0, 0, W, Hh); c2.globalCompositeOperation = 'source-over'; c2.globalAlpha = 1; } }
    if (L.spec.afterGrade) L.spec.afterGrade(c2, W, Hh, L);
    L.eyeGlow(c2);
    // Grade: vignette, then the letterbox.
    const v = c2.createRadialGradient(W / 2, Hh / 2, Hh * 0.35, W / 2, Hh / 2, W * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (L.spec.vignette !== undefined ? L.spec.vignette : 0.5) + ')');
    c2.fillStyle = v; c2.fillRect(0, 0, W, Hh);
    if (L.spec.fade) { const f = curve(L.spec.fade, c)[0]; if (f > 0.001) { c2.globalAlpha = f; c2.fillStyle = '#000'; c2.fillRect(0, 0, W, Hh); c2.globalAlpha = 1; } }
    // spec.bars === false: no letterbox (thumbnail stills).
    if (L.spec.bars === false) return;
    const bar = Math.round(Hh * 0.095);
    c2.fillStyle = '#000'; c2.fillRect(0, 0, W, bar); c2.fillRect(0, Hh - bar, W, bar);
  };
})();
