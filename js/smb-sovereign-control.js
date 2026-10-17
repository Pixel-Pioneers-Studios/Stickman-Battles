'use strict';

// Dev-only F7 toggle: SovereignMK2's brain plays your fighter.
// Nothing is spawned. The local fighter keeps its body, weapon, class, colour,
// health and lives. Only the decision layer is swapped. F7 again gives control back.
//
// A throwaway SovereignMK2 harvests its state, every own property the host lacks
// is grafted onto the host, and the host's prototype is repointed at SovereignMK2.
// isAI = true makes Fighter.update() call updateAI() and stops smb-input.js from
// reading the keys, so there is no second driver.
//
// Sovereign must not announce himself: isSovereignMK2, isAdaptive and name are not
// grafted, draw() goes back to the host's class draw, and dialogue and announcements
// are stubbed only while the host's update runs (_inside).
//
// Parity with the boss fight: applySovereignPeakTuning() runs on the template, aiDiff
// is 'hard' (the whiff guard reads it), and Null Recoil and Null Anchor run, since they
// are his escape from juggles and his answer to ring-outs.
//
// Loadout is not shared. _applyLoadout and _ensureMatchLoadout refuse on a possessed host.
// Load after smb-smk2-class.js and smb-admin-core.js.

const SovereignControl = {
  active: false,

  _host: null,
  _proto: null,      // host's original prototype
  _grafted: null,    // key names added by the graft, deleted on release
  _saved: null,      // own-property values overwritten by the graft
  _inside: false,    // true only while the host's own update() is executing

  // Never graft these: other systems use them to recognise Sovereign.
  _BLOCKED: ['isSovereignMK2', 'isAdaptive', 'name', 'color', '_domainKey', 'isAI'],

  // Who gets possessed
  _pickHost() {
    if (typeof players === 'undefined' || !Array.isArray(players)) return null;
    const slot = (typeof onlineLocalSlot === 'number') ? onlineLocalSlot : 0;
    const pick = players[slot];
    if (pick && pick.controls && !pick.isBoss) return pick;
    return players.find(p => p && p.controls && !p.isBoss && !p.isAI) || null;
  },

  // Toggle
  toggle() {
    // A match restart replaces every Fighter. If the held host is gone, just drop it.
    if (this.active && (!this._host || !players.includes(this._host))) {
      this.active = false;
      this._host = this._proto = this._grafted = this._saved = null;
    }
    if (this.active) { this.release(); return false; }
    return this.engage();
  },

  engage() {
    if (this.active) return true;
    if (typeof SovereignMK2 !== 'function') return false;
    if (typeof gameRunning === 'undefined' || !gameRunning) return false;

    const host = this._pickHost();
    if (!host || host.health <= 0) return false;

    // Fresh every time: grafted state holds mutable objects (aiMemory, genome, ring buffers).
    let template;
    try {
      template = new SovereignMK2(-99999, -99999, host.color, host.weaponKey);
    } catch (e) {
      console.warn('[SovCtl] brain construction failed', e);
      return false;
    }

    // Tune the template to boss-fight peak (limiter broken, suffocate pressure, no warmup).
    // The constructor alone is weaker. 'silent' keeps the evolution effects off the player's body.
    if (typeof applySovereignPeakTuning === 'function') {
      try { applySovereignPeakTuning(template, { silent: true }); } catch (e) {}
    }

    // 2. Graft AI state: host's own properties always win.
    const grafted = [];
    for (const k of Object.keys(template)) {
      if (this._BLOCKED.includes(k)) continue;
      if (Object.prototype.hasOwnProperty.call(host, k)) continue;
      host[k] = template[k];
      grafted.push(k);
    }

    // 3. Save overwritten values, then repoint the prototype.
    const proto = Object.getPrototypeOf(host);
    const saved = {
      isAI:              host.isAI,
      aiDiff:            host.aiDiff,
      target:            host.target,
      aiTickInterval:    Object.prototype.hasOwnProperty.call(host, 'aiTickInterval') ? host.aiTickInterval : undefined,
      hadTickInterval:   Object.prototype.hasOwnProperty.call(host, 'aiTickInterval'),
      hadUpdate:         Object.prototype.hasOwnProperty.call(host, 'update'),
      update:            host.update,
      hadDraw:           Object.prototype.hasOwnProperty.call(host, 'draw'),
      draw:              host.draw
    };
    Object.setPrototypeOf(host, SovereignMK2.prototype);

    // Sovereign's timers are in frames, so he needs per-frame decisions, not the 15-frame AI gate.
    host.aiTickInterval = 1;
    host.isAI = true;
    // Human fighters are 'medium'. The whiff guard in attack() reads aiDiff, so set 'hard'.
    host.aiDiff = 'hard';

    // Null Anchor's tether is set at construction off-screen (-99999). Re-home it, or the
    // first save teleports the player into the void.
    host._anchorX = host.x;
    host._anchorY = host.y;
    // Loadout bookkeeping references the host's real stat line, not the template's.
    host._baseMaxHealth = host.maxHealth;
    host._baseSpeedMult = host.classSpeedMult || 1;

    // updateAI() only retargets when there is a target, so seed one or he stands still forever.
    if (!host.target || host.target.health <= 0) {
      try { host._acquireAITarget(); } catch (e) {}
    }

    // Draw the host's real class: no aura layer.
    const origDraw = proto.draw;
    host.draw = function () { return origDraw.apply(this, arguments); };

    // Wrap update(): keep a live target and open the dialogue-stub window.
    const self = this;
    host.update = function () {
      if (!this.target || this.target.health <= 0) {
        try { this._acquireAITarget(); } catch (e) {}
      }
      self._inside = true;
      try {
        return SovereignMK2.prototype.update.apply(this, arguments);
      } finally {
        self._inside = false;
      }
    };

    this._host    = host;
    this._proto   = proto;
    this._grafted = grafted;
    this._saved   = saved;
    this.active   = true;
    return true;
  },

  release() {
    if (!this.active) return false;
    const host  = this._host;
    const saved = this._saved;

    if (host) {
      if (this._proto) Object.setPrototypeOf(host, this._proto);
      for (const k of this._grafted) { try { delete host[k]; } catch (e) {} }

      if (saved.hadUpdate) host.update = saved.update; else delete host.update;
      if (saved.hadDraw)   host.draw   = saved.draw;   else delete host.draw;
      if (saved.hadTickInterval) host.aiTickInterval = saved.aiTickInterval;
      else delete host.aiTickInterval;

      delete host._sovDeathFired;
      host.isAI   = saved.isAI;
      host.aiDiff = saved.aiDiff;
      host.target = saved.target;

      // No half-finished swing or held shield left on release.
      host.attackTimer  = 0;
      host.attackEndlag = 0;
      host.shielding    = false;
      host.vx           = 0;
    }

    this.active   = false;
    this._host    = null;
    this._proto   = null;
    this._grafted = null;
    this._saved   = null;
    this._inside  = false;
    return false;
  }
};

// Dialogue stub. showBossDialogue (smb-drawing-arenas.js) is a window global, so smb-smk2-class.js
// calls go through it. Only the possessed fighter's lines are dropped (_inside).
(function () {
  if (typeof window === 'undefined' || typeof window.showBossDialogue !== 'function') return;
  if (window.showBossDialogue._sovCtlWrapped) return;
  const _orig = window.showBossDialogue;
  const _wrapped = function () {
    if (SovereignControl.active && SovereignControl._inside) return;
    return _orig.apply(this, arguments);
  };
  _wrapped._sovCtlWrapped = true;
  window.showBossDialogue = _wrapped;
})();

// Announcement stub, same scope. Null Recoil and Null Anchor banners would name him on the player's body.
(function () {
  if (typeof window === 'undefined' || typeof window.queueAnnouncement !== 'function') return;
  if (window.queueAnnouncement._sovCtlWrapped) return;
  const _orig = window.queueAnnouncement;
  const _wrapped = function () {
    if (SovereignControl.active && SovereignControl._inside) return;
    return _orig.apply(this, arguments);
  };
  _wrapped._sovCtlWrapped = true;
  window.queueAnnouncement = _wrapped;
})();

// checkDeaths() only calls onDeath() for isAdaptive fighters, which we don't graft.
// Mirror that death check for the host, once per death. The flag clears on respawn.
(function () {
  if (typeof window === 'undefined' || typeof window.checkDeaths !== 'function') return;
  if (window.checkDeaths._sovCtlWrapped) return;
  const _orig = window.checkDeaths;
  const _wrapped = function () {
    try {
      const h = SovereignControl.active ? SovereignControl._host : null;
      if (h) {
        if (h.health > 0) h._sovDeathFired = false;
        else if (!h._sovDeathFired && h.invincible === 0 && !h.isRemote && !h._brOut &&
                 typeof h.onDeath === 'function' && players.includes(h)) {
          h._sovDeathFired = true;
          h.onDeath();
        }
      }
    } catch (e) { console.warn('[SovCtl] onDeath hook failed', e); }
    return _orig.apply(this, arguments);
  };
  _wrapped._sovCtlWrapped = true;
  window.checkDeaths = _wrapped;
})();

// F7, dev/admin only. Success and refusal look the same on purpose.
window.addEventListener('keydown', function (e) {
  if (e.key !== 'F7') return;
  const _ae = document.activeElement;
  if (_ae && (_ae.tagName === 'INPUT' || _ae.tagName === 'TEXTAREA' || _ae.isContentEditable)) return;
  e.preventDefault();
  if (typeof _adminPanelIsAllowed !== 'function' || !_adminPanelIsAllowed()) return;
  SovereignControl.toggle();
});

window.SovereignControl = SovereignControl;
