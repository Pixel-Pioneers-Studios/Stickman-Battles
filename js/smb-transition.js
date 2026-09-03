'use strict';
// smb-transition.js — authored scene transitions for the story funnel.
//
// Runs on its own overlay canvas with its own rAF loop, so it keeps drawing
// while _startGameCore() tears the world down and rebuilds it.
//
// Depends on: smb-anim-core.js (animEase).
// ============================================================

const StoryTransition = {

  _el: null,
  _c: null,
  _raf: 0,
  _run: null,

  available() {
    return typeof document !== 'undefined' && typeof animEase !== 'undefined';
  },

  active() { return !!this._run; },

  _surface() {
    if (this._el && this._el.isConnected) return this._el;
    const el = document.createElement('canvas');
    el.id = 'storyTransitionCanvas';
    el.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9500;pointer-events:none;display:none;';
    document.body.appendChild(el);
    this._el = el;
    this._c  = el.getContext('2d');
    return el;
  },

  /**
   * opts: { kind:'ink'|'act', coverMs, holdMs, revealMs, color, accent,
   *         title, subtitle, onCovered, onDone }
   * onCovered fires on the first fully-opaque frame — swap the world there.
   */
  play(opts) {
    const o = opts || {};
    if (!StoryTransition.available()) {
      if (o.onCovered) o.onCovered();
      if (o.onDone) o.onDone();
      return false;
    }
    if (this._run) this._finish(true);

    const el = this._surface();
    el.width  = Math.max(1, Math.floor(window.innerWidth  * (window.devicePixelRatio || 1)));
    el.height = Math.max(1, Math.floor(window.innerHeight * (window.devicePixelRatio || 1)));
    el.style.display = 'block';

    this._run = {
      kind:     o.kind || 'ink',
      cover:    o.coverMs  === undefined ? 340 : o.coverMs,
      hold:     o.holdMs   === undefined ? 120 : o.holdMs,
      reveal:   o.revealMs === undefined ? 420 : o.revealMs,
      color:    o.color  || '#07080c',
      accent:   o.accent || '#5cc8ff',
      title:    o.title || '',
      subtitle: o.subtitle || '',
      onCovered: o.onCovered || null,
      onDone:    o.onDone || null,
      covered:  false,
      t0:       performance.now(),
      seed:     Math.random() * 1000,
    };
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => StoryTransition._frame());
    return true;
  },

  _frame() {
    const r = this._run;
    if (!r) return;
    const c = this._c, el = this._el;
    const w = el.width, h = el.height;
    const now = performance.now() - r.t0;
    const total = r.cover + r.hold + r.reveal;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);

    let phase, p;
    if (now < r.cover)                 { phase = 'cover';  p = now / r.cover; }
    else if (now < r.cover + r.hold)   { phase = 'hold';   p = 1; }
    else                               { phase = 'reveal'; p = (now - r.cover - r.hold) / r.reveal; }

    if (phase !== 'cover' && !r.covered) {
      r.covered = true;
      if (r.onCovered) { try { r.onCovered(); } catch (e) { console.error('[transition] onCovered threw:', e); } }
    }

    if (phase === 'cover')       this._ink(c, w, h, animEase.inOutQuint(p), 'in', r);
    else if (phase === 'hold')   this._ink(c, w, h, 1, 'in', r);
    else                         this._ink(c, w, h, animEase.inOutQuint(Math.min(1, p)), 'out', r);

    if (r.kind === 'act' && phase !== 'cover') this._card(c, w, h, r, phase, p);

    if (now >= total) { this._finish(false); return; }
    this._raf = requestAnimationFrame(() => StoryTransition._frame());
  },

  /**
   * A front sweeping across with sine lobes and droplets running ahead of it,
   * so the edge reads as ink rather than a wipe bar. 'in' fills behind the
   * front as it advances; 'out' empties behind it.
   */
  _ink(c, w, h, p, mode, r) {
    const dpr  = window.devicePixelRatio || 1;
    const lead = w * 0.30;
    const edge = -lead + p * (w + lead * 2);
    const wob = (u) => Math.sin(u * 6.1 + r.seed) * 26 * dpr
                     + Math.sin(u * 13.7 + r.seed * 1.7) * 12 * dpr
                     + Math.sin(u * 2.3 + r.seed * 0.5) * 34 * dpr;
    const steps = 26;

    c.save();
    c.fillStyle = r.color;
    c.beginPath();
    if (mode === 'in') {
      c.moveTo(-lead * 2, -10);
      c.lineTo(-lead * 2, h + 10);
      for (let i = steps; i >= 0; i--) c.lineTo(edge + wob(i / steps), (i / steps) * h);
    } else {
      c.moveTo(w + lead * 2, -10);
      c.lineTo(w + lead * 2, h + 10);
      for (let i = steps; i >= 0; i--) c.lineTo(edge + wob(i / steps), (i / steps) * h);
    }
    c.closePath();
    c.fill();

    const drops = 9;
    const dir = mode === 'in' ? 1 : -1;
    for (let i = 0; i < drops; i++) {
      const u   = (i + 0.5) / drops;
      const off = (Math.sin(u * 9.3 + r.seed) * 0.5 + 0.5) * 90 * dpr * dir;
      const rad = (10 + (Math.sin(u * 17.1 + r.seed * 2.1) * 0.5 + 0.5) * 22) * dpr;
      c.beginPath();
      c.arc(edge + off, u * h + Math.sin(u * 21.7) * 18 * dpr, rad, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  },

  _card(c, w, h, r, phase, p) {
    const dpr = window.devicePixelRatio || 1;
    let a = 1;
    if (phase === 'reveal') a = Math.max(0, 1 - p * 1.6);
    c.save();
    c.globalAlpha = a;
    c.textAlign = 'center';
    c.fillStyle = '#ffffff';
    const S = Math.max(dpr, w / 900);
    c.font = `bold ${Math.round(78 * S)}px 'Segoe UI', Arial, sans-serif`;
    c.fillText(r.title, w / 2, h / 2);
    if (r.subtitle) {
      c.fillStyle = r.accent;
      c.font = `${Math.round(26 * S)}px 'Segoe UI', Arial, sans-serif`;
      c.fillText(r.subtitle, w / 2, h / 2 + 58 * S);
    }
    c.strokeStyle = r.accent;
    c.lineWidth = 2.5 * S;
    c.beginPath();
    c.moveTo(w / 2 - 190 * S, h / 2 + 24 * S);
    c.lineTo(w / 2 + 190 * S, h / 2 + 24 * S);
    c.stroke();
    c.restore();
  },

  _finish(aborted) {
    const r = this._run;
    this._run = null;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    if (this._el) this._el.style.display = 'none';
    if (!r) return;
    if (!r.covered && r.onCovered) { try { r.onCovered(); } catch (e) { console.error('[transition] onCovered threw:', e); } }
    if (!aborted && r.onDone) { try { r.onDone(); } catch (e) { console.error('[transition] onDone threw:', e); } }
  },
};
