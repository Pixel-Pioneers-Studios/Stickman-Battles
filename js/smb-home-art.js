'use strict';
// smb-home-art.js: painted backdrop and fighter-look figures for the home screen.
//
// Drawn on #homeCanvas by the frame loop in smb-menu-ui.js, in place of the
// older line-stickman scene (_homeDrawHeroScene), which is kept and still runs
// when this file is absent or when window.HOME_ART_CLASSIC is true.
//
// The still parts of the painting (sky, moon, ranges, clouds) are rendered once
// per canvas size into offscreen canvases; a frame is two or three drawImage
// calls plus the figures.

var _homeArt = { W: 0, H: 0, sky: null, clouds: null };

function _homeArtRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    var x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function _homeArtCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// Ridged 1D noise: sharp crests, rounded valleys.
function _homeArtRidge(seed) {
  var r = _homeArtRng(seed), lat = [];
  for (var i = 0; i < 512; i++) lat.push(r());
  function n(x) {
    var i0 = Math.floor(x), fr = x - i0;
    var a = lat[((i0 % 512) + 512) % 512], b = lat[(((i0 + 1) % 512) + 512) % 512];
    var s = fr * fr * (3 - 2 * fr);
    return a + (b - a) * s;
  }
  return function (x) {
    var v = 0, amp = 0.55, f = 1;
    for (var o = 0; o < 4; o++) {
      v += (1 - Math.abs(n(x * f) * 2 - 1)) * amp;
      amp *= 0.5; f *= 2.1;
    }
    return v;
  };
}

// The moon is built on its own canvas so the broken limb can be cut out with
// destination-out. Painting sky-coloured wedges over it would show as shapes
// against the graded sky.
function _homeArtMoon(r) {
  var pad = Math.ceil(r * 0.08), size = (r + pad) * 2;
  var c = _homeArtCanvas(size, size), g = c.getContext('2d');
  var cx = size / 2, cy = size / 2, rnd = _homeArtRng(9517);

  var body = g.createRadialGradient(cx - r * 0.32, cy - r * 0.36, r * 0.05, cx, cy, r);
  body.addColorStop(0,    '#f7e6c6');
  body.addColorStop(0.45, '#ecc898');
  body.addColorStop(0.82, '#cf8a62');
  body.addColorStop(1,    '#9a4c48');
  g.fillStyle = body;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();

  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();

  // Maria: soft darker seas.
  for (var i = 0; i < 9; i++) {
    var a = rnd() * Math.PI * 2, d = rnd() * r * 0.78, mr = r * (0.10 + rnd() * 0.22);
    var mx = cx + Math.cos(a) * d, my = cy + Math.sin(a) * d;
    var mg = g.createRadialGradient(mx, my, 0, mx, my, mr);
    mg.addColorStop(0, 'rgba(120,58,60,0.26)');
    mg.addColorStop(1, 'rgba(120,58,60,0)');
    g.fillStyle = mg;
    g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
  }

  // Fractures from one strike point, each with void light in the seam.
  var ix = cx + r * 0.30, iy = cy - r * 0.22;
  var cracks = [];
  for (var k = 0; k < 6; k++) {
    var ang = (k / 6) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    var len = r * (0.55 + rnd() * 1.1), pts = [[ix, iy]], px = ix, py = iy;
    var steps = 6 + Math.floor(rnd() * 4);
    for (var s = 1; s <= steps; s++) {
      ang += (rnd() - 0.5) * 0.75;
      px += Math.cos(ang) * len / steps; py += Math.sin(ang) * len / steps;
      pts.push([px, py]);
      if (s === 3 && rnd() < 0.7) {
        var ba = ang + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.5), bl = len * 0.22;
        cracks.push([[px, py], [px + Math.cos(ba) * bl * 0.5, py + Math.sin(ba) * bl * 0.5 + bl * 0.08],
                     [px + Math.cos(ba) * bl, py + Math.sin(ba) * bl]]);
      }
    }
    cracks.push(pts);
  }
  function trace(pts) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (var q = 1; q < pts.length; q++) g.lineTo(pts[q][0], pts[q][1]);
  }
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (var c1 = 0; c1 < cracks.length; c1++) {
    trace(cracks[c1]); g.strokeStyle = 'rgba(150,90,235,0.30)'; g.lineWidth = r * 0.034; g.stroke();
  }
  for (var c2 = 0; c2 < cracks.length; c2++) {
    trace(cracks[c2]); g.strokeStyle = '#2a1036'; g.lineWidth = r * 0.014; g.stroke();
  }
  for (var c3 = 0; c3 < cracks.length; c3++) {
    trace(cracks[c3]); g.strokeStyle = 'rgba(206,170,255,0.55)'; g.lineWidth = r * 0.005; g.stroke();
  }
  var hot = g.createRadialGradient(ix, iy, 0, ix, iy, r * 0.30);
  hot.addColorStop(0, 'rgba(190,140,255,0.55)');
  hot.addColorStop(1, 'rgba(120,60,220,0)');
  g.fillStyle = hot; g.beginPath(); g.arc(ix, iy, r * 0.30, 0, Math.PI * 2); g.fill();

  // Terminator: the lower right falls into shadow.
  var term = g.createLinearGradient(cx - r * 0.5, cy - r * 0.6, cx + r * 0.9, cy + r * 0.9);
  term.addColorStop(0.45, 'rgba(40,14,50,0)');
  term.addColorStop(1,    'rgba(40,14,50,0.55)');
  g.fillStyle = term; g.fillRect(0, 0, size, size);
  g.restore();

  // Bites out of the upper-right limb, where the pieces came away.
  g.globalCompositeOperation = 'destination-out';
  var bites = [[-0.62, 0.20], [-0.36, 0.13], [-0.90, 0.11]];
  for (var b = 0; b < bites.length; b++) {
    var ba2 = bites[b][0], br = r * bites[b][1];
    var bx = cx + Math.cos(ba2) * r * 1.02, by = cy + Math.sin(ba2) * r * 1.02;
    g.beginPath();
    for (var v = 0; v < 7; v++) {
      var va = (v / 7) * Math.PI * 2, vr = br * (0.75 + rnd() * 0.5);
      if (v === 0) g.moveTo(bx + Math.cos(va) * vr, by + Math.sin(va) * vr);
      else g.lineTo(bx + Math.cos(va) * vr, by + Math.sin(va) * vr);
    }
    g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  return c;
}

function _homeArtMoonPos(W, H) {
  return { x: W * 0.515, y: H * 0.295, r: Math.min(W, H) * 0.185 };
}

function _homeArtBuildSky(W, H) {
  var c = _homeArtCanvas(W, H), g = c.getContext('2d');
  var u = Math.min(W, H) / 900, rnd = _homeArtRng(4242);
  var horizon = H * 0.70;

  var sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0,    '#090716');
  sky.addColorStop(0.30, '#150e2b');
  sky.addColorStop(0.58, '#33183f');
  sky.addColorStop(0.80, '#6d2a40');
  sky.addColorStop(0.93, '#b4533a');
  sky.addColorStop(1,    '#dc8a4c');
  g.fillStyle = sky; g.fillRect(0, 0, W, horizon);
  g.fillStyle = '#120b1e'; g.fillRect(0, horizon, W, H - horizon);

  // Stars thin out toward the horizon glow.
  for (var i = 0; i < 190; i++) {
    var sx = rnd() * W, sy = rnd() * rnd() * horizon * 0.78;
    var sr = (0.5 + rnd() * 1.1) * u, sa = (0.25 + rnd() * 0.6) * (1 - sy / (horizon * 0.8));
    g.fillStyle = 'rgba(255,238,214,' + Math.max(0, sa).toFixed(3) + ')';
    g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
  }

  var m = _homeArtMoonPos(W, H);
  var halo = g.createRadialGradient(m.x, m.y, m.r * 0.8, m.x, m.y, m.r * 3.1);
  halo.addColorStop(0,   'rgba(255,196,140,0.30)');
  halo.addColorStop(0.4, 'rgba(226,120,110,0.10)');
  halo.addColorStop(1,   'rgba(160,70,130,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, horizon);
  var moon = _homeArtMoon(m.r);
  g.drawImage(moon, m.x - moon.width / 2, m.y - moon.height / 2);

  // Three ranges. Distance washes toward the horizon light; each range pools
  // mist at its foot so the next one in front separates from it.
  var layers = [
    { base: horizon,            amp: H * 0.150, f: 2.6, seed: 11, top: '#7a3a52', foot: '#c26a52', spires: 5 },
    { base: horizon + H * 0.02, amp: H * 0.105, f: 3.4, seed: 23, top: '#4c2750', foot: '#8a4458', spires: 6 },
    { base: horizon + H * 0.05, amp: H * 0.070, f: 4.6, seed: 37, top: '#2f1c46', foot: '#52294e', spires: 4 }
  ];
  for (var L = 0; L < layers.length; L++) {
    var ly = layers[L], ridge = _homeArtRidge(ly.seed), lr = _homeArtRng(ly.seed * 7 + 1);
    var fill = g.createLinearGradient(0, ly.base - ly.amp, 0, ly.base + H * 0.06);
    fill.addColorStop(0, ly.top); fill.addColorStop(1, ly.foot);
    g.fillStyle = fill;

    g.beginPath(); g.moveTo(0, H);
    for (var x = 0; x <= W + 6; x += 6) {
      // Lower in the middle third, so the moon and the fight keep clear sky.
      var mid = 1 - 0.45 * Math.exp(-Math.pow((x / W - 0.5) / 0.22, 2));
      g.lineTo(x, ly.base - ridge(x / W * ly.f * 3 + L * 9) * ly.amp * mid);
    }
    g.lineTo(W, H); g.closePath(); g.fill();

    // Broken spires, kept to the outer thirds.
    for (var sp = 0; sp < ly.spires; sp++) {
      var side = sp % 2 ? 1 : -1;
      var px = W * (0.5 + side * (0.30 + lr() * 0.19));
      var sh = H * (0.10 + lr() * 0.17) * (1 - L * 0.22), sw = sh * (0.10 + lr() * 0.07);
      var lean = (lr() - 0.5) * sw * 1.4, by = ly.base + 4;
      g.beginPath();
      g.moveTo(px - sw, by);
      g.lineTo(px - sw * 0.62 + lean, by - sh * 0.82);
      // Snapped crown.
      g.lineTo(px - sw * 0.30 + lean, by - sh * (0.90 + lr() * 0.10));
      g.lineTo(px - sw * 0.05 + lean, by - sh * 0.84);
      g.lineTo(px + sw * 0.22 + lean, by - sh * (0.96 + lr() * 0.08));
      g.lineTo(px + sw * 0.52 + lean, by - sh * 0.74);
      g.lineTo(px + sw, by);
      g.closePath(); g.fill();
      if (L < 2 && lr() < 0.7) {
        g.save();
        g.fillStyle = 'rgba(255,196,120,' + (0.55 - L * 0.15) + ')';
        g.fillRect(px - sw * 0.12 + lean * 0.5, by - sh * (0.42 + lr() * 0.2), Math.max(1, sw * 0.16), Math.max(1.5, sw * 0.36));
        g.restore();
      }
    }

    var mist = g.createLinearGradient(0, ly.base - ly.amp * 0.35, 0, ly.base + H * 0.05);
    mist.addColorStop(0, 'rgba(226,128,90,0)');
    mist.addColorStop(1, 'rgba(226,128,90,' + (0.30 - L * 0.08) + ')');
    g.fillStyle = mist; g.fillRect(0, ly.base - ly.amp * 0.35, W, ly.amp * 0.35 + H * 0.05);
  }

  var ground = g.createLinearGradient(0, horizon + H * 0.05, 0, H);
  ground.addColorStop(0, 'rgba(18,11,30,0)');
  ground.addColorStop(0.5, 'rgba(40,22,52,0.85)');
  ground.addColorStop(1, '#1c1230');
  g.fillStyle = ground; g.fillRect(0, horizon + H * 0.05, W, H);

  var vig = g.createRadialGradient(W / 2, H * 0.42, H * 0.30, W / 2, H * 0.42, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(4,3,10,0)');
  vig.addColorStop(1, 'rgba(4,3,10,0.62)');
  g.fillStyle = vig; g.fillRect(0, 0, W, H);
  return c;
}

// Streak clouds lit from below by the horizon. Tiles horizontally so the layer
// can drift for ever.
function _homeArtBuildClouds(W, H) {
  var c = _homeArtCanvas(W, H * 0.62), g = c.getContext('2d');
  var u = Math.min(W, H) / 900, rnd = _homeArtRng(777);
  for (var i = 0; i < 11; i++) {
    var depth = rnd();                                  // 0 high and dark, 1 low and warm
    var cy = H * (0.07 + depth * 0.47), cx = rnd() * W;
    var len = (240 + rnd() * 420) * u, th = (9 + rnd() * 15) * u;
    var lobes = [];
    for (var k = 0; k < 13; k++) {
      var t = rnd();
      lobes.push([(t - 0.5) * len, (rnd() - 0.5) * th * 0.7,
                  len * (0.10 + rnd() * 0.16) * (1 - Math.abs(t - 0.5) * 1.1),
                  th * (0.35 + rnd() * 0.5) * (1 - Math.abs(t - 0.5) * 0.9)]);
    }
    var body = depth < 0.5 ? '#2b1d47' : '#2e1638';
    var lit  = depth < 0.5 ? '#4b2d5c' : '#bd6542';
    for (var wrap = -1; wrap <= 1; wrap++) {
      var ox = cx + wrap * W;
      for (var pass = 0; pass < 2; pass++) {
        g.fillStyle = pass === 0 ? lit : body;
        var dy = pass === 0 ? 1.4 * u : 0;
        for (var q = 0; q < lobes.length; q++) {
          var lb = lobes[q];
          if (lb[2] <= 0 || lb[3] <= 0) continue;
          g.beginPath(); g.ellipse(ox + lb[0], cy + lb[1] + dy, lb[2], lb[3], 0, 0, Math.PI * 2); g.fill();
        }
      }
    }
  }
  return c;
}

// Poses, measured from the hip in the old scene's units: x along the facing,
// y down. `far` limbs are the shadowed pair behind the torso.
var _HOME_ART_POSES = {
  dash: {
    sh: [8, -34], head: [14, -48],
    nearArm: [[-14, -22], [-26, -14]], farArm: [[26, -26], [40, -34]],
    nearLeg: [[22, 10], [34, 26]],     farLeg: [[-16, 18], [-34, 34]],
    wAng: Math.atan2(-26, -38)
  },
  leap: {
    sh: [4, -35], head: [9, -49],
    nearArm: [[-2, -52], [-13, -64]],  farArm: [[20, -30], [34, -37]],
    nearLeg: [[20, 4], [13, 25]],      farLeg: [[-11, 14], [-29, 21]],
    wAng: Math.atan2(-22, -24)
  },
  lunge: {
    sh: [12, -32], head: [20, -45],
    nearArm: [[20, -19], [34, -23]],   farArm: [[0, -21], [-8, -14]],
    nearLeg: [[25, 6], [41, 22]],      farLeg: [[-18, 14], [-38, 26]],
    wAng: 0.07
  },
  // Airborne: nothing here plants a foot, so the figure never reads as standing.
  soar: {
    sh: [14, -31], head: [22, -44],
    nearArm: [[0, -43], [-13, -53]],   farArm: [[30, -31], [45, -37]],
    nearLeg: [[23, -3], [14, 17]],     farLeg: [[-21, 9], [-43, 14]],
    wAng: Math.atan2(-30, -22)
  },
  dive: {
    sh: [15, -29], head: [25, -41],
    nearArm: [[28, -20], [43, -22]],   farArm: [[1, -23], [-11, -31]],
    nearLeg: [[-17, 15], [-37, 23]],   farLeg: [[-21, 2], [-36, -13]],
    wAng: 0.07
  }
};

// One fighter in the in-game look (black body, outline in its own colour),
// built with the same FigureSkin calls Fighter.draw makes.
// o = { u, face, pose, rot, color, weapon, alpha, glow, scarf, t }
// rot tilts the whole figure about the hip; negative is nose-up for either facing.
function _homeArtFighter(ctx, hx, hy, o) {
  var K = 0.84;                               // old scene units -> game pixels
  var pose = _HOME_ART_POSES[o.pose] || _HOME_ART_POSES.dash;
  var S = o.u / K, f = o.face || 1, alpha = o.alpha === undefined ? 1 : o.alpha;
  var pt = function (a) { return { x: a[0] * K, y: a[1] * K }; };
  var LW = (typeof FIG_LINE_W !== 'undefined') ? FIG_LINE_W : 3.8;
  var HR = (typeof FIG_HEAD_R !== 'undefined') ? FIG_HEAD_R : 9;

  var hip = { x: 0, y: 0 }, sh = pt(pose.sh), head = pt(pose.head);
  var nE = pt(pose.nearArm[0]), nH = pt(pose.nearArm[1]);
  var fE = pt(pose.farArm[0]),  fH = pt(pose.farArm[1]);
  var nK = pt(pose.nearLeg[0]), nF = pt(pose.nearLeg[1]);
  var fK = pt(pose.farLeg[0]),  fF = pt(pose.farLeg[1]);
  var ang = function (a, b) { return Math.atan2(b.y - a.y, b.x - a.x); };

  var near = FigureSkin.begin(), far = FigureSkin.begin();
  var hd = Math.hypot(head.x - sh.x, head.y - sh.y) || 1;
  FigureSkin.segment(near,
    [{ x: head.x - (head.x - sh.x) / hd * HR * 0.55, y: head.y - (head.y - sh.y) / hd * HR * 0.55 }, sh],
    [LW * 0.55, LW * 0.92]);
  FigureSkin.head(near, head.x, head.y, HR, 1);
  FigureSkin.segment(near, [sh, { x: (sh.x + hip.x) * 0.5 + 1, y: (sh.y + hip.y) * 0.5 }, hip],
    [LW * 1.85, LW * 1.45, LW * 1.30]);
  FigureSkin.segment(near, [sh, nE, nH], [LW * 1.15, LW * 0.92, LW * 0.70], true);
  FigureSkin.hand(near, nH.x, nH.y, ang(nE, nH), 1, 1);
  FigureSkin.segment(near, [hip, nK, nF], [LW * 1.30, LW * 1.00, LW * 0.76], true);
  FigureSkin.foot(near, nF.x, nF.y + 1.2, ang(nK, nF), 1);

  FigureSkin.segment(far, [sh, fE, fH], [LW * 1.02, LW * 0.82, LW * 0.62]);
  FigureSkin.hand(far, fH.x, fH.y, ang(fE, fH), 1, 0.85);
  FigureSkin.segment(far, [hip, fK, fF], [LW * 1.16, LW * 0.90, LW * 0.68]);
  FigureSkin.foot(far, fF.x, fF.y + 1.2, ang(fK, fF), 1);

  var pal = { accent: o.color || '#00d4ff' };

  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(S * f, S);
  if (o.rot) ctx.rotate(o.rot);

  // Scarf first, so it streams out from behind the neck.
  if (o.scarf) {
    var t = o.t || 0;
    var w1 = Math.sin(t * 2.2) * 4, w2 = Math.sin(t * 2.2 + 1.2) * 7;
    var nx = head.x - 3, ny = head.y + HR * 0.75, tx = -78, ty = -30 + w2;
    var sg = ctx.createLinearGradient(nx, ny, tx, ty);
    sg.addColorStop(0,    'rgba(255,66,58,' + alpha + ')');
    sg.addColorStop(0.6,  'rgba(214,34,34,' + (0.8 * alpha) + ')');
    sg.addColorStop(1,    'rgba(150,20,20,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(nx, ny - 2.6);
    ctx.bezierCurveTo(-24, -34 + w1, -50, -40 + w2, tx, ty);
    ctx.bezierCurveTo(-50, -33 + w2, -24, -27 + w1, nx, ny + 2.6);
    ctx.closePath(); ctx.fill();
  }

  if (o.glow) {
    ctx.save();
    ctx.globalAlpha = 0.55 * alpha;
    ctx.shadowColor = pal.accent; ctx.shadowBlur = o.glow;
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.stroke(near.p);
    ctx.restore();
  }

  FigureSkin.paint(far, pal, true, ctx, alpha);

  // The real weapon art, gripped in the near hand along the pose's weapon line.
  var spr = (o.weapon && typeof WEAPON_SPRITES !== 'undefined') ? WEAPON_SPRITES[o.weapon] : null;
  if (spr && spr.ready && spr.img && spr.img.width) {
    var len = spr.len * 1.08, hgt = len * spr.img.height / spr.img.width;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(nH.x, nH.y);
    ctx.rotate(pose.wAng);
    ctx.drawImage(spr.img, -len * spr.anchor, -hgt * spr.shaftY, len, hgt);
    ctx.restore();
  }

  FigureSkin.paint(near, pal, false, ctx, alpha);
  ctx.restore();
}

function _homeArtShards(ctx, W, H, t) {
  var m = _homeArtMoonPos(W, H), rnd = _homeArtRng(1234);
  ctx.save();
  for (var i = 0; i < 9; i++) {
    var a = -0.95 + rnd() * 0.75, d = m.r * (1.10 + rnd() * 0.55), sr = m.r * (0.018 + rnd() * 0.055);
    var drift = Math.sin(t * (0.18 + rnd() * 0.2) + i * 1.7) * m.r * 0.022;
    var x = m.x + Math.cos(a) * (d + drift), y = m.y + Math.sin(a) * (d + drift);
    var rot = rnd() * 6.28 + t * (rnd() - 0.5) * 0.12;
    ctx.beginPath();
    for (var v = 0; v < 5; v++) {
      var va = rot + (v / 5) * Math.PI * 2, vr = sr * (0.6 + rnd() * 0.8);
      if (v === 0) ctx.moveTo(x + Math.cos(va) * vr, y + Math.sin(va) * vr);
      else ctx.lineTo(x + Math.cos(va) * vr, y + Math.sin(va) * vr);
    }
    ctx.closePath();
    var sg = ctx.createLinearGradient(x - sr, y - sr, x + sr, y + sr);
    sg.addColorStop(0, '#f1d6ac'); sg.addColorStop(1, '#a85a50');
    ctx.fillStyle = sg; ctx.fill();
  }
  ctx.restore();
}

function _homeArtScene(ctx, W, H, t) {
  if (typeof FigureSkin === 'undefined') return false;
  var A = _homeArt;
  if (A.W !== W || A.H !== H || !A.sky) {
    A.W = W; A.H = H;
    A.sky = _homeArtBuildSky(W, H);
    A.clouds = _homeArtBuildClouds(W, H);
  }
  var u = Math.min(W, H) / 900, bandY = H * 0.24;

  ctx.drawImage(A.sky, 0, 0);
  _homeArtShards(ctx, W, H, t);
  var cx = -((t * 5 * u) % W);
  ctx.save();
  ctx.globalAlpha = 0.86;
  ctx.drawImage(A.clouds, cx, 0);
  ctx.drawImage(A.clouds, cx + W, 0);
  ctx.restore();

  var riftX = W * 0.17, riftY = bandY + 8 * u, riftH = H * 0.30;
  var heroX = W * 0.36, heroY = bandY + 4 * u, hu = 1.9 * u;
  var KAEL = '#00d4ff', HUNTER = '#ff483a';
  // Kael's leap out of the tear: a rising arc from its mouth to where he hangs.
  var launchX = riftX + 10 * u, launchY = riftY + 46 * u, HERO_ROT = -0.30;
  var arc = function (p) {
    return { x: launchX + (heroX - launchX) * p,
             y: launchY + (heroY - launchY) * p - Math.sin(Math.PI * p) * 22 * u };
  };

  if (typeof _homeRift === 'function') _homeRift(ctx, riftX, riftY, riftH, u, t);

  // Speed streaks out of the rift, along Kael's line of travel.
  ctx.save();
  ctx.lineCap = 'round';
  for (var i = 0; i < 9; i++) {
    var ph = (t * 0.55 + i * 0.111) % 1;
    var p0 = arc(ph * 0.92), p1 = arc(ph * 0.92 + 0.02);
    var dir = Math.atan2(p1.y - p0.y, p1.x - p0.x);
    var off = (i - 4) * 8 * u + Math.sin(i * 2.1) * 5 * u;
    var sx = p0.x - Math.sin(dir) * off, sy = p0.y - 36 * u + Math.cos(dir) * off;
    var len = (42 + (i % 3) * 30) * u, a = 0.34 * Math.sin(Math.PI * ph);
    var ex = sx - Math.cos(dir) * len, ey = sy - Math.sin(dir) * len;
    var lg = ctx.createLinearGradient(ex, ey, sx, sy);
    lg.addColorStop(0, 'rgba(190,140,255,0)');
    lg.addColorStop(1, 'rgba(210,170,255,' + a.toFixed(3) + ')');
    ctx.strokeStyle = lg; ctx.lineWidth = 1.6 * u;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(sx, sy); ctx.stroke();
  }
  ctx.restore();

  for (var k = 3; k >= 1; k--) {
    var gp = arc(1 - k * 0.22);
    _homeArtFighter(ctx, gp.x, gp.y, {
      u: hu, face: 1, pose: 'soar', rot: HERO_ROT - k * 0.10, color: '#b48cff', alpha: 0.07 * (4 - k)
    });
  }

  var foes = [
    { x: 0.945, y: 0.060, s: 0.86, w: 'sword',  pose: 'dive', rot: 0.20, sp: 0.95, ph: 4.4 },
    { x: 0.855, y:-0.035, s: 1.08, w: 'katana', pose: 'dive', rot: 0.34, sp: 0.75, ph: 3.1 },
    { x: 0.755, y: 0.050, s: 1.32, w: 'sword',  pose: 'soar', rot: 0.10, sp: 1.05, ph: 1.7 },
    { x: 0.665, y: 0.030, s: 1.62, w: 'axe',    pose: 'leap', rot: 0.26, sp: 0.85, ph: 0.0 }
  ];
  for (var n = 0; n < foes.length; n++) {
    var fo = foes[n];
    var drift = Math.sin(t * fo.sp + fo.ph) * 11 * u;
    _homeArtFighter(ctx, W * fo.x - drift, bandY + H * fo.y + Math.sin(t * fo.sp * 1.3 + fo.ph) * 4 * u, {
      u: u * fo.s, face: -1, pose: fo.pose, rot: fo.rot, color: HUNTER, weapon: fo.w,
      alpha: Math.min(1, 0.50 + fo.s * 0.34), glow: 5
    });
  }

  _homeArtFighter(ctx, heroX, heroY + Math.sin(t * 1.15) * 4 * u, {
    u: hu, face: 1, pose: 'soar', rot: HERO_ROT, color: KAEL, weapon: 'sword', scarf: true, glow: 8, t: t
  });

  // Lower scrim, last, so the hub cards read whatever sits behind them.
  var scrim = ctx.createLinearGradient(0, H * 0.34, 0, H * 0.66);
  scrim.addColorStop(0, 'rgba(6,4,12,0)');
  scrim.addColorStop(1, 'rgba(6,4,12,0.58)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.34, W, H * 0.66);
  return true;
}
