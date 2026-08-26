'use strict';
/*
 * tools/sov-qte-autopilot.js — lets an AI-possessed Sovereign play TrueForm QTEs.
 *
 * DEV TOOL. Not loaded by index.html. Paste into the console, or let
 * tools/sov-ab.js inject it, then:
 *
 *     SovQTE.enable();                       // honest defaults
 *     SovQTE.enable({ mistakeRate: 0.15 });  // fallible
 *     SovQTE.stats();  SovQTE.disable();
 *
 * ── Why this is needed ───────────────────────────────────────────────────────
 * The TrueForm fight gates itself on four QTE checkpoints (75/50/25/10% boss HP).
 * They are keyboard-only: smb-qte-engine.js resolves a prompt by rising-edge on
 * the GLOBAL `keysDown` Set — `keysDown.has(prompt.key) && !prompt._wasDown`.
 * Sovereign drives a Fighter through AI code, never through keysDown, so a
 * possessed Sovereign stands there and eats every prompt as a failure. Phase 4 is
 * all-or-nothing, so the fight cannot be completed at all.
 *
 * So the QTE layer needs its own input source. This is it: a rAF loop that reads
 * the live prompts and injects real key events into `keysDown`, held for a few
 * frames and released, which is exactly the rising edge the engine looks for.
 *
 * ── Honesty ──────────────────────────────────────────────────────────────────
 * It reads ONLY what the screen shows: `displayKey` (the glyph drawn in the
 * bubble) and `isMirrored` (drawn as a distinct purple bubble by smb-qte-draw.js,
 * so a human sees it too), then inverts through _QTE_MIRROR the same way a player
 * who has learned the tell would. It never reads `prompt.key`. That keeps a QTE
 * pass meaningful rather than a free win — the only thing it gives Sovereign is
 * hands.
 *
 * `reactionFrames` is the delay before it presses, and `mistakeRate` is the
 * chance of pressing the wrong key on a prompt, so this can be tuned to a human
 * standard rather than a perfect one.
 */

(function () {
  const SovQTE = {
    active: false,
    opts: null,
    _raf: null,
    _held: [],      // { key, releaseAt }
    _seen: new WeakSet(),
    _plan: new WeakMap(),
    hits: 0, misses: 0, mistakes: 0, phases: [], _pressCount: 0,
    _tick: 0,   // own clock: _startQTE calls slowMotionFor(0, 99999), so frameCount
                // cannot be trusted to advance while a QTE is on screen.

    defaults: {
      reactionFrames: 10,   // frames after a prompt appears before pressing (~170ms)
      jitterFrames:   6,    // random extra delay, 0..n
      holdFrames:     4,    // how long the key stays down
      mistakeRate:    0,    // chance of pressing a wrong key
      readMirror:     true, // false = never spots the mirror tell, always fails P2/P4 mirrors
      log:            false
    },

    enable(opts) {
      if (typeof keysDown === 'undefined') { console.warn('[SovQTE] no keysDown'); return false; }
      this.opts = Object.assign({}, this.defaults, opts || {});
      this.hits = this.misses = this.mistakes = this._pressCount = 0;
      this.phases = [];
      if (this.active) return true;
      this.active = true;
      const self = this;
      (function tick() {
        self._raf = requestAnimationFrame(tick);
        if (!self.active) return;
        try { self._step(); } catch (e) { console.warn('[SovQTE]', e); }
      })();
      if (this.opts.log) console.log('[SovQTE] enabled', this.opts);
      return true;
    },

    disable() {
      this.active = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null;
      for (const h of this._held) keysDown.delete(h.key);
      this._held = [];
      return this.stats();
    },

    stats() {
      return { hits: this.hits, misses: this.misses, mistakes: this.mistakes,
               presses: this._pressCount, phases: this.phases.slice() };
    },

    // Resolve a prompt using only on-screen information.
    _readPrompt(p) {
      const shown = p.displayKey;
      if (p.isMirrored && this.opts.readMirror) {
        const inv = (typeof _QTE_MIRROR !== 'undefined') ? _QTE_MIRROR[shown] : null;
        return inv || shown;
      }
      return shown;   // not mirrored, or it failed to spot the tell
    },

    _step() {
      const now = ++this._tick;

      // Release finished holds first — the engine needs the key to go UP so the
      // next prompt's rising edge registers.
      for (let i = this._held.length - 1; i >= 0; i--) {
        if (now >= this._held[i].releaseAt) {
          keysDown.delete(this._held[i].key);
          this._held.splice(i, 1);
        }
      }

      const s = (typeof QTE_STATE !== 'undefined') ? QTE_STATE : null;
      if (!s || s.stage !== 'prompts' || !Array.isArray(s.prompts)) return;
      if (!this.phases.includes(s.phase)) this.phases.push(s.phase);

      for (const p of s.prompts) {
        if (!p || p.hit || p.missed) continue;

        // Decide once per prompt: when to press, and what to press.
        if (!this._plan.has(p)) {
          const o = this.opts;
          let key = this._readPrompt(p);
          let mistake = false;
          if (o.mistakeRate > 0 && Math.random() < o.mistakeRate) {
            const pool = (typeof _QTE_ALL_KEYS !== 'undefined' ? _QTE_ALL_KEYS : ['a','d','w','s',' ','q','e'])
              .filter(k => k !== key);
            key = pool[(Math.random() * pool.length) | 0];
            mistake = true;
          }
          // Never plan past the window — a slow read should MISS, not press late
          // into the next prompt and corrupt it.
          const delay = Math.min(o.reactionFrames + Math.floor(Math.random() * (o.jitterFrames + 1)),
                                 Math.max(0, (p.maxTimer || 60) - 2));
          this._plan.set(p, { key, at: (p.timer || 0) + delay, mistake, fired: false });
        }

        const plan = this._plan.get(p);
        if (plan.fired || (p.timer || 0) < plan.at) continue;

        // The engine's edge test is `has(key) && !_wasDown`, and it stamps
        // _wasDown from the same Set at the end of its own pass. Adding the key
        // here, before that pass runs this frame, is a genuine rising edge.
        keysDown.add(plan.key);
        this._held.push({ key: plan.key, releaseAt: now + this.opts.holdFrames });
        plan.fired = true;
        this._pressCount++;
        if (plan.mistake) this.mistakes++;
        if (this.opts.log) console.log('[SovQTE] press', JSON.stringify(plan.key),
          'for', JSON.stringify(p.displayKey), p.isMirrored ? '(mirrored)' : '');
      }

      // Tally resolutions.
      for (const p of s.prompts) {
        if (!p || this._seen.has(p)) continue;
        if (p.hit)    { this._seen.add(p); this.hits++; }
        else if (p.missed) { this._seen.add(p); this.misses++; }
      }
    }
  };

  if (typeof window !== 'undefined') window.SovQTE = SovQTE;
  if (typeof module !== 'undefined' && module.exports) module.exports = SovQTE;
})();
