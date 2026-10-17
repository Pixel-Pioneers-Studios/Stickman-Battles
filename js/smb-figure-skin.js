'use strict';
// smb-figure-skin.js: material layer for the player figure. No pose or timing logic here.
// Fighter.draw() solves the joints and passes positions in. Don't change the pose math to change the look.
// Each body is one shape: parts accumulate into one Path2D, and paint() strokes, fills and lights it in one pass.
// Colour: the lit side shifts warm, the shadow shifts cool and saturated.
// Load order: after smb-palette.js, before smb-fighter.js.

const FigureSkin = (function () {


  function _hslArr(h, s, l) {
    const f = (n) => {
      const k = (n + h * 12) % 12;
      const c = s * Math.min(l, 1 - l);
      return Math.round(255 * (l - c * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))));
    };
    return [f(0), f(8), f(4)];
  }
  const _css  = (a)     => `rgb(${a[0]},${a[1]},${a[2]})`;
  const _mix  = (a, c, t) => [Math.round(a[0] + (c[0] - a[0]) * t),
                              Math.round(a[1] + (c[1] - a[1]) * t),
                              Math.round(a[2] + (c[2] - a[2]) * t)];
  const _rgba = (a, al) => `rgba(${a[0]},${a[1]},${a[2]},${al})`;

  // Rotate a hue the short way round the wheel.
  function _toward(h, target, amt) {
    let d = target - h;
    if (d >  0.5) d -= 1;
    if (d < -0.5) d += 1;
    return (h + d * amt + 1) % 1;
  }

  const WARM = 0.09;   // hue of the key light   (low sun)
  const COOL = 0.62;   // hue of the fill/shadow (sky bounce)
  const SUNLIGHT = [255, 236, 206];   // what the key light actually is
  const SKYSHADE = [ 28,  40,  72];   // what fills the shadow

  const _palCache = new Map();

  function pal(hex) {
    const key = hex || '#888';
    const hit = _palCache.get(key);
    if (hit) return hit;

    const c = SMBPal.hex2rgb(key);
    const [h, s0, l0] = SMBPal.rgb2hsl(c[0], c[1], c[2]);
    // Keep some chroma: flat grey reads as plastic. Value and the temperature split do the grounding.
    const s = Math.min(0.70, s0 * 0.88);
    const l = Math.max(0.30, Math.min(0.54, l0 * 0.82));

    const base = _hslArr(h, s, l);
    // Temperature is a mix toward a light colour, not a hue rotation (rotating cyan toward orange passes through green).
    // Keep highlights close to base, so the team colour reads at a glance.
    const lite = _mix(_hslArr(_toward(h, WARM, 0.07), s * 0.92, Math.min(0.70, l + 0.15)),
                      SUNLIGHT, 0.20);
    const dark = _mix(_hslArr(_toward(h, COOL, 0.10), Math.min(0.85, s * 1.25), Math.max(0.14, l * 0.52)),
                      SKYSHADE, 0.24);
    const rim  = _mix(_hslArr(h, Math.min(0.70, s * 1.20), 0.17), SKYSHADE, 0.30);
    // Far side: same material in shadow, one step cooler and darker.
    const far    = _mix(_hslArr(h, Math.min(0.75, s * 1.10), Math.max(0.18, l * 0.70)), SKYSHADE, 0.22);
    const farRim = _mix(_hslArr(h, Math.min(0.70, s * 1.15), 0.135), SKYSHADE, 0.30);

    const p = {
      base: _css(base), far: _css(far),
      rim:  _css(rim),  farRim: _css(farRim),
      accent: key,
      // Opaque ramp stops, built once. Rebuilding them per fighter per frame is waste.
      lite:    _css(lite),
      liteMid: _css(_mix(lite, base, 0.55)),
      darkMid: _css(_mix(base, dark, 0.55)),
      dark:    _css(dark),
      farLite: _css(_mix(far, lite, 0.22)),
      farDark: _css(_mix(far, dark, 0.45)),
      // Translucent, for the form shadow only.
      gDark:  _rgba(dark, 0.70),
      eye: _css(_hslArr(_toward(h, COOL, 0.30), Math.min(0.60, s * 1.10), 0.11)),
    };
    _palCache.set(key, p);
    return p;
  }

  let _crowd = 0;
  function quality() {
    if (typeof settings !== 'undefined' && settings.animQuality === 'classic') return 0;
    if (_crowd > 14) return 1;
    return 2;
  }
  function setCrowd(n) { _crowd = n | 0; }

  // Builders add geometry and never paint. Bounds are tracked so paint() can use one gradient for the whole figure.

  function begin() {
    // parts: each closed shape. p: all combined, for stroking. d: parts that need a form shadow.
    // Never fill a compound path with 'nonzero': opposite-winding subpaths cancel and punch holes.
    // The same opaque world-space gradient on every part makes overlaps overpaint identically, so no seams.
    return { parts: [], p: new Path2D(), d: new Path2D(), hasD: false,
             x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  }
  function _add(b, q) { b.parts.push(q); b.p.addPath(q); }
  function _bound(b, x, y, r) {
    if (x - r < b.x0) b.x0 = x - r;
    if (y - r < b.y0) b.y0 = y - r;
    if (x + r > b.x1) b.x1 = x + r;
    if (y + r > b.y1) b.y1 = y + r;
  }

  // Limb or torso: variable-width ribbon through pts. Constant width reads as programmer art. Quadratic flanks curve at joints.
  function segment(b, pts, ws, detail) {
    const n = pts.length, P = new Path2D();
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      let dx, dy;
      if (i === 0)          { dx = pts[1].x - pts[0].x;         dy = pts[1].y - pts[0].y; }
      else if (i === n - 1) { dx = pts[i].x - pts[i - 1].x;     dy = pts[i].y - pts[i - 1].y; }
      else                  { dx = pts[i + 1].x - pts[i - 1].x; dy = pts[i + 1].y - pts[i - 1].y; }
      const m = Math.hypot(dx, dy) || 1;
      const nx = -dy / m, ny = dx / m, w = ws[i] * 0.5;
      L.push(pts[i].x + nx * w, pts[i].y + ny * w);
      R.push(pts[i].x - nx * w, pts[i].y - ny * w);
      _bound(b, pts[i].x, pts[i].y, ws[i]);
    }
    // Trace one flank. rev walks it backwards, for both the closed outline and the open shadow edges.
    // the closed silhouette and the open form-shadow edges.
    const _flank = (T, A, rev) => {
      if (rev) {
        for (let i = n - 2; i > 0; i--) {
          T.quadraticCurveTo(A[i * 2], A[i * 2 + 1],
            (A[i * 2] + A[i * 2 - 2]) * 0.5, (A[i * 2 + 1] + A[i * 2 - 1]) * 0.5);
        }
        T.lineTo(A[0], A[1]);
      } else {
        for (let i = 1; i < n - 1; i++) {
          T.quadraticCurveTo(A[i * 2], A[i * 2 + 1],
            (A[i * 2] + A[i * 2 + 2]) * 0.5, (A[i * 2 + 1] + A[i * 2 + 3]) * 0.5);
        }
        if (n > 1) T.lineTo(A[(n - 1) * 2], A[(n - 1) * 2 + 1]);
      }
    };
    // Rounded ends are traced into the outline, not added as circles, so a limb can't punch a hole or bulge at a joint.
    const _capAng = (i, j) => Math.atan2(pts[i].y - pts[j].y, pts[i].x - pts[j].x);
    const aEnd = _capAng(n - 1, n - 2), aStart = _capAng(0, 1);

    P.moveTo(L[0], L[1]);
    _flank(P, L, false);
    P.arc(pts[n - 1].x, pts[n - 1].y, ws[n - 1] * 0.5, aEnd + Math.PI / 2, aEnd - Math.PI / 2, true);
    _flank(P, R, true);
    P.arc(pts[0].x, pts[0].y, ws[0] * 0.5, aStart - Math.PI / 2, aStart + Math.PI / 2, true);
    P.closePath();
    _add(b, P);

    // Form shadow: the two long flanks as open subpaths.
    // Never the closed outline: closing it strokes across the shoulder and wrist, and end caps show as rings.
    if (detail) {
      const D = b.d;
      D.moveTo(L[0], L[1]); _flank(D, L, false);
      D.moveTo(R[0], R[1]); _flank(D, R, false);
      b.hasD = true;
    }
  }

  // Head: a skull, not a ball. A symmetrical oval reads as a helmet.
  function head(b, x, y, r, f) {
    const P = new Path2D();
    // Round head: matches the menu art's hand-drawn stickman language.
    P.ellipse(x, y, r * 1.02, r * 1.02, 0, 0, Math.PI * 2);
    _add(b, P);
    _bound(b, x, y, r * 1.05);
  }

  // Fist, so an arm ends in a hand rather than a stump.
  function hand(b, x, y, ang, f, scale) {
    const s = scale || 1, P = new Path2D();
    const rx = 3.5 * s, ry = 3.0 * s;
    P.ellipse(x, y, rx, ry, ang * 0.25, 0, Math.PI * 2);
    _add(b, P);
    _bound(b, x, y, rx);
  }

  // Feet make a figure read as standing on something. Round caps hover.
  function foot(b, x, y, legAng, f) {
    const roll = Math.max(-0.55, Math.min(0.55, (legAng - Math.PI * 0.5) * 0.55));
    const co = Math.cos(roll), si = Math.sin(roll), P = new Path2D();
    const T = (lx, ly) => [x + lx * co - ly * si, y + lx * si + ly * co];
    const a  = T(-f * 2.6, -2.6), bb = T(f * 4.2, -1.8), c1 = T(f * 7.0, -0.8),
          c  = T( f * 6.6,  2.0), d  = T(-f * 2.8, 2.4), e1 = T(-f * 4.4, 0.2);
    P.moveTo(a[0], a[1]);
    P.lineTo(bb[0], bb[1]);
    P.quadraticCurveTo(c1[0], c1[1], c[0], c[1]);
    P.lineTo(d[0], d[1]);
    P.quadraticCurveTo(e1[0], e1[1], a[0], a[1]);
    P.closePath();
    _add(b, P);
    _bound(b, x, y, 8);
  }

  // paint() and face() draw to the game canvas unless given another 2D context.
  function _mainCtx() { return ctx; }


  // Render an accumulated body as one continuous form. far: shadowed back-side limbs, weaker outline. alpha: whole-form opacity.
  function paint(b, p, far, g, alpha) {
    if (!b.parts.length) return;
    const ctx = g || _mainCtx();
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';

    // 1: outline at double width. Interior seams get stroked too, and step 2 buries them.
    // The far-side limb is a shadowed part of the same fighter, not a ghost.
    // Nearly opaque, so legs don't vanish into arena art at store-cover scale.
    const _A = alpha === undefined ? 1 : alpha;
    ctx.globalAlpha = (far ? 0.86 : 0.94) * _A;
    ctx.strokeStyle = p.accent;
    ctx.lineWidth   = far ? 1.35 : 1.85;
    ctx.stroke(b.p);
    ctx.globalAlpha = _A;

    // 2: restrained, mostly flat fill. One colour per silhouette keeps the focus on face, pose and weapon.
    // Opaque matters: every part gets the same world-space gradient, so overlaps match and vanish.
    // One light across the whole figure reads as one object under one sun.
    const style = far ? 'rgba(3, 5, 18, 0.90)' : 'rgba(3, 5, 18, 0.80)';
    ctx.fillStyle = style;
    for (const q2 of b.parts) ctx.fill(q2);

    ctx.restore();
  }


  // Human eyes are dark: a small dark mark with one speck of catchlight. A glowing eye reads as a machine or a corpse.
  function face(p, x, y, r, f, o, g) {
    const ctx = g || _mainCtx();
    o = o || {};
    const expr  = o.expr || 'neutral';
    const blink = Math.max(0, Math.min(1, o.blink || 0));
    const hurt  = !!o.hurt;
    const hard  = !!o.attacking || expr === 'intense';
    const _A    = o.alpha === undefined ? 1 : o.alpha;

    let open = 0.80;                               // composed, not a wide stare
    if (hurt)                                      open = 0.42;
    else if (hard)                                 open = 0.60;
    else if (expr === 'focused')                   open = 0.76;
    else if (expr === 'cool' || expr === 'serene') open = 0.66;
    open *= (1 - blink);

    const nearX = x + f * r * 0.46, farX = x + f * r * 0.04;
    const eyeY  = y - r * 0.04;
    const lx = (o.lookX || 0), ly = (o.lookY || 0) * 0.7;

    ctx.save();

    if (quality() >= 2) {
      // Small dark socket for depth, without a bright band across the head.
      ctx.globalAlpha = 0.18 * _A;
      ctx.fillStyle = p.eye;
      ctx.beginPath();
      ctx.ellipse(x + f * r * 0.28, eyeY - r * 0.22, r * 0.60, r * 0.28, f * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    if (open > 0.06) {
      // Dark eyes with small catchlights.
      ctx.fillStyle = p.eye;
      ctx.globalAlpha = 0.92 * _A;
      ctx.beginPath();
      ctx.ellipse(nearX + lx, eyeY + ly, r * 0.20, r * 0.185 * open, f * -0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.68 * _A;                      // far eye: 3/4 view falloff
      ctx.beginPath();
      ctx.ellipse(farX + lx * 0.85, eyeY + ly, r * 0.135, r * 0.135 * open, f * -0.26, 0, Math.PI * 2);
      ctx.fill();

      if (open > 0.45 && quality() >= 2) {
        // The catchlight is what says "eye" rather than "hole".
        ctx.globalAlpha = 0.70 * _A;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(nearX + lx + f * r * 0.06, eyeY + ly - r * 0.06,
                    r * 0.06, r * 0.052, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.globalAlpha = 0.72 * _A;                      // shut: a lid line, not a gap
      ctx.strokeStyle = p.accent;
      ctx.lineCap = 'round';
      ctx.lineWidth = r * 0.10;
      ctx.beginPath();
      ctx.moveTo(nearX - f * r * 0.20, eyeY);
      ctx.lineTo(nearX + f * r * 0.22, eyeY + (hurt ? -r * 0.06 : 0));
      ctx.stroke();
    }

    // No brows: in the outline colour they read as a stripe across the head.

    // Mouth only when the face is doing something, always an open shape.
    if (hurt || o.attacking) {
      ctx.globalAlpha = 0.55 * _A;
      ctx.fillStyle = p.eye;
      ctx.beginPath();
      ctx.ellipse(x + f * r * 0.40, y + r * 0.58,
                  r * 0.20, r * (hurt ? 0.17 : 0.13), f * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Contact shadow: most of why a figure looks attached to the arena.
  function groundShadow(x, groundY, w, strength) {
    if (quality() < 2) return;
    ctx.save();
    ctx.globalAlpha = 0.28 * (strength === undefined ? 1 : strength);
    const g = ctx.createRadialGradient(x, groundY, 0, x, groundY, w);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, groundY, w, w * 0.30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return { pal, begin, segment, head, hand, foot, paint, face, groundShadow,
           quality, setCrowd };
})();
