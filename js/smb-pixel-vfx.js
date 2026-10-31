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

  /** Composite every live effect. Call with ctx in world space. */
  function draw() {
    if (!active.length && flashK < 0.01 && darkK < 0.01) return;
    // Visible world rect from the current transform, so the buffer follows camera pan and zoom.
    const m = ctx.getTransform(), inv = m.inverse();
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const p0 = inv.transformPoint(new DOMPoint(0, 0)), p1 = inv.transformPoint(new DOMPoint(cw, ch));
    const wx0 = Math.min(p0.x, p1.x), wy0 = Math.min(p0.y, p1.y), wx1 = Math.max(p0.x, p1.x), wy1 = Math.max(p0.y, p1.y);
    if (darkK >= 0.01) {
      ctx.save(); ctx.fillStyle = `rgba(0,0,0,${darkK})`; ctx.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0); ctx.restore();
    }
    if (active.length) {
      const ox = Math.floor(wx0 / PX), oy = Math.floor(wy0 / PX);
      const w = Math.min(MAX_W, Math.ceil(wx1 / PX) - ox + 1), h = Math.min(MAX_H, Math.ceil(wy1 / PX) - oy + 1);
      _alloc(w, h);
      frame.ox = ox; frame.oy = oy;
      frame.color.fill(0);
      frame.light.fill(0);
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

  function clear() { active.length = 0; flashK = 0; darkK = 0; }

  return { spawn, on, update, draw, clear, actor, groundFn, get count() { return active.length; }, PX };
})();
