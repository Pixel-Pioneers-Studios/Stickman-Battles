'use strict';
// Store cover: "The 95th looks up."
//
// Injected into the game page by tools/showcase/apex-cover.js. The game loop is
// parked; this paints one frame by hand onto the game's own canvas. Every
// figure is a real Fighter drawn by Fighter.draw() (the in-game neon-outline
// look), posed through the render-only hooks the renderer already exposes:
//   _rd.{rArm,lArm,rLeg,lLeg}.angle  absolute limb angles
//   _finPoseP / _finPoseState         attack progress / forced state
//   _coverLean                        render-only torso lean
//   _hideWeapon                       empty hands
// The sky, mountains, light and effects are authored canvas art.
//
// Three tiers, top to bottom: four apex beings in a break in the storm, Kael
// on a ledge with the Fragment burning in his chest, and a war in the valley.
// The four carry only their colour — no weapons, no signature powers — so a
// newcomer sees four unknowns and a veteran can name every one.
(function () {

  // ── Seeded RNG: the cover must be identical on every render ──────────────
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── Palette ───────────────────────────────────────────────────────────────
  const KAEL      = '#42bfff';
  const FRAGMENT  = '#8fd8ff';
  const SOVEREIGN = '#ff1f3d';
  const VOIDMIND  = '#a855ff';
  const AXIOM     = '#ffffff';
  const GOD       = '#ffffff';
  // The war below is fought by nobodies: muted outlines, so the five pure
  // colours in the frame belong only to the five who matter.
  const MUTED = ['#b08a6a', '#7e8c96', '#9a7a8e', '#8c9a7a', '#a07060', '#8a8470', '#6f7f9a', '#a89078'];

  // ── Layouts ───────────────────────────────────────────────────────────────
  // Units are layout units; the canvas is scaled so vw fills the width.
  // Fighters are 84 units tall at scale 1.
  const LAYOUTS = {
    port: {
      vw: 600, vh: 900,
      // The camera: the slice of the world this cover frames. The scene is
      // authored in portrait units; wider covers look at more of the same world.
      view: { x0: 0, y0: 0, w: 600, h: 900 },
      eye:   { x: 335, y: 190, r: 260 },
      // Feet positions = the summits they stand on. Scaled for distance: the
      // far peaks read at about a third of Kael, Sovereign's nearer spire a bit
      // more. Sovereign's is a nearer
      // spire of its own; the other three crown the far range.
      apex: {
        god: { x: 335, y: 214, s: 0.80 },
        axi: { x: 112, y: 322, s: 0.82 },
        vmd: { x: 514, y: 296, s: 0.80 },
        sov: { x: 376, y: 404, s: 1.15 },
      },
      kael:  { x: 176, y: 588, s: 2.50, rot: -0.09 },
      ledge: { x0: -40, x1: 272, top: 588 },
      haze:  { peaks: [[-20, 400], [60, 370], [190, 330], [260, 300], [420, 320], [470, 360], [590, 340], [620, 360]],
               wings: [[[-700, 360], [-450, 330], [-280, 300], [-120, 350]], [[720, 330], [860, 300], [1000, 340], [1300, 330]]] },
      far:   { peaks: [[-20, 470], [40, 420], [105, 322], [119, 322], [180, 440], [236, 380], [270, 400],
                       [328, 214], [342, 214], [410, 380], [455, 440], [507, 296], [521, 296], [575, 400], [620, 380]],
               flats: [[105, 119], [328, 342], [507, 521]],
               wings: [[[-700, 440], [-520, 380], [-380, 430], [-250, 360], [-120, 420]],
                       [[700, 420], [780, 350], [880, 410], [1000, 380], [1300, 420]]] },
      spire: { x: 376, top: 404, base: 600, w: 150 },
      volcano: { x: 560, y: 452, w: 250, h: 130 },
      mid:   { peaks: [[-20, 560], [110, 536], [250, 570], [390, 538], [520, 556], [620, 528]],
               wings: [[[-700, 560], [-450, 530], [-250, 565], [-100, 540]], [[720, 540], [850, 520], [1000, 550], [1300, 530]]] },
      battle: { y: 676, s: 0.95,
                duels: [[318, 42, 0.55, 0.30], [440, 40, 0.75, 0.50], [548, 46, 0.62, 0.40]],
                flung: [592, 612], back: [150, 640] },
    },
  };
  // Landscape and square frame the same world wider, with more war on the
  // flanks and the ledge running off the left edge.
  LAYOUTS.land = Object.assign({}, LAYOUTS.port, {
    view:   { x0: -300, y0: 125, w: 1100, h: 618.75 },
    ledge:  Object.assign({}, LAYOUTS.port.ledge, { x0: -440 }),
    battle: Object.assign({}, LAYOUTS.port.battle, {
      duels: LAYOUTS.port.battle.duels.concat([[700, 44, 0.60, 0.35]]),
      back: [150, 820] }),
  });
  LAYOUTS.sq = Object.assign({}, LAYOUTS.port, {
    view:   { x0: -80, y0: 110, w: 760, h: 760 },
    ledge:  Object.assign({}, LAYOUTS.port.ledge, { x0: -220 }),
    battle: Object.assign({}, LAYOUTS.port.battle, { back: [150, 700] }),
  });

  let S = 1, L = null;

  // ── Figures ───────────────────────────────────────────────────────────────
  function mk(color, weaponKey) {
    const f = new Fighter(0, 0, color, weaponKey, {}, false, 'medium');
    f.weapon = WEAPONS[weaponKey]; f.weaponKey = weaponKey;
    f.health = f.maxHealth = 150;
    f.invincible = 0; f.ragdollTimer = 0; f.squashTimer = 0;
    // The limb-angle override only applies at `spinning <= 0`; undefined fails it.
    f.spinning = 0;
    f.vx = 0; f.vy = 0; f.onGround = true;
    f.animTimer = 0; f.state = 'idle';
    f.name = '';
    return f;
  }
  // Limb angles are ABSOLUTE (0 = right, PI/2 = down), independent of facing.
  // Legs go through the _rd override. Arms can't: Fighter.draw reads _rd arm
  // angles and then its state branch overwrites them, so arms go through the
  // idle branch's weapon carry stance instead (patched per draw in drawFig).
  function pose(f, rArm, lArm, rLeg, lLeg) {
    f._rd = { rArm: { angle: rArm }, lArm: { angle: lArm },
              rLeg: { angle: rLeg }, lLeg: { angle: lLeg }, torso: { angle: 0 } };
    f.__arms = [rArm, lArm];
  }
  // Hovering: no contact shadow, no landing squash.
  function float(f) { f.onGround = false; f.vy = 14; }

  // Draw a fighter with its feet at (x, feetY), scaled by s. `rot` turns the
  // whole figure about its feet (a lean) or, with `rotMid`, about its middle
  // (a body adrift). Bloom passes are additive, blurred copies underneath.
  function drawFig(f, x, feetY, s, o) {
    o = o || {};
    f.x = 0; f.y = 0;
    f._smearPrev = null; f._swingTrail = []; f.squashTimer = 0;
    const px = f.w / 2, py = f.h;
    const place = () => {
      ctx.translate(x, feetY);
      if (o.rot) {
        const pivot = o.rotMid ? f.h * s * 0.5 : 0;
        ctx.translate(0, -pivot); ctx.rotate(o.rot); ctx.translate(0, pivot);
      }
      ctx.scale(s, s);
      ctx.translate(-px, -py);
    };
    window.__fill = o.fill || null;
    window.__noFace = !!o.noFace;
    // Carry angles are facing-relative: rAng = facing>0 ? arm : PI - arm.
    const sw = WEAPON_SWINGS[f.weaponKey], carry0 = sw && sw.carry;
    if (f.__arms && sw) {
      const rel = a => f.facing > 0 ? a : Math.PI - a;
      sw.carry = Object.assign({ tilt: 0.45 }, carry0 || {}, o.carry || {},
                               { arm: rel(f.__arms[0]), lArm: rel(f.__arms[1]) });
    }
    for (const g of (o.glow || [])) {
      ctx.save();
      place();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = `blur(${g.blur * S}px)`;
      ctx.globalAlpha = g.a;
      f.draw();
      ctx.restore();
    }
    ctx.save();
    place();
    ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    f.draw();
    ctx.restore();
    if (sw) sw.carry = carry0;
    window.__fill = null; window.__noFace = false;
  }
  // A point given in the figure's own frame (dx right, dy up from the feet,
  // in fighter units), rotated with it about the feet.
  function figPoint(x, feetY, s, rot, dx, dy) {
    const c = Math.cos(rot || 0), n = Math.sin(rot || 0);
    const ux = dx * s, uy = -dy * s;
    return { x: x + ux * c - uy * n, y: feetY + ux * n + uy * c };
  }


  // ── Authored figures ──────────────────────────────────────────────────────
  // Fighter.draw bends every knee and elbow by IK at a fixed limb length, so
  // any stance it produces reads as mid-stride. The hero figures are built
  // here instead from the SAME FigureSkin primitives, widths and paint order
  // Fighter.draw uses (so they are the in-game model), but with every joint
  // authored. Angles are absolute, canvas convention (0 = right, PI/2 = down).
  //   o.x, o.y   hip position        o.s     scale      o.f   facing
  //   o.tA       torso tilt (clockwise +)                 o.hT  extra head tilt
  //   o.rA/lA    [upper, fore] arms   o.rL/lL [thigh, shin] legs (r = near side)
  function rigBuild(o) {
    const W = FIG_LINE_W, R = FIG_HEAD_R, f = o.f;
    const ab = FIG_ARM_LEN * 0.60, lb = FIG_LEG_LEN * 0.58;
    const rot = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
    const add = (p, v) => ({ x: p.x + v.x, y: p.y + v.y });
    const dir = (a, l) => ({ x: Math.cos(a) * l, y: Math.sin(a) * l });
    const hip = { x: 0, y: 0 };
    const sh = add(hip, rot(0, -30, o.tA || 0));
    const neck = add(sh, rot(0, -FIG_NECK, o.tA || 0));
    const head = add(neck, rot(0, -(R + 1), (o.tA || 0) + (o.hT || 0)));
    const arm = (root, a) => { const j = add(root, dir(a[0], ab)); return [j, add(j, dir(a[1], ab))]; };
    const leg = (root, a) => { const j = add(root, dir(a[0], lb)); return [j, add(j, dir(a[1], lb))]; };
    const [rE, rH] = arm(sh, o.rA), [lE, lH] = arm(sh, o.lA);
    const [rK, rF] = leg(hip, o.rL), [lK, lF] = leg(hip, o.lL);
    return { hip, sh, neck, head, rE, rH, lE, lH, rK, rF, lK, lF, R, W, f };
  }
  function rigPaint(o, J, bloom) {
    const { W, R, f } = J;
    const pal = FigureSkin.pal(o.color);
    const near = FigureSkin.begin(), far = FigureSkin.begin();
    const bo = -f * 1.6;
    const off = p => ({ x: p.x + bo, y: p.y });
    FigureSkin.segment(near, [{ x: J.head.x, y: J.head.y + R * 0.55 }, { x: J.sh.x, y: J.sh.y - 1 }], [W * 0.55, W * 0.92]);
    FigureSkin.head(near, J.head.x, J.head.y, R, f);
    FigureSkin.segment(far, [off(J.sh), off(J.lE), off(J.lH)], [W * 1.02, W * 0.82, W * 0.62]);
    FigureSkin.hand(far, J.lH.x + bo, J.lH.y, o.lA[1], f, 0.85);
    FigureSkin.segment(near, [J.neck, { x: (J.neck.x + J.hip.x) / 2, y: (J.neck.y + J.hip.y) / 2 }, J.hip], [W * 1.85, W * 1.45, W * 1.30]);
    FigureSkin.segment(near, [J.sh, J.rE, J.rH], [W * 1.15, W * 0.92, W * 0.70], true);
    FigureSkin.hand(near, J.rH.x, J.rH.y, o.rA[1], f, 1);
    FigureSkin.segment(far, [off(J.hip), off(J.lK), off(J.lF)], [W * 1.16, W * 0.90, W * 0.68]);
    FigureSkin.foot(far, J.lF.x + bo, J.lF.y + 1.2, o.lL[1], f);
    FigureSkin.segment(near, [J.hip, J.rK, J.rF], [W * 1.30, W * 1.00, W * 0.76], true);
    FigureSkin.foot(near, J.rF.x, J.rF.y + 1.2, o.rL[1], f);
    FigureSkin.paint(far, pal, true);
    FigureSkin.paint(near, pal, false);
    if (!o.noFace) {
      const lk = o.look || { x: 0, y: 0 };
      FigureSkin.face(pal, J.head.x, J.head.y, R, f, {
        expr: o.expr || 'neutral', lookX: f * 0.6 + lk.x * 1.4, lookY: 0.2 + lk.y * 1.1, blink: 0,
      });
    }
    // The blade stays out of the bloom passes: it has its own sprite glow.
    if (o.weapon && !bloom) o.weapon.drawWeapon(J.rH.x, J.rH.y, o.rA[1], false, null, o.weaponScale || 1.5);
  }
  // Paint an authored figure with its hip at (o.x, o.y), whole-body rotation
  // o.rot about the hip, and additive bloom passes underneath.
  function drawRig(o) {
    const J = rigBuild(o);
    // o.stand: put the lowest boot on this ground line instead of giving a hip.
    if (o.stand !== undefined) o.y = o.stand - (Math.max(J.rF.y, J.lF.y) + 3.6) * o.s;
    const place = () => { ctx.translate(o.x, o.y); if (o.rot) ctx.rotate(o.rot); ctx.scale(o.s, o.s); };
    window.__fill = o.fill || null;
    for (const g of (o.glow || [])) {
      ctx.save(); place();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = `blur(${g.blur * S}px)`;
      ctx.globalAlpha = g.a;
      rigPaint(o, J, true);
      ctx.restore();
    }
    ctx.save(); place(); rigPaint(o, J); ctx.restore();
    window.__fill = null;
    // World position of a joint, for effects anchored to the body.
    const c = Math.cos(o.rot || 0), n = Math.sin(o.rot || 0);
    J.world = p => ({ x: o.x + (p.x * c - p.y * n) * o.s, y: o.y + (p.x * n + p.y * c) * o.s });
    return J;
  }

  function installHooks() {
    // Solid body fills (God's white body, Axiom's pure black one), painted over
    // the default translucent fill inside the same outline.
    if (!FigureSkin.__apexPatched) {
      const paint = FigureSkin.paint, face = FigureSkin.face;
      FigureSkin.paint = function (b, p, far) {
        paint.apply(this, arguments);
        const o = window.__fill;
        if (o && b.parts.length) {
          ctx.save();
          ctx.fillStyle = far ? o.far : o.near;
          for (const q of b.parts) ctx.fill(q);
          ctx.restore();
        }
      };
      FigureSkin.face = function () { if (!window.__noFace) face.apply(this, arguments); };
      FigureSkin.__apexPatched = true;
    }
    // The headband + tail overlay in smb-visual-polish.js ignores the pose (it
    // is pinned to the unposed head), so it floats off posed figures. Off here.
    window._smbDrawFighterPolish = function () {};
    // Eyes follow an authored target, not the nearest enemy.
    window.animEyeTarget = f => f.__look || { x: 0, y: 0 };
    settings.particles = false;
    settings.dmgNums = false;
  }

  // ── Painting helpers ──────────────────────────────────────────────────────
  function radial(x, y, r, stops, op) {
    ctx.save();
    if (op) ctx.globalCompositeOperation = op;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    for (const [t, c] of stops) g.addColorStop(t, c);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  // A jagged ridge through control peaks: piecewise-linear skeleton, then
  // midpoint displacement for rock-scale detail.
  function ridge(r, peaks, rough, depth) {
    let pts = peaks.map(([x, y]) => ({ x, y }));
    let amp = rough;
    for (let d = 0; d < depth; d++) {
      const out = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        out.push({ x: (a.x + b.x) / 2 + (r() - 0.5) * amp * 0.4,
                   y: (a.y + b.y) / 2 + (r() - 0.5) * amp });
        out.push(b);
      }
      pts = out; amp *= 0.55;
    }
    return pts;
  }
  // Extra range off each side for the wider covers. Its own seeds, so the
  // portrait's ridge (which never shows the wings) is unchanged.
  function withWings(pts, wings, seed) {
    if (!wings) return pts;
    const [lw, rw] = wings;
    const left = ridge(rng(seed + 1), lw.concat([[pts[0].x, pts[0].y]]), 34, 5);
    const right = ridge(rng(seed + 2), [[pts[pts.length - 1].x, pts[pts.length - 1].y]].concat(rw), 34, 5);
    return left.slice(0, -1).concat(pts, right.slice(1));
  }

  function tracePath(pts) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  }
  function fillRidge(pts, base, fill) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, base);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[pts.length - 1].x, base);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function strokePath(pts, color, w, blur, alpha, op) {
    ctx.save();
    if (op) ctx.globalCompositeOperation = op;
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (blur) { ctx.shadowColor = typeof color === 'string' ? color : '#fff'; ctx.shadowBlur = blur * S; }
    tracePath(pts);
    ctx.stroke();
    ctx.restore();
  }
  function ridgeY(pts, x) {
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].x >= x) {
        const a = pts[i - 1], b = pts[i];
        return lerp(a.y, b.y, (x - a.x) / ((b.x - a.x) || 1));
      }
    }
    return pts[pts.length - 1].y;
  }

  // Crest lighting: each ridge segment facing a light gets a soft lit edge,
  // each facing away a shadowed one, feathered into the rock below it. Kept to
  // the crest — full-height strips band visibly.
  function shadeRidge(pts, lx, ly, depth, lit, dark, maxA) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, L.vh + 10);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineTo(pts[pts.length - 1].x, L.vh + 10);
    ctx.closePath();
    ctx.clip();
    ctx.filter = `blur(${depth * 0.25 * S}px)`;
    ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const nx = dy / len, ny = -dx / len;                  // upward normal
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const tl = Math.hypot(lx - mx, ly - my) || 1;
      const d = (nx * (lx - mx) + ny * (ly - my)) / tl;     // -1..1
      const al = Math.min(1, Math.abs(d) * 1.4) * maxA;
      if (al < 0.01) continue;
      ctx.strokeStyle = (d > 0 ? lit : dark).replace('A', al.toFixed(3));
      ctx.lineWidth = depth * 0.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }

  // One cloud puff, lit from below (the lava), dark on top.
  function puff(x, y, rad, dark, lit, a) {
    const g = ctx.createRadialGradient(x, y + rad * 0.45, rad * 0.05, x, y, rad);
    g.addColorStop(0, lit);
    g.addColorStop(0.55, dark);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // A path that wanders downhill: lava rivers, rock seams.
  function meander(r, x, y, steps, dx, dy, wobble) {
    const pts = [{ x, y }];
    let drift = 0;
    for (let k = 0; k < steps; k++) {
      drift = drift * 0.6 + (r() - 0.5) * wobble;
      x += dx + drift; y += dy * (0.7 + r() * 0.6);
      pts.push({ x, y });
    }
    return pts;
  }

  // ── 1. Sky ────────────────────────────────────────────────────────────────
  function paintSky() {
    const g = ctx.createLinearGradient(0, 0, 0, L.vh);
    g.addColorStop(0.00, '#030206');
    g.addColorStop(0.28, '#09070d');
    g.addColorStop(0.44, '#1a0c0c');
    g.addColorStop(0.56, '#4c1809');
    g.addColorStop(0.70, '#2a0b05');
    g.addColorStop(1.00, '#0a0302');
    ctx.fillStyle = g;
    ctx.fillRect(-700, -100, 2000, 1100);

    // The break in the storm: cold, colourless light behind the four, so their
    // own colours are the only colour up there.
    const e = L.eye;
    radial(e.x, e.y, e.r * 1.3, [[0, 'rgba(196,192,212,0.26)'], [0.35, 'rgba(120,112,140,0.11)'], [1, 'rgba(0,0,0,0)']], 'lighter');
    radial(e.x, e.y - 20, e.r * 0.5, [[0, 'rgba(240,236,250,0.18)'], [1, 'rgba(0,0,0,0)']], 'lighter');
  }

  function paintClouds() {
    const r = rng(7);
    const e = L.eye;
    const place = (d0, d1) => {
      const a = r() * Math.PI * 2;
      const d = e.r * (d0 + Math.pow(r(), 0.7) * d1);
      return { x: e.x + Math.cos(a) * d * 1.4, y: e.y + Math.sin(a) * d * 0.6 };
    };
    ctx.save();
    // Soft underlayer: big, blurred masses.
    ctx.filter = `blur(${18 * S}px)`;
    for (let i = 0; i < 110; i++) {
      const p = place(0.85, 1.2);
      if (p.y > L.volcano.y + 30) continue;
      const lower = Math.max(0, Math.min(1, (p.y - 60) / (L.volcano.y - 60)));
      const lit = `rgb(${lerp(46, 140, lower) | 0},${lerp(42, 46, lower) | 0},${lerp(54, 28, lower) | 0})`;
      puff(p.x, p.y, 50 + r() * 70, 'rgb(9,7,12)', lit, 0.55 + r() * 0.3);
    }
    // Detail layer: smaller puffs, lightly blurred, give the rim a shape.
    ctx.filter = `blur(${6 * S}px)`;
    for (let i = 0; i < 160; i++) {
      const p = place(0.74, 0.9);
      if (p.y > L.volcano.y - 40) continue;
      const lower = Math.max(0, Math.min(1, (p.y - 60) / (L.volcano.y - 60)));
      const lit = `rgb(${lerp(62, 120, lower) | 0},${lerp(58, 50, lower) | 0},${lerp(74, 40, lower) | 0})`;
      puff(p.x, p.y, 20 + r() * 40, 'rgb(11,9,14)', lit, 0.22 + r() * 0.25);
    }
    // The eye's inner rim catches its pale light.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const p = place(0.70, 0.16);
      if (p.y > L.volcano.y) continue;
      puff(p.x, p.y, 10 + r() * 22, 'rgb(36,34,46)', 'rgb(130,126,148)', 0.09 + r() * 0.08);
    }
    ctx.restore();

    // Crepuscular shafts from the eye, fanning down toward the ledge.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${3 * S}px)`;
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * 0.5 + (i - 5) * 0.13 + (r() - 0.5) * 0.05;
      const len = 560, wdt = 0.018 + r() * 0.035;
      const g = ctx.createLinearGradient(e.x, e.y, e.x + Math.cos(a) * len, e.y + Math.sin(a) * len);
      g.addColorStop(0, 'rgba(220,214,235,0.00)');
      g.addColorStop(0.15, 'rgba(220,214,235,0.07)');
      g.addColorStop(1, 'rgba(220,214,235,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(a - wdt) * len, e.y + Math.sin(a - wdt) * len);
      ctx.lineTo(e.x + Math.cos(a + wdt) * len, e.y + Math.sin(a + wdt) * len);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ── 2. Mountains ──────────────────────────────────────────────────────────
  function paintHaze() {
    const pts = withWings(ridge(rng(13), L.haze.peaks, 30, 5), L.haze.wings, 13);
    fillRidge(pts, L.vh, 'rgba(58,26,20,0.55)');
    shadeRidge(pts, L.eye.x, L.eye.y, 16, 'rgba(130,100,104,A)', 'rgba(10,4,4,A)', 0.10);
    strokePath(pts, 'rgba(170,150,160,0.12)', 0.8);
  }

  let _far = null;
  function paintFarRange() {
    _far = ridge(rng(21), L.far.peaks, 40, 6);
    // Level the summits they stand on: midpoint displacement would otherwise
    // put a notch under their feet.
    for (const [x0, x1] of L.far.flats || []) {
      const y = ridgeY(_far, x0);
      for (const p of _far) if (p.x >= x0 && p.x <= x1) p.y = y;
    }
    _far = withWings(_far, L.far.wings, 21);
    const g = ctx.createLinearGradient(0, 220, 0, 600);
    g.addColorStop(0, '#1a0c0a');
    g.addColorStop(1, '#3a150a');
    fillRidge(_far, L.vh, g);
    shadeRidge(_far, L.eye.x, L.eye.y - 100, 20, 'rgba(150,112,110,A)', 'rgba(6,2,2,A)', 0.16);
    strokePath(_far, 'rgba(190,170,180,0.22)', 0.9);
    // Warm haze where it sinks into the valley glow.
    const hz = ctx.createLinearGradient(0, 500, 0, 610);
    hz.addColorStop(0, 'rgba(140,46,14,0)');
    hz.addColorStop(1, 'rgba(170,60,16,0.55)');
    ctx.fillStyle = hz;
    ctx.fillRect(-700, 500, 2000, 200);
  }

  // Sovereign's spire: a nearer, darker basalt pinnacle, rim-lit red by him.
  function paintSpire() {
    const sp = L.spire, r = rng(61);
    // The summit is a ledge wider than his stance, so he stands ON it.
    const tip = 17;
    const left = meander(r, sp.x - tip, sp.top, 12, -sp.w / 24, (sp.base - sp.top) / 12, 5).reverse();
    const right = meander(r, sp.x + tip, sp.top, 12, sp.w / 24, (sp.base - sp.top) / 12, 5);
    const pts = left.concat(right);
    const g = ctx.createLinearGradient(0, sp.top, 0, sp.base);
    g.addColorStop(0, '#0d0506'); g.addColorStop(1, '#1a0906');
    ctx.fillStyle = g;
    tracePath(pts); ctx.closePath(); ctx.fill();
    strokePath(left, 'rgba(255,40,60,0.40)', 1.2, 8);
    strokePath(right, 'rgba(255,90,40,0.25)', 1.0, 6);
    strokePath([left[left.length - 1], right[0]], 'rgba(255,60,70,0.7)', 1.2, 6);
  }

  function paintVolcano() {
    const v = L.volcano, r = rng(55);
    // Cone with concave flanks and a broken crater lip.
    const cone = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const t = i / N, side = t < 0.5 ? -1 : 1, u = Math.abs(t - 0.5) * 2;
      const x = v.x + side * (16 + Math.pow(u, 1.15) * v.w * 0.5);
      const y = v.y + Math.pow(u, 1.9) * v.h + (r() - 0.5) * 5 * u + (u < 0.08 ? (r() - 0.5) * 4 : 0);
      cone.push({ x, y });
    }
    const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
    g.addColorStop(0, '#170807'); g.addColorStop(1, '#2c1008');
    fillRidge(cone, L.vh, g);
    shadeRidge(cone, L.eye.x - 120, L.eye.y - 60, 24, 'rgba(150,112,110,A)', 'rgba(4,1,1,A)', 0.16);
    // The crater's glow lights its own lip from inside.
    strokePath(cone.slice(N / 2 - 4, N / 2 + 5), 'rgba(255,150,60,0.8)', 1.4, 10);
    strokePath(cone, 'rgba(255,110,40,0.14)', 0.8);

    // Lava rivers: thin, braided, pooling toward the foot.
    const lr = rng(56);
    for (const [side, len] of [[-1, 16], [-0.4, 11], [0.75, 17]]) {
      const pts = meander(lr, v.x + side * 12, v.y + 4, len, side * 5.2, 11, 10);
      strokePath(pts, 'rgba(255,80,15,0.50)', 2.6, 10);
      strokePath(pts, 'rgba(255,190,90,0.9)', 0.7);
      // A branch.
      const k = 4 + (lr() * 5 | 0);
      const br = meander(lr, pts[k].x, pts[k].y, 6, side * 7 + (lr() - 0.5) * 6, 10, 4);
      strokePath(br, 'rgba(255,80,15,0.40)', 2.2, 8);
      strokePath(br, 'rgba(255,180,80,0.7)', 0.6);
    }
    // Glow at the foot of the cone where the rivers pool.
    radial(v.x, v.y + v.h, 180, [[0, 'rgba(255,100,20,0.28)'], [1, 'rgba(255,60,0,0)']], 'lighter');

    // Eruption column rising into the storm, hottest at the base.
    ctx.save();
    ctx.filter = `blur(${4 * S}px)`;
    const pr = rng(57);
    for (let i = 0; i < 120; i++) {
      const t = Math.pow(pr(), 0.85);
      const y = v.y - t * 230;
      const spread = 10 + t * 120;
      const x = v.x + (pr() - 0.5) * spread * 1.3 + t * t * 60;
      const rad = 10 + t * 42 + pr() * 10;
      const heat = Math.pow(1 - t, 1.6);
      const lit = `rgb(${90 + heat * 165 | 0},${28 + heat * 90 | 0},${14 + heat * 20 | 0})`;
      puff(x, y, rad, 'rgb(20,12,12)', lit, 0.35 + heat * 0.4);
    }
    ctx.restore();
    radial(v.x, v.y, 70, [[0, 'rgba(255,220,140,0.95)'], [0.2, 'rgba(255,130,40,0.5)'], [1, 'rgba(120,20,0,0)']], 'lighter');
    // Lava bombs thrown from the vent, with short trails.
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (pr() - 0.5) * 1.5, d = 14 + pr() * 80;
      const x = v.x + Math.cos(a) * d, y = v.y + Math.sin(a) * d * 0.9;
      ctx.strokeStyle = `rgba(255,${150 + (pr() * 90 | 0)},70,${0.5 + pr() * 0.5})`;
      ctx.lineWidth = 0.8 + pr() * 1.2;
      ctx.shadowColor = '#ff7a2a'; ctx.shadowBlur = 6 * S;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 5, y - Math.sin(a) * 5); ctx.stroke();
    }
    ctx.restore();
  }

  function paintMidRange() {
    const mid = withWings(ridge(rng(89), L.mid.peaks, 26, 6), L.mid.wings, 89);
    const g = ctx.createLinearGradient(0, 520, 0, 700);
    g.addColorStop(0, '#120706'); g.addColorStop(1, '#1c0905');
    fillRidge(mid, L.vh, g);
    shadeRidge(mid, L.volcano.x, L.volcano.y, 14, 'rgba(255,110,40,A)', 'rgba(0,0,0,A)', 0.20);
    strokePath(mid, 'rgba(255,110,40,0.35)', 1.0, 5);
  }

  // ── 3. The valley war ─────────────────────────────────────────────────────
  function paintValley() {
    const B = L.battle;
    // The war is fought in lava light pooled along the valley floor.
    radial(440, B.y - 10, 260, [[0, 'rgba(255,110,30,0.30)'], [0.5, 'rgba(200,60,10,0.12)'], [1, 'rgba(0,0,0,0)']], 'lighter');
    const r = rng(144);
    const ground = [];
    for (let x = -700; x <= 1300; x += 8) ground.push({ x, y: B.y + Math.sin(x * 0.03) * 2 + (r() - 0.5) * 2 });
    const gg = ctx.createLinearGradient(0, B.y, 0, L.vh);
    gg.addColorStop(0, '#1d0906'); gg.addColorStop(0.3, '#0d0403'); gg.addColorStop(1, '#040101');
    fillRidge(ground, L.vh + 10, gg);
    strokePath(ground, 'rgba(255,130,50,0.55)', 1.0, 8);
    // Lava seams in the valley floor, running away from the viewer.
    for (let i = 0; i < 12; i++) {
      const x = 200 + r() * 420, y = B.y + 4 + r() * 22;
      const pts = meander(r, x, y, 5, 8 + r() * 6, 1.2, 3);
      strokePath(pts, 'rgba(255,90,20,0.45)', 1.6, 6);
      strokePath(pts, 'rgba(255,190,110,0.55)', 0.5);
    }
  }

  function paintBattleBack() {
    // Far rank: small dim silhouettes that turn a skirmish into a war.
    const r = rng(402);
    const B = L.battle;
    for (let i = 0; i < 30; i++) {
      const f = mk(MUTED[i % MUTED.length], ['sword', 'spear', 'hammer', 'katana', 'scythe'][i % 5]);
      f.facing = r() < 0.5 ? 1 : -1;
      f._finPoseP = r(); f._finPoseState = 'attacking';
      f.expressionState = 'intense';
      const x = B.back[0] + r() * (B.back[1] - B.back[0]);
      const depth = r();
      drawFig(f, x, B.y - 8 - depth * 10, B.s * (0.42 + (1 - depth) * 0.16), { alpha: 0.30 + (1 - depth) * 0.2 });
    }
    // Sparks where the far ranks meet.
    for (let i = 0; i < 7; i++) sparks(B.back[0] + r() * (B.back[1] - B.back[0]), B.y - 30 - r() * 10, 6, rng(900 + i), 0.5);
    // Dust between ranks.
    const hz = ctx.createLinearGradient(0, B.y - 50, 0, B.y);
    hz.addColorStop(0, 'rgba(90,30,12,0)'); hz.addColorStop(1, 'rgba(120,40,14,0.40)');
    ctx.fillStyle = hz; ctx.fillRect(-700, B.y - 50, 2000, 54);
  }

  // Front rank: authored duels with readable weapons and attacks.
  function paintBattleFront() {
    const B = L.battle, s = B.s;
    const r = rng(777);
    const kit = [['sword', 'hammer'], ['spear', 'katana'], ['hammer', 'scythe']];
    B.duels.forEach(([x, gap, pA, pB], i) => {
      const a = mk(MUTED[(i * 2) % 8], kit[i % 3][0]), b = mk(MUTED[(i * 2 + 1) % 8], kit[i % 3][1]);
      a.facing = 1; b.facing = -1;
      for (const [f, p] of [[a, pA], [b, pB]]) {
        f._finPoseP = p; f._finPoseState = 'attacking'; f.expressionState = 'intense';
        f.__look = { x: f.facing, y: 0 };
      }
      drawFig(a, x - gap / 2, B.y, s, { glow: [{ blur: 3, a: 0.45 }] });
      drawFig(b, x + gap / 2, B.y, s, { glow: [{ blur: 3, a: 0.45 }] });
      sparks(x, B.y - 44 * s, 14, rng(x | 0), 1);
    });

    // Attacks. A crescent slash leaving the katana.
    const d1 = B.duels[1];
    slash(d1[0] + 10, B.y - 40 * s, 30, -0.35, 'rgba(255,236,200,0.9)');
    // Ground shockwave and debris from the hammer.
    const d2 = B.duels[2];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = `rgba(255,170,90,${0.55 - k * 0.15})`;
      ctx.lineWidth = 2.0 - k * 0.5; ctx.shadowColor = '#ff8a3a'; ctx.shadowBlur = 8 * S;
      ctx.beginPath(); ctx.ellipse(d2[0] - 12, B.y, 26 + k * 16, 4.5 + k * 2.2, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#140705';
    for (let i = 0; i < 16; i++) {
      const x = d2[0] - 40 + r() * 56, y = B.y - 4 - r() * 30;
      ctx.beginPath(); ctx.arc(x, y, 0.7 + r() * 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // Fire burst on the near duel.
    fireBurst(B.duels[0][0] - 36, B.y - 30, 20);

    // A fighter blown clear off his feet, mid-air, with a motion streak.
    const [fx, fy] = B.flung;
    const flung = mk(MUTED[5], 'sword');
    flung.facing = -1; flung._finPoseState = 'hurt';
    pose(flung, -2.6, -0.5, Math.PI * 0.22, Math.PI * 0.02);
    float(flung);
    drawFig(flung, fx, fy, s * 0.9, { rot: 1.0, rotMid: true, glow: [{ blur: 3, a: 0.45 }] });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const y = fy - 60 + i * 6;
      const g = ctx.createLinearGradient(fx - 60, y + 14, fx - 20, y);
      g.addColorStop(0, 'rgba(255,200,140,0)'); g.addColorStop(1, 'rgba(255,200,140,0.30)');
      ctx.strokeStyle = g; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(fx - 64, y + 16); ctx.lineTo(fx - 22, y); ctx.stroke();
    }
    ctx.restore();
  }

  function slash(x, y, rad, rot, color) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(-rad, 0, rad, 0);
    g.addColorStop(0, 'rgba(255,230,190,0)'); g.addColorStop(0.7, color); g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g; ctx.shadowColor = '#ffd9a0'; ctx.shadowBlur = 12 * S;
    ctx.beginPath();
    ctx.arc(0, 0, rad, -1.3, 1.3);
    ctx.arc(-rad * 0.3, 0, rad * 0.86, 1.2, -1.2, true);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function fireBurst(x, y, rad) {
    const r = rng(x * 7 | 0);
    radial(x, y, rad * 2.4, [[0, 'rgba(255,200,110,0.55)'], [0.4, 'rgba(255,90,20,0.22)'], [1, 'rgba(120,20,0,0)']], 'lighter');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * rad;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8 - r() * 10;
      const pr = 2.5 + r() * 7;
      const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, 'rgba(255,236,170,0.65)'); g.addColorStop(1, 'rgba(255,80,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function sparks(x, y, rad, r, k) {
    radial(x, y, rad * 1.6, [[0, `rgba(255,245,220,${0.8 * k})`], [0.25, `rgba(255,170,80,${0.35 * k})`], [1, 'rgba(255,100,30,0)']], 'lighter');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, d0 = 2 + r() * 3, d1 = rad * (0.5 + r() * 0.8);
      ctx.strokeStyle = i % 3 ? `rgba(255,190,100,${0.85 * k})` : `rgba(255,250,235,${0.95 * k})`;
      ctx.lineWidth = 0.5 + r() * 0.6;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0);
      ctx.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1); ctx.stroke();
    }
    ctx.restore();
  }

  // ── 4. The four ───────────────────────────────────────────────────────────
  function paintApex() {
    const A = L.apex;
    // Each one casts its own colour into the storm around it.
    radial(A.god.x, A.god.y - 30, 80, [[0, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']], 'lighter');
    radial(A.axi.x, A.axi.y - 30, 60, [[0, 'rgba(210,215,230,0.10)'], [1, 'rgba(0,0,0,0)']], 'lighter');
    radial(A.vmd.x, A.vmd.y - 30, 75, [[0, 'rgba(168,85,255,0.24)'], [1, 'rgba(168,85,255,0)']], 'lighter');
    radial(A.sov.x, A.sov.y - 50, 100, [[0, 'rgba(255,31,61,0.24)'], [1, 'rgba(255,31,61,0)']], 'lighter');

    // God: the highest summit, and the inverse of Axiom — solid white body,
    // white line, white glow. With no dark edge the limbs only read if they
    // stand clear of the torso, so arms and legs are held well open, and the
    // far-side limbs sit a step cooler, the depth cue the in-game model uses.
    drawRig({ x: A.god.x, stand: A.god.y, s: A.god.s, f: -1, color: GOD,
      fill: { near: '#ffffff', far: '#c6ccdc' },
      look: { x: -0.5, y: 1 },
      rA: [0.72, 0.62], lA: [2.42, 2.52],
      rL: [1.22, 1.38], lL: [1.92, 1.76],
      glow: [{ blur: 5, a: 0.40 }] });

    // Axiom: black body, a crisp white line and almost no glow — dark where
    // God is light. Crouched on the edge of his summit like he might drop off
    // it, forearm slung over a knee, the other hand down on the rock.
    drawRig({ x: A.axi.x - 12 * A.axi.s, stand: A.axi.y, s: A.axi.s, f: 1, color: AXIOM, tA: 0.60,
      fill: { near: '#000000', far: '#060608' }, look: { x: 0.5, y: 1 },
      rA: [1.10, 0.35], lA: [1.50, 1.50],
      rL: [-0.60, 1.75], lL: [-0.45, 1.70],
      glow: [{ blur: 2, a: 0.45 }] });

    // The Void Mind: planted, arms thrown up and wide.
    drawRig({ x: A.vmd.x, stand: A.vmd.y, s: A.vmd.s, f: -1, color: VOIDMIND, hT: 0.20,
      look: { x: -0.8, y: 0.6 },
      rA: [-0.70, -0.95], lA: [-2.45, -2.20],
      rL: [1.34, 1.52], lL: [1.80, 1.64],
      glow: [{ blur: 10, a: 0.95 }, { blur: 3, a: 0.8 }] });

    // Sovereign: nearest and largest, feet planted wide on his own spire, fists
    // low and away from the body, looking straight down at the one who looked up.
    drawRig({ x: A.sov.x, stand: A.sov.y, s: A.sov.s, f: -1, color: SOVEREIGN, tA: -0.05,
      expr: 'intense', look: { x: -0.8, y: 1 },
      rA: [1.22, 1.38], lA: [1.94, 1.78],
      rL: [1.24, 1.44], lL: [1.92, 1.72],
      glow: [{ blur: 12, a: 0.95 }, { blur: 3.5, a: 0.9 }] });
  }

  // ── 5. Kael on the ledge ──────────────────────────────────────────────────
  function paintLedge() {
    const K = L.kael, g = L.ledge, r = rng(300);
    // A spur of basalt jutting over the valley. Lava light licks its underside;
    // the Fragment lights its top from above.
    const top = [];
    for (let x = g.x0; x <= g.x1; x += 5) {
      const lip = Math.max(0, (x - (g.x1 - 50)) / 50);
      top.push({ x, y: g.top + 1.5 + (r() - 0.5) * 2 + lip * lip * 8 });
    }
    const body = top.slice();
    body.push({ x: g.x1 + 3, y: g.top + 14 });
    body.push({ x: g.x1 - 22, y: g.top + 40 });
    body.push({ x: g.x1 - 70, y: g.top + 72 });
    body.push({ x: g.x1 - 110, y: g.top + 130 });
    body.push({ x: g.x1 - 130, y: L.vh + 10 });
    body.push({ x: g.x0, y: L.vh + 10 });
    const lg = ctx.createLinearGradient(0, g.top, 0, L.vh);
    lg.addColorStop(0, '#110606'); lg.addColorStop(0.25, '#080303'); lg.addColorStop(1, '#020101');
    ctx.fillStyle = lg;
    tracePath(body); ctx.closePath(); ctx.fill();
    // Underside rim from the valley.
    strokePath(body.slice(top.length - 1, top.length + 4), 'rgba(255,110,35,0.6)', 1.4, 10);
    // Rock facets on the face.
    ctx.save(); ctx.strokeStyle = 'rgba(90,70,80,0.22)'; ctx.lineWidth = 0.7;
    for (let i = 0; i < 12; i++) {
      const pts = meander(r, g.x0 + 20 + r() * (g.x1 - g.x0 - 70), g.top + 8 + r() * 30, 4, (r() - 0.5) * 8, 14, 8);
      tracePath(pts); ctx.stroke();
    }
    ctx.restore();
    // Fragment light on the top surface, strongest under his feet.
    const cg = ctx.createLinearGradient(K.x - 120, 0, K.x + 120, 0);
    cg.addColorStop(0, 'rgba(143,216,255,0)'); cg.addColorStop(0.5, 'rgba(170,228,255,0.9)'); cg.addColorStop(1, 'rgba(143,216,255,0)');
    strokePath(top, cg, 1.3, 8);
    radial(K.x, g.top + 4, 70, [[0, 'rgba(143,216,255,0.22)'], [1, 'rgba(143,216,255,0)']], 'lighter');
  }

  function paintKael() {
    const K = L.kael;
    // A real Fighter only for its sword: drawWeapon is the in-game blade.
    const sword = mk(KAEL, 'sword');
    sword.facing = 1;
    const carry = WEAPON_SWINGS.sword.carry;
    WEAPON_SWINGS.sword.carry = { arm: 0, tilt: 0.35 };
    const pose = {
      x: K.x, y: K.y - 35 * K.s, s: K.s, f: 1, color: KAEL,
      tA: -0.13, hT: -0.30,                    // weight settled back, chin up
      expr: 'focused', look: { x: 0.5, y: -1 },  // eyes on the sky
      rA: [1.62, 1.50],                        // blade hangs loose at his side
      lA: [1.98, 1.72],                        // off hand open, a little back
      rL: [1.22, 1.46], lL: [1.95, 1.74],      // front foot planted, weight back
      // At cover scale the in-game 1.5x sprite outshines the Fragment.
      weapon: sword, weaponScale: 0.95,
      glow: [{ blur: 12, a: 0.9 }, { blur: 3.5, a: 0.8 }],
    };
    const J0 = rigBuild(pose);
    const chest0 = { x: lerp(J0.neck.x, J0.hip.x, 0.32), y: lerp(J0.neck.y, J0.hip.y, 0.32) };
    const chest = { x: K.x + chest0.x * K.s, y: pose.y + chest0.y * K.s };
    radial(chest.x, chest.y, 170, [[0, 'rgba(143,216,255,0.26)'], [0.35, 'rgba(66,191,255,0.10)'], [1, 'rgba(66,191,255,0)']], 'lighter');
    drawRig(pose);
    WEAPON_SWINGS.sword.carry = carry;
    paintFragment(chest.x, chest.y, K.s, pose.tA);
  }

  // The Fragment at full power: light cracking out through his chest.
  function paintFragment(x, y, s, rot) {
    const r = rng(95);
    const cracks = [];
    // Cracks run mostly along the torso — up toward the collarbone, down the
    // ribs — with a few breaking out sideways across the arms.
    for (let i = 0; i < 8; i++) {
      const up = i % 2 === 0;
      let a = (up ? -Math.PI / 2 : Math.PI / 2) + (r() - 0.5) * 2.2 + rot;
      const reach = (4 + r() * 5) * s;
      const n = 4 + (r() * 3 | 0);
      let px = x, py = y;
      const pts = [{ x: px, y: py }];
      for (let k = 0; k < n; k++) {
        a += (r() - 0.5) * 1.0;
        px += Math.cos(a) * reach / n; py += Math.sin(a) * reach / n;
        pts.push({ x: px, y: py });
        if (k === 1 && r() < 0.8) {
          const ba = a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.5);
          const l = reach * 0.35;
          cracks.push({ w: 0.55, pts: [{ x: px, y: py },
            { x: px + Math.cos(ba) * l * 0.5 + (r() - 0.5) * 2, y: py + Math.sin(ba) * l * 0.5 },
            { x: px + Math.cos(ba) * l, y: py + Math.sin(ba) * l }] });
        }
      }
      cracks.push({ w: 1, pts });
    }
    radial(x, y, 10 * s, [[0, 'rgba(215,242,255,0.45)'], [0.3, 'rgba(143,216,255,0.18)'], [1, 'rgba(66,191,255,0)']], 'lighter');
    for (const c of cracks) strokePath(c.pts, FRAGMENT, 0.8 * c.w * s, 5, 0.9, 'lighter');
    for (const c of cracks) strokePath(c.pts, '#f4fcff', 0.32 * c.w * s, 1.2, 1);
    radial(x, y, 3.2 * s, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(225,246,255,0.7)'], [1, 'rgba(143,216,255,0)']], 'lighter');

    // Motes drifting up off him.
    const m = rng(96);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // Kept below the neck: above it they swarm his face and hide his eyes.
    for (let i = 0; i < 18; i++) {
      const px = x + (m() - 0.5) * 36 * s, py = y - 4 * s + m() * 34 * s;
      ctx.fillStyle = `rgba(170,228,255,${0.3 + m() * 0.6})`;
      ctx.shadowColor = FRAGMENT; ctx.shadowBlur = 6 * S;
      ctx.beginPath(); ctx.arc(px, py, 0.5 + m() * 1.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ── 6. Atmosphere ─────────────────────────────────────────────────────────
  function paintEmbers() {
    const r = rng(1234);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 110; i++) {
      const V = L.view;
      const x = V.x0 + r() * V.w, y = V.y0 + V.h * (0.30 + Math.pow(r(), 1.4) * 0.55);
      const len = 0.6 + r() * 2.6, a = -Math.PI / 2 + (r() - 0.5) * 0.8;
      const hot = r();
      const al = 0.25 + r() * 0.6, w = 0.5 + r() * 0.9;
      // Glow as a wide faint stroke under the hot core. A shadowBlur on each of
      // these strokes knocks the canvas out at store-cover resolution.
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.strokeStyle = `rgba(255,110,40,${al * 0.25})`; ctx.lineWidth = w * 4; ctx.stroke();
      ctx.strokeStyle = `rgba(255,${120 + (hot * 110 | 0)},${40 + (hot * 60 | 0)},${al})`; ctx.lineWidth = w; ctx.stroke();
    }
    ctx.restore();
    // Ash drifting through the upper sky.
    ctx.save(); ctx.fillStyle = 'rgba(150,140,150,0.22)';
    for (let i = 0; i < 90; i++) {
      ctx.beginPath(); ctx.arc(L.view.x0 + r() * L.view.w, L.view.y0 + r() * L.view.h * 0.6, 0.4 + r() * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function paintGrade() {
    const V = L.view, cx = V.x0 + V.w * 0.5;
    const v = ctx.createRadialGradient(cx, V.y0 + V.h * 0.42, Math.min(V.w, V.h) * 0.35,
                                       cx, V.y0 + V.h * 0.5, Math.max(V.w, V.h) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v; ctx.fillRect(V.x0, V.y0, V.w, V.h);
  }

  function render(layout) {
    L = LAYOUTS[layout];
    if (!L) throw new Error('unknown layout ' + layout);
    const W = canvas.width, H = canvas.height;
    S = W / L.view.w;
    installHooks();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none'; ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(S, 0, 0, S, -L.view.x0 * S, -L.view.y0 * S + (H - L.view.h * S) / 2);

    const steps = [paintSky, paintClouds, paintHaze, paintFarRange, paintVolcano, paintSpire, paintApex,
                   paintMidRange, paintValley, paintBattleBack, paintBattleFront, paintLedge,
                   paintKael, paintEmbers, paintGrade];
    const n = window.__apexSteps || steps.length;   // debug: stop after n layers
    steps.slice(0, n).forEach(fn => fn());
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  window.ApexScene = { render, LAYOUTS };
})();
