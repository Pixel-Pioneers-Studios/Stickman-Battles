'use strict';

// ============================================================
// SOVEREIGN CONTROL — dev-only "let Sovereign play for me" toggle
// ============================================================
//
// Press F7 (admin/dev clearance only) mid-fight and SovereignMK2's brain takes
// over YOUR fighter. Nothing is spawned: the local fighter keeps its own body,
// weapon, class, domain, colour, name, health and lives — only the decision
// layer is replaced. Press F7 again to take the controls back.
//
// HOW IT WORKS
// ------------
// SovereignMK2's intelligence is not a separate "brain" object that emits inputs
// — updateAI() acts directly on `this` (writes this.vx, calls this.attack(),
// this.useSuper(), ~40 movement paths). So the only faithful way to run it on an
// existing fighter is to make that fighter, temporarily, a SovereignMK2:
//
//   1. Build a throwaway SovereignMK2 instance to harvest its constructor state.
//   2. Graft onto the host every own-property the host does not already have.
//      That rule is what protects the host's identity: every Fighter-constructor
//      field (x, y, health, weapon, name, colour, controls, lives…) is already an
//      own property, so it survives untouched. Only the AI-state fields land.
//   3. Repoint the host's prototype at SovereignMK2.prototype so it gains the
//      full behaviour set (updateAI, prediction, punish mode, limiter break…).
//   4. Set isAI = true. That is what makes Fighter.update() call updateAI(), and
//      it is also what makes the existing keyboard gates in smb-input.js
//      (`if (p.isAI || p.health <= 0) return;`) ignore the human at the keys — no
//      input.js change needed, and no two-drivers-fighting-over-vx bug.
//
// NO INDICATOR (a hard requirement of this feature)
// -------------------------------------------------
// Sovereign is loud. Everything that would announce him is suppressed:
//   * `isSovereignMK2` / `isAdaptive` / `name` are NOT grafted, so the boss HUD
//     bar, finisher targeting, the Sovereign advisor, the post-match adaptive
//     memory hook and the boss-dialogue anchor all keep ignoring this fighter.
//   * draw() is pinned back to the host's ORIGINAL class draw, dropping the
//     limiter-break aura / flash layer.
//   * showBossDialogue() is stubbed for exactly the window in which the host's
//     own update runs, so his 36 taunt lines are dropped while every other
//     entity's dialogue still works normally.
//   * queueAnnouncement() is stubbed for the same window, so Null Anchor's and
//     Null Recoil's banners never name him. The powers themselves RUN — see
//     below; only their captions are suppressed.
//
// PARITY WITH THE FIGHT (why the spirit is not a weaker Sovereign)
// ----------------------------------------------------------------
// Everything the boss-path Sovereign gets after construction must also be
// applied here, or possession silently ships a nerfed brain:
//   * applySovereignPeakTuning() — the shared peak numbers (see below).
//   * aiDiff = 'hard'. AdaptiveAI passes 'hard' to the Fighter constructor; a
//     human fighter was built with the default 'medium'. It is not cosmetic:
//     Fighter.attack()'s AI whiff-guard projects the swing forward at a
//     difficulty-scaled pursuit speed (medium 4.4 vs hard 5.0), so a possessed
//     host VETOED swings the real Sovereign commits to, and the whiff-guard is
//     the single largest consumer of his attack() calls.
//   * Null Recoil and Null Anchor. These used to be stubbed out here on the
//     grounds that they are loud. They are also the two systems that keep him
//     alive: Recoil is his only escape from a juggle, Anchor his only answer to
//     a ring-out — and a ring-out at healthy HP is how the player loses most of
//     their own lives in this matchup. Without them the spirit was juggled and
//     ringed out in fights the real Sovereign survives. They now run, silently.
//
// Still deliberately NOT shared: his loadout. _applyLoadout / _ensureMatchLoadout
// both refuse to fire on a possessed host, because the human picked their own
// weapon and class and the contract is that the body stays theirs.
//
// Load order: must come after smb-smk2-class.js (SovereignMK2) and
// smb-admin-core.js (_adminPanelIsAllowed).

const SovereignControl = {
  active: false,

  _host: null,
  _proto: null,      // host's original prototype
  _grafted: null,    // key names added by the graft, deleted on release
  _saved: null,      // own-property values overwritten by the graft
  _inside: false,    // true only while the host's own update() is executing

  // Fields that must never be grafted: each one is what some other system uses
  // to recognise Sovereign, and grafting it would light up an indicator.
  _BLOCKED: ['isSovereignMK2', 'isAdaptive', 'name', 'color', '_domainKey', 'isAI'],

  // ── Who gets possessed ───────────────────────────────────────────────────
  _pickHost() {
    if (typeof players === 'undefined' || !Array.isArray(players)) return null;
    const slot = (typeof onlineLocalSlot === 'number') ? onlineLocalSlot : 0;
    const pick = players[slot];
    if (pick && pick.controls && !pick.isBoss) return pick;
    return players.find(p => p && p.controls && !p.isBoss && !p.isAI) || null;
  },

  // ── Toggle ───────────────────────────────────────────────────────────────
  toggle() {
    // A match restart replaces every Fighter object. If the host we were holding
    // is no longer in play there is nothing to release — drop it and engage fresh.
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

    // 1. Harvest a fresh brain. Fresh every time, not cached — the grafted state
    //    includes mutable objects (aiMemory, genome, ring buffers) that must not
    //    be shared between possessions.
    let template;
    try {
      template = new SovereignMK2(-99999, -99999, host.color, host.weaponKey);
    } catch (e) {
      console.warn('[SovCtl] brain construction failed', e);
      return false;
    }

    // 1b. Bring the brain up to the strength of the Sovereign you actually
    //     fight. The constructor alone is NOT that Sovereign: _startGameCore
    //     applies a peak-tuning pass after construction (limiter broken,
    //     'suffocate' pressure, no observation warmup), and possession used to
    //     skip it entirely — so the spirit playing for you was measurably weaker
    //     than the one across the arena. Tuning the TEMPLATE rather than the
    //     host keeps every field on the normal graft path, so release() still
    //     removes all of it. `silent` starts him at the evolution stage the boss
    //     version reaches on his first tick, which is what keeps the escalation
    //     shake / particles / dialogue from ever firing on the player's body.
    if (typeof applySovereignPeakTuning === 'function') {
      try { applySovereignPeakTuning(template, { silent: true }); } catch (e) {}
    }

    // 2. Graft AI state — host's own properties always win.
    const grafted = [];
    for (const k of Object.keys(template)) {
      if (this._BLOCKED.includes(k)) continue;
      if (Object.prototype.hasOwnProperty.call(host, k)) continue;
      host[k] = template[k];
      grafted.push(k);
    }

    // 3. Save what we are about to overwrite, then repoint the prototype.
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

    // 4. Sovereign's timers are all written in frames — he needs the per-frame
    //    decision cadence, not the shared 15-frame AI gate.
    host.aiTickInterval = 1;
    host.isAI = true;
    // AdaptiveAI's own constructor passes 'hard' to Fighter; a player fighter was
    // built 'medium'. Several inherited paths Sovereign still routes through read
    // it — most importantly attack()'s whiff guard.
    host.aiDiff = 'hard';

    // Null Anchor stakes its tether at construction (this._anchorX = x), and the
    // template was constructed off-screen at -99999. Re-home it on the host or the
    // first save teleports the player into the void the tether exists to prevent.
    host._anchorX = host.x;
    host._anchorY = host.y;
    // Loadout bookkeeping references the host's real stat line, not the template's.
    host._baseMaxHealth = host.maxHealth;
    host._baseSpeedMult = host.classSpeedMult || 1;

    // Fighter.update() only calls updateAI() when a target already exists, and
    // Sovereign's own retargeting lives inside updateAI() — so without a seed he
    // would stand still forever. Reseeding also covers the target dying later.
    if (!host.target || host.target.health <= 0) {
      try { host._acquireAITarget(); } catch (e) {}
    }

    // Keep rendering exactly as the host's real class renders — no aura layer.
    const origDraw = proto.draw;
    host.draw = function () { return origDraw.apply(this, arguments); };

    // Wrap update() to (a) keep a live target and (b) mark the window in which
    // the dialogue stub applies. Everything Sovereign says happens in here.
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

      host.isAI   = saved.isAI;
      host.aiDiff = saved.aiDiff;
      host.target = saved.target;

      // Hand back a clean fighter: no half-finished Sovereign swing, no held shield.
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

// ── Dialogue suppression ───────────────────────────────────────────────────
// showBossDialogue is a top-level function declaration in smb-drawing-arenas.js,
// so it is a writable window property and the bare calls inside smb-smk2-class.js
// resolve through it. Scoped to _inside so only the possessed fighter's lines are
// dropped — a real boss in the same match still talks.
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

// ── Announcement suppression ───────────────────────────────────────────────
// Same contract as the dialogue stub above, and the reason the restored survival
// powers can run silently: Null Recoil banners 'NULL RECOIL' and Null Anchor
// banners 'NULL ANCHOR — SUPER SPENT'. Both would name him on the player's own
// body. Scoped to _inside, so every other entity's announcements still show.
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

// ── The button ─────────────────────────────────────────────────────────────
// F7, dev/admin clearance only. Silent either way — success and refusal look
// identical, which is the point.
window.addEventListener('keydown', function (e) {
  if (e.key !== 'F7') return;
  const _ae = document.activeElement;
  if (_ae && (_ae.tagName === 'INPUT' || _ae.tagName === 'TEXTAREA' || _ae.isContentEditable)) return;
  e.preventDefault();
  if (typeof _adminPanelIsAllowed !== 'function' || !_adminPanelIsAllowed()) return;
  SovereignControl.toggle();
});

window.SovereignControl = SovereignControl;
