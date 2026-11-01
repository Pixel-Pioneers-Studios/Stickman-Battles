'use strict';
// smb-pixel-vfx.js: host for the pixel-art VFX in js/vfx/ (Sprite Fusion, MIT).
// Each effect is a factory (opts) -> { update(dt), draw(frame, layer), done(), stop?() } that paints into a
// pixel buffer at 2 world px per art pixel. This file owns that buffer: it covers the visible world, is
// cleared and refilled every frame, and is composited into world space (colour normally, light additively).
// The effect files push their factories into PIXEL_VFX; game code calls PixelVFX.spawn / PixelVFX.on.
// Depends on smb-globals.js (ctx, settings, screenShake) at call time only.

const PIXEL_VFX = {};
if (typeof settings !== 'undefined' && settings.pixelVfx === undefined) {
  try { settings.pixelVfx = localStorage.getItem('smc_pixelVfx') !== '0'; } catch (e) { settings.pixelVfx = true; }
}

const PixelVFX = (() => {
  const PX = 2;                 // world px per art pixel; the effects are authored at this scale
  const MAX_ACTIVE = 28;
  const MAX_W = 1100, MAX_H = 700;   // art-pixel cap on the buffer, for very wide zoomed-out views
  const active = [];            // { fx, name, born }
  let frame = null, colorCv = null, lightCv = null, colorImg = null, lightImg = null;
  let flashK = 0, flashRGB = '255,255,255', darkK = 0;
  let _parts = null, _stains = null;   // the game's own particles and blood stains, handed over for this frame
  const _colCache = new Map();
  let _cc = null;

  function enabled() {
    return typeof settings === 'undefined' || (settings.particles !== false && settings.pixelVfx !== false);
  }

  // Ground under x: the highest platform top at or below y0. The effects bounce sparks and lay
  // stains on it, so it has to be the surface the effect is standing over, not the arena floor.
  function groundFn(y0) {
    return (x) => {
      const pls = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
      let best = Infinity;
      for (const pl of pls) {
        if (!pl || pl.isFloorDisabled || x < pl.x || x > pl.x + pl.w) continue;
        if (pl.y >= y0 - 6 && pl.y < best) best = pl.y;
      }
      return best;
    };
  }

  function actor(f) {
    if (!f) return undefined;
    return {
      feet: () => [f.cx(), f.y + f.h],
      head: () => [f.cx(), f.y + 10],
      hand: () => {
        const tip = typeof f.getWeaponTipPos === 'function' ? f.getWeaponTipPos() : null;
        return tip ? { x: tip.x, y: tip.y, a: f.facing > 0 ? 0 : Math.PI } : { x: f.cx() + f.facing * 16, y: f.y + 40, a: f.facing > 0 ? 0 : Math.PI };
      },
    };
  }

  function _hooks(o, y0) {
    if (o.ground === undefined) o.ground = groundFn(y0);
    if (!o.shake) o.shake = k => {
      if (typeof settings !== 'undefined' && settings.screenShake === false) return;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, Math.min(22, k * 34));
    };
    if (!o.flash) o.flash = (k, rgb) => {
      if (typeof settings !== 'undefined' && settings.phaseFlash === false) return;
      if (k * 0.35 > flashK) { flashK = Math.min(0.45, k * 0.35); flashRGB = rgb || '255,255,255'; }
    };
    if (!o.darken) o.darken = k => { darkK = Math.max(darkK, Math.min(0.5, k)); };
    if (!o.seed) o.seed = 1 + Math.floor(Math.random() * 1e6);
    return o;
  }

  /** Start an effect. Returns its handle (keeps stop/hit/drop) or null when effects are off. */
  function spawn(name, opts) {
    if (!enabled()) return null;
    const make = PIXEL_VFX[name];
    if (typeof make !== 'function') return null;
    const o = Object.assign({}, opts || {});
    let fx;
    try {
      const y0 = o.y !== undefined ? o.y : (o.actor ? o.actor.feet()[1] : 0);
      fx = make(_hooks(o, y0));
    } catch (e) { return null; }
    if (active.length >= MAX_ACTIVE) active.shift();
    active.push({ fx, name, born: performance.now() });
    return fx;
  }

  /** Effect bound to a fighter: passes actor/facing so it follows them. */
  function on(f, name, opts) {
    if (!f) return null;
    return spawn(name, Object.assign({ actor: actor(f), x: f.cx(), y: f.y + f.h, facing: f.facing || 1 }, opts || {}));
  }

  function update(dt) {
    if (!active.length) return;
    for (let i = active.length - 1; i >= 0; i--) {
      const a = active[i];
      try {
        a.fx.update(dt);
        if (a.fx.done()) active.splice(i, 1);
      } catch (e) { active.splice(i, 1); }
    }
    flashK *= Math.pow(0.02, dt);
    darkK  *= Math.pow(0.08, dt);
  }

  function _alloc(w, h) {
    if (frame && frame.w === w && frame.h === h) return;
    const color = new Uint32Array(w * h), light = new Uint32Array(w * h);
    frame = { w, h, ox: 0, oy: 0, color, light };
    colorCv = colorCv || document.createElement('canvas');
    lightCv = lightCv || document.createElement('canvas');
    colorCv.width = lightCv.width = w;
    colorCv.height = lightCv.height = h;
    colorImg = new ImageData(new Uint8ClampedArray(color.buffer), w, h);
    lightImg = new ImageData(new Uint8ClampedArray(light.buffer), w, h);
  }

  // Any CSS colour the game uses (hex, rgb(a), hsl, names) -> [r, g, b], parsed once through a 1x1 canvas.
  function _rgb(c) {
    let v = _colCache.get(c);
    if (v) return v;
    if (!_cc) { const cv = document.createElement('canvas'); cv.width = cv.height = 1; _cc = cv.getContext('2d', { willReadFrequently: true }); }
    _cc.clearRect(0, 0, 1, 1); _cc.fillStyle = '#ffffff'; _cc.fillStyle = c; _cc.fillRect(0, 0, 1, 1);
    const d = _cc.getImageData(0, 0, 1, 1).data;
    v = [d[0], d[1], d[2]];
    if (_colCache.size < 600) _colCache.set(c, v);
    return v;
  }
  // Source-over into an unpremultiplied buffer.
  function _over(buf, i, r, g, b, a) {
    const d = buf[i], da = (d >>> 24) / 255, oa = a + da * (1 - a);
    if (oa <= 0) return;
    const k = da * (1 - a);
    const R = (r * a + (d & 255) * k) / oa, G = (g * a + ((d >> 8) & 255) * k) / oa, B = (b * a + ((d >> 16) & 255) * k) / oa;
    buf[i] = ((Math.round(oa * 255) << 24) | (B << 16) | (G << 8) | R) >>> 0;
  }
  // Additive light; composited with 'lighter', so alpha stays opaque and colour carries the strength.
  function _add(buf, i, r, g, b, a) {
    const d = buf[i];
    const R = Math.min(255, (d & 255) + r * a), G = Math.min(255, ((d >> 8) & 255) + g * a), B = Math.min(255, ((d >> 16) & 255) + b * a);
    buf[i] = ((255 << 24) | (B << 16) | (G << 8) | R) >>> 0;
  }

  /** The loop hands over its particles and stains instead of drawing them; draw() paints them as pixel art. */
  function particles(list, stains) {
    if (!enabled()) return false;
    _parts = list; _stains = stains;
    return true;
  }

  function _paintParticles(f) {
    const W = f.w, Hh = f.h, col = f.color, lit = f.light;
    if (_stains) for (const s of _stains) {
      const a = Math.min(0.55, (s.life / s.maxLife) * 0.7), cx = Math.round(s.x / PX) - f.ox, cy = Math.round(s.y / PX) - f.oy;
      const rx = Math.max(1, Math.round(s.r / PX)), ry = Math.max(0, Math.round(s.r * 0.28 / PX));
      for (let dy = -ry; dy <= ry; dy++) {
        const y = cy + dy; if (y < 0 || y >= Hh) continue;
        const w = ry ? Math.round(rx * Math.sqrt(1 - (dy * dy) / ((ry + 0.5) * (ry + 0.5)))) : rx;
        for (let dx = -w; dx <= w; dx++) { const x = cx + dx; if (x >= 0 && x < W) _over(col, y * W + x, dy < 0 ? 0x80 : 0x5a, 0, 0, a); }
      }
    }
    if (_parts) for (const p of _parts) {
      const a = Math.max(0, p.life / p.maxLife), c = _rgb(p.color);
      const px = Math.round(p.x / PX) - f.ox, py = Math.round(p.y / PX) - f.oy;
      const sq = p.vx * p.vx + p.vy * p.vy;
      if (!p.isBlood && sq > 4.8) {
        // Spark: a hard pixel streak back along its velocity, brightest at the head.
        const spd = Math.sqrt(sq), n = Math.max(1, Math.round(Math.min(10, spd * 1.25) / PX));
        for (let k = 0; k <= n; k++) {
          const x = px - Math.round(p.vx / spd * k), y = py - Math.round(p.vy / spd * k);
          if (x < 0 || y < 0 || x >= W || y >= Hh) continue;
          const t = a * 0.9 * (1 - k / (n + 1));
          _add(lit, y * W + x, c[0], c[1], c[2], t);
          if (k === 0) _over(col, y * W + x, 255, 255, 255, t * 0.6);
        }
        continue;
      }
      // Matter: a pixel blob with a darker lower-right edge.
      const r = Math.max(0.5, p.size * a / PX), R = Math.ceil(r);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > r * r + 0.6) continue;
        const x = px + dx, y = py + dy;
        if (x < 0 || y < 0 || x >= W || y >= Hh) continue;
        const sh = (dx + dy > r * 0.6) ? 0.62 : 1;
        _over(col, y * W + x, c[0] * sh | 0, c[1] * sh | 0, c[2] * sh | 0, a);
      }
    }
  }

  /** Composite every live effect. Call with ctx in world space. */
  function draw() {
    const hasParts = !!((_parts && _parts.length) || (_stains && _stains.length));
    if (!active.length && !hasParts && flashK < 0.01 && darkK < 0.01) return;
    // Visible world rect from the current transform, so the buffer follows camera pan and zoom.
    const m = ctx.getTransform(), inv = m.inverse();
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const p0 = inv.transformPoint(new DOMPoint(0, 0)), p1 = inv.transformPoint(new DOMPoint(cw, ch));
    const wx0 = Math.min(p0.x, p1.x), wy0 = Math.min(p0.y, p1.y), wx1 = Math.max(p0.x, p1.x), wy1 = Math.max(p0.y, p1.y);
    if (darkK >= 0.01) {
      ctx.save(); ctx.fillStyle = `rgba(0,0,0,${darkK})`; ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0); ctx.restore();
    }
    if (active.length || hasParts) {
      const ox = Math.floor(wx0 / PX), oy = Math.floor(wy0 / PX);
      const w = Math.min(MAX_W, Math.ceil(wx1 / PX) - ox + 1), h = Math.min(MAX_H, Math.ceil(wy1 / PX) - oy + 1);
      _alloc(w, h);
      frame.ox = ox; frame.oy = oy;
      frame.color.fill(0);
      frame.light.fill(0);
      if (hasParts) _paintParticles(frame);
      _parts = _stains = null;
      for (const layer of ['back', 'front']) {
        for (const a of active) {
          try { a.fx.draw(frame, layer); } catch (e) {}
        }
      }
      colorCv.getContext('2d').putImageData(colorImg, 0, 0);
      lightCv.getContext('2d').putImageData(lightImg, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(colorCv, ox * PX, oy * PX, w * PX, h * PX);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(lightCv, ox * PX, oy * PX, w * PX, h * PX);
      ctx.restore();
    }
    if (flashK >= 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${flashRGB},${flashK})`;
      ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0); ctx.restore();
    }
  }

  // Pixel pass: effect code that draws with lines and arcs (boss attacks, class and domain effects, projectiles)
  // runs with ctx's own properties pointed at a canvas PX times smaller, which is then scaled up unsmoothed.
  // ctx is a const shared by every file, so it is redirected in place rather than swapped.
  const _CTX_DRAWS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'drawImage', 'putImageData']);
  let _pctx = null, _pDepth = 0, _pDirty = false, _pStale = false, _pInstalled = false;
  // Installed once: ctx's own properties forward to the prototype as normal, and to _pctx while a pass runs.
  function _passInstall() {
    _pInstalled = true;
    const proto = CanvasRenderingContext2D.prototype, T = PX;
    const custom = {
      setTransform(a, b, c, d, e, f) {
        if (typeof a === 'object' && a) ({ a, b, c, d, e, f } = a);
        _pctx.setTransform(a / T, b / T, c / T, d / T, e / T, f / T);
      },
      resetTransform() { _pctx.setTransform(1 / T, 0, 0, 1 / T, 0, 0); },
      getTransform() { const m = _pctx.getTransform(); return new DOMMatrix([m.a * T, m.b * T, m.c * T, m.d * T, m.e * T, m.f * T]); },
    };
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === 'constructor' || name === 'canvas') continue;
      const d = Object.getOwnPropertyDescriptor(proto, name);
      if (typeof d.value === 'function') {
        const real = d.value, alt = custom[name], draws = _CTX_DRAWS.has(name);
        Object.defineProperty(ctx, name, { configurable: true, writable: true, value: function () {
          if (!_pDepth) return real.apply(ctx, arguments);
          if (alt) return alt.apply(null, arguments);
          if (draws) _pDirty = true;
          return real.apply(_pctx, arguments);
        } });
      } else if (d.get) {
        const get = d.get, set = d.set;
        Object.defineProperty(ctx, name, { configurable: true,
          get() { return get.call(_pDepth ? _pctx : ctx); },
          set(v) { if (set) set.call(_pDepth ? _pctx : ctx, v); } });
      }
    }
  }
  function _passBegin() {
    if (_pDepth > 0) { _pDepth++; return; }
    const P = CanvasRenderingContext2D.prototype;
    const m = P.getTransform.call(ctx), ga = Object.getOwnPropertyDescriptor(P, 'globalAlpha').get.call(ctx);
    const cw = Math.ceil(ctx.canvas.width / PX), ch = Math.ceil(ctx.canvas.height / PX);
    if (!_pctx) _pctx = document.createElement('canvas').getContext('2d');
    if (_pctx.canvas.width !== cw || _pctx.canvas.height !== ch) { _pctx.canvas.width = cw; _pctx.canvas.height = ch; _pStale = false; }
    if (_pStale) { _pctx.setTransform(1, 0, 0, 1, 0, 0); _pctx.clearRect(0, 0, cw, ch); _pStale = false; }
    _pctx.save();
    _pctx.setTransform(m.a / PX, m.b / PX, m.c / PX, m.d / PX, m.e / PX, m.f / PX);
    _pctx.globalAlpha = ga;
    if (!_pInstalled) _passInstall();
    _pDepth = 1;
  }
  function _passEnd() {
    if (--_pDepth > 0) return;
    _pctx.restore();
    if (!_pDirty) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.shadowBlur = 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(_pctx.canvas, 0, 0, _pctx.canvas.width * PX, _pctx.canvas.height * PX);
    ctx.restore();
    _pDirty = false; _pStale = true;
  }
  /** Run fn with its drawing pixelated. Falls straight through when Pixel Effects is off. */
  function pass(fn, self, args) {
    if (!enabled() || typeof CanvasRenderingContext2D === 'undefined') return fn.apply(self, args);
    _passBegin();
    try { return fn.apply(self, args); } finally { _passEnd(); }
  }
  /** Replace obj[name] with a pixelated version. Safe to call twice. */
  function wrap(obj, name) {
    const fn = obj && obj[name];
    if (typeof fn !== 'function' || fn._pvWrapped) return;
    const w = function () { return pass(fn, this, arguments); };
    w._pvWrapped = true;
    obj[name] = w;
  }

  function clear() { active.length = 0; flashK = 0; darkK = 0; }

  return { spawn, on, update, draw, clear, particles, pass, wrap, actor, groundFn, get count() { return active.length; }, PX };
})();
