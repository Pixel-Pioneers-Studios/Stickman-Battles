'use strict';
/*
 * smb-figure-skin.js — the MATERIAL layer for the player figure.
 *
 * This file knows nothing about poses, states, IK or timing. Fighter.draw()
 * solves every joint exactly as it always has and hands the positions here; the
 * pose math is tuned and load-bearing (melee reach derives from FIG_ARM_LEN,
 * weapons anchor to the solved hand) and must not be touched to change how the
 * body LOOKS.
 *
 * ── THE ONE IDEA IN THIS FILE ─────────────────────────────────────────────
 * A body is ONE shape, not a pile of parts.
 *
 * The first version of this file painted each part — head, neck, torso, four
 * limbs, hands, feet — as its own closed shape with its own outline and its own
 * light and shadow. That is structurally a set of components bolted together,
 * and it read exactly like that: a robot assembled from pieces. No amount of
 * softening the seams fixes it, because the seams ARE two separately outlined,
 * separately lit shapes meeting.
 *
 * So nothing here paints a part. Callers ACCUMULATE geometry into one Path2D
 * and `paint()` renders that whole path in a single pass:
 *
 *   1. stroke the compound path at DOUBLE rim width
 *   2. fill the union on top — this buries every interior seam stroke outright,
 *      plus the inner half of the outer stroke, leaving a clean single-width
 *      outline around the silhouette and nothing at all inside it
 *   3. clip to that same path and wrap ONE light gradient across the whole body
 *
 * Step 2 is the trick that makes this work with no offscreen canvas. It is the
 * same union-fill insight the clouds and treeline in smb-drawing-arenas.js
 * needed: overlapping shapes filled individually always show each shape.
 *
 * Only TWO silhouettes are drawn per fighter — the far-side arm and leg, then
 * everything else — because a body with no depth cue at all is a blob. One
 * shadowed mass emerging from behind one lit mass reads as a person.
 *
 * ── COLOUR ────────────────────────────────────────────────────────────────
 * A single hue shifted only in VALUE is how you paint plastic and metal. Real
 * surfaces shift TEMPERATURE with light: the lit side moves warm, the shadow
 * moves cool AND gains saturation. That split does as much work here as the
 * geometry does, and its absence was the other half of the machined look.
 *
 * Load order: after smb-palette.js (colour primitives), before smb-fighter.js.
 */

const FigureSkin = (function () {

  // ── Colour ────────────────────────────────────────────────────────────────

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

  /** Rotate a hue toward a target the SHORT way round the wheel. */
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
    // Enough chroma left to read as a material rather than a moulded toy. The
    // grounded look comes from the value structure and the temperature split
    // below, NOT from draining the colour — an evenly lit desaturated form is
    // precisely what plastic looks like.
    const s = Math.min(0.70, s0 * 0.88);
    const l = Math.max(0.30, Math.min(0.54, l0 * 0.82));

    const base = _hslArr(h, s, l);
    // Temperature is applied by MIXING toward a light colour, not by rotating
    // the hue far around the wheel. Rotating a cyan 0.22 toward orange takes it
    // through GREEN and the fighter turns sickly; a real warm light on a cool
    // surface adds red and yellow, it does not re-hue the object. Small rotation
    // for the shift in character, RGB mix for the actual warmth.
    // Kept close to base: a highlight that travels a long way in value washes
    // the identity colour out of the top half of the figure, and team read at a
    // glance matters more than showing off the ramp.
    const lite = _mix(_hslArr(_toward(h, WARM, 0.07), s * 0.92, Math.min(0.70, l + 0.15)),
                      SUNLIGHT, 0.20);
    const dark = _mix(_hslArr(_toward(h, COOL, 0.10), Math.min(0.85, s * 1.25), Math.max(0.14, l * 0.52)),
                      SKYSHADE, 0.24);
    const rim  = _mix(_hslArr(h, Math.min(0.70, s * 1.20), 0.17), SKYSHADE, 0.30);
    // The far side is the SAME material sitting in shadow — one step cooler and
    // darker, never a second substance.
    const far    = _mix(_hslArr(h, Math.min(0.75, s * 1.10), Math.max(0.18, l * 0.70)), SKYSHADE, 0.22);
    const farRim = _mix(_hslArr(h, Math.min(0.70, s * 1.15), 0.135), SKYSHADE, 0.30);

    const p = {
      base: _css(base), far: _css(far),
      rim:  _css(rim),  farRim: _css(farRim),
      accent: key,
      // Opaque ramp stops, pre-built — these would otherwise be re-strung on
      // every fighter on every frame.
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

  // ── Quality ───────────────────────────────────────────────────────────────
  let _crowd = 0;
  function quality() {
    if (typeof settings !== 'undefined' && settings.animQuality === 'classic') return 0;
    if (_crowd > 14) return 1;
    return 2;
  }
  function setCrowd(n) { _crowd = n | 0; }

  // ── Geometry accumulation ─────────────────────────────────────────────────
  // Everything below ADDS to a builder. None of it paints. Bounds are tracked
  // so paint() can lay one gradient across the whole figure instead of one per
  // part — that is what makes the light read as a single source falling on a
  // single object, rather than a separate studio setup for every limb.

  function begin() {
    // `parts` holds each closed shape on its own, `p` is all of them combined
    // for stroking, and `d` is the subset needing an internal form shadow.
    //
    // Why parts are kept separately — this cost an hour, so: a compound path
    // filled with 'nonzero' is NOT a union. Subpaths that wind in opposite
    // directions CANCEL where they overlap and punch a hole clean through the
    // figure. And winding is not something you can eyeball: a ribbon winds one
    // way, `arc`/`ellipse` at default anticlockwise wind the other, and a
    // bezier whose coordinates are multiplied by `facing` REVERSES when the
    // fighter turns around. The symptom was a hole at the neck that read as a
    // second little face on the chest, and only when facing one way.
    //
    // Painting each part with the same OPAQUE world-space gradient sidesteps
    // winding entirely: overlaps overpaint to the identical colour, so the
    // result is a true union with no seam and no orientation bugs.
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

  /**
   * A limb or torso: a variable-width ribbon through `pts`.
   *
   * Width is geometry here, not `lineWidth`. A stroked polyline is the same
   * width end to end, and a limb that does not taper from shoulder to wrist is
   * the single most "programmer art" thing about a stick figure. The flanks run
   * as quadratics through the midpoints so a bend curves rather than creasing —
   * a hard crease at every joint is a hinge, and hinges are robots.
   */
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
    // Trace one flank. `rev` walks it backwards, so the same code serves both
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
    // Rounded ends are traced INTO the outline rather than added as separate
    // circles — one closed subpath per limb, so a limb can never punch a hole
    // in itself and the cap can never show as a bulge at a joint.
    const _capAng = (i, j) => Math.atan2(pts[i].y - pts[j].y, pts[i].x - pts[j].x);
    const aEnd = _capAng(n - 1, n - 2), aStart = _capAng(0, 1);

    P.moveTo(L[0], L[1]);
    _flank(P, L, false);
    P.arc(pts[n - 1].x, pts[n - 1].y, ws[n - 1] * 0.5, aEnd + Math.PI / 2, aEnd - Math.PI / 2, true);
    _flank(P, R, true);
    P.arc(pts[0].x, pts[0].y, ws[0] * 0.5, aStart - Math.PI / 2, aStart + Math.PI / 2, true);
    P.closePath();
    _add(b, P);

    // Form shadow: the two long flanks as OPEN subpaths.
    //
    // Never the closed outline — closing it strokes a line straight across the
    // shoulder and the wrist, and end caps stroke as rings sitting mid-chest.
    // Only the long edges are real form.
    if (detail) {
      const D = b.d;
      D.moveTo(L[0], L[1]); _flank(D, L, false);
      D.moveTo(R[0], R[1]); _flank(D, R, false);
      b.hasD = true;
    }
  }

  /**
   * Head — a skull, not a ball. Broad cranium narrowing to a chin on the facing
   * side. A symmetrical oval has no front and no back, so it reads as a helmet.
   */
  function head(b, x, y, r, f) {
    const P = new Path2D();
    P.moveTo(x - f * r * 0.04, y - r * 1.10);
    P.bezierCurveTo(x - f * r * 0.74, y - r * 1.06,
                    x - f * r * 0.88, y - r * 0.24,
                    x - f * r * 0.70, y + r * 0.34);
    P.bezierCurveTo(x - f * r * 0.56, y + r * 0.82,
                    x - f * r * 0.14, y + r * 1.10,
                    x + f * r * 0.26, y + r * 1.00);
    P.bezierCurveTo(x + f * r * 0.62, y + r * 0.84,
                    x + f * r * 0.80, y + r * 0.40,
                    x + f * r * 0.82, y - r * 0.12);
    P.bezierCurveTo(x + f * r * 0.83, y - r * 0.66,
                    x + f * r * 0.52, y - r * 1.08,
                    x - f * r * 0.04, y - r * 1.10);
    P.closePath();
    _add(b, P);
    _bound(b, x, y, r * 1.15);
  }

  /** Fist — so an arm ends in a hand rather than a rounded stump. */
  function hand(b, x, y, ang, f, scale) {
    const s = scale || 1, P = new Path2D();
    const rx = 3.5 * s, ry = 3.0 * s;
    P.ellipse(x, y, rx, ry, ang * 0.25, 0, Math.PI * 2);
    _add(b, P);
    _bound(b, x, y, rx);
  }

  /**
   * Boot. Feet are what make a figure read as standing ON something rather than
   * hovering above it; the original rig ended both legs in a round line cap.
   */
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

  // ── The single paint ──────────────────────────────────────────────────────

  /**
   * Render an accumulated body as ONE continuous form.
   *
   * @param b    builder from begin()
   * @param p    palette from pal()
   * @param far  true for the back-side limbs: shadowed, weaker outline
   */
  function paint(b, p, far) {
    if (!b.parts.length) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap  = 'round';

    // 1 — outline at DOUBLE width. Every interior seam gets stroked too; the
    //     fills in step 2 bury all of them, and half of this one, leaving a
    //     single clean line around the silhouette and nothing inside it.
    ctx.globalAlpha = far ? 0.50 : 0.80;
    ctx.strokeStyle = far ? p.farRim : p.rim;
    ctx.lineWidth   = far ? 2.2 : 2.8;
    ctx.stroke(b.p);
    ctx.globalAlpha = 1;

    // 2 — A restrained, mostly-flat fill. The fighters are graphic stickmen,
    //     not hard-surface robots: one readable color per silhouette keeps the
    //     face, pose, and weapon doing the storytelling.
    //
    //     Opaque is the important word. Every part is filled with the same
    //     world-space gradient, so a pixel gets the same colour no matter which
    //     part covers it — overlaps overpaint identically and vanish. That is a
    //     true union with no seams, and unlike fill(compound,'nonzero') it
    //     cannot be broken by a subpath that happens to wind the other way.
    //
    //     Laying the light across the WHOLE figure rather than per part is also
    //     what makes it read as one object under one sun, instead of as a set
    //     of separately lit components.
    const style = far ? p.far : p.base;
    ctx.fillStyle = style;
    for (const q2 of b.parts) ctx.fill(q2);

    ctx.restore();
  }

  // ── Face ──────────────────────────────────────────────────────────────────

  /**
   * HUMAN EYES ARE DARK. At this size a real eye is a small dark mark with one
   * speck of catchlight — light going IN. An eye that EMITS reads as a machine
   * or a corpse, every time. There is no glow anywhere on this face.
   *
   * Expression is carried by eye openness and brow angle, the two things a face
   * actually uses, rather than by recolouring or by drawing a mouth.
   */
  function face(p, x, y, r, f, o) {
    o = o || {};
    const expr  = o.expr || 'neutral';
    const blink = Math.max(0, Math.min(1, o.blink || 0));
    const hurt  = !!o.hurt;
    const hard  = !!o.attacking || expr === 'intense';

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
      // Brow shadow: a soft smudge giving the sockets depth. Deliberately low
      // contrast — the hard band this replaced read as a visor.
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = p.eye;
      ctx.beginPath();
      ctx.ellipse(x + f * r * 0.28, eyeY - r * 0.22, r * 0.60, r * 0.28, f * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    if (open > 0.06) {
      ctx.fillStyle = p.eye;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.ellipse(nearX + lx, eyeY + ly, r * 0.20, r * 0.185 * open, f * -0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.68;                      // far eye: 3/4 view falloff
      ctx.beginPath();
      ctx.ellipse(farX + lx * 0.85, eyeY + ly, r * 0.135, r * 0.135 * open, f * -0.26, 0, Math.PI * 2);
      ctx.fill();

      if (open > 0.45 && quality() >= 2) {
        // The catchlight is what says "eye" rather than "hole".
        ctx.globalAlpha = 0.70;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(nearX + lx + f * r * 0.06, eyeY + ly - r * 0.06,
                    r * 0.06, r * 0.052, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.globalAlpha = 0.72;                      // shut: a lid line, not a gap
      ctx.strokeStyle = p.eye;
      ctx.lineCap = 'round';
      ctx.lineWidth = r * 0.10;
      ctx.beginPath();
      ctx.moveTo(nearX - f * r * 0.20, eyeY);
      ctx.lineTo(nearX + f * r * 0.22, eyeY + (hurt ? -r * 0.06 : 0));
      ctx.stroke();
    }

    // Brows. + = inner end down (anger / effort), - = inner end up (pain).
    let tilt = 0;
    if (hurt)                                      tilt = -0.50;
    else if (hard)                                 tilt =  0.52;
    else if (expr === 'focused')                   tilt =  0.32;
    else if (expr === 'cool' || expr === 'serene') tilt =  0.12;

    ctx.globalAlpha = 0.66;
    ctx.strokeStyle = p.eye;
    ctx.lineCap     = 'round';
    const browY = eyeY - r * 0.36;
    ctx.lineWidth = r * 0.13;
    ctx.beginPath();
    ctx.moveTo(nearX + f * r * 0.24, browY - tilt * r * 0.20);
    ctx.lineTo(nearX - f * r * 0.20, browY + tilt * r * 0.22);
    ctx.stroke();
    ctx.globalAlpha = 0.40;
    ctx.lineWidth = r * 0.105;
    ctx.beginPath();
    ctx.moveTo(farX + f * r * 0.18, browY - tilt * r * 0.15);
    ctx.lineTo(farX - f * r * 0.15, browY + tilt * r * 0.17);
    ctx.stroke();

    // A mouth only when the face is doing something, and always an open shape.
    // A drawn line curves into a smiley or a frown, and neither belongs here.
    if (hurt || o.attacking) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = p.eye;
      ctx.beginPath();
      ctx.ellipse(x + f * r * 0.40, y + r * 0.58,
                  r * 0.20, r * (hurt ? 0.17 : 0.13), f * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /** Contact shadow. Most of why a figure looks attached to the arena. */
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
