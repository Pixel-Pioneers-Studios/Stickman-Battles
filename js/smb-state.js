// smb-state.js — Centralized runtime state authority
//
// Single source of truth for:
//   - persistent: account registry, admin overrides  (written to localStorage)
//   - session:    online lobby metadata              (never serialized)
//
// DOES NOT manage:
//   - players[], gameRunning, physics, rendering, or any game-loop globals
//   - game save blobs (those stay in AccountManager / smb-save.js)
//
// Load order: must come before smb-online.js, smb-accounts.js, smb-admin.js.
// GameState.load() is called eagerly at parse time so all downstream modules
// can read state synchronously from their own parse-time init.

'use strict';

const GameState = (() => {

  // ── Internal state ────────────────────────────────────────────────────────────
  //
  // Explicitly split into two subtrees so callers always know what is safe
  // to persist and what is session-only. save() writes only `persistent`;
  // `session` is never serialized and resets to defaults on every page load.

  let _state = {
    persistent: {
      activeAccountId: null,
      accounts:        {},
      admin: {
        overrides: {}, // keyed by accountId → true | false (false = explicit revocation)
      },
    },
    session: {
      online: {
        lobbyId:   null,
        role:      null,   // 'host' | 'guest' | null
        connected: false,
      },
    },
  };

  // ── Core accessors ────────────────────────────────────────────────────────────

  /** Returns the full state object (both subtrees). */
  function get() { return _state; }

  /** Returns only the persistent subtree. Use for account / admin data. */
  function getPersistent() { return _state.persistent; }

  /** Returns only the session subtree. Use for online / transient data. */
  function getSession() { return _state.session; }

  /**
   * Shallow-merges `partial` onto the top-level state.
   * Prefer update() for nested mutations to avoid clobbering sibling keys.
   */
  function set(partial) {
    Object.assign(_state, partial);
  }

  /**
   * Passes the full internal state to `fn` for in-place mutation.
   * Always use the explicit subtree path, e.g.:
   *   GameState.update(s => { s.persistent.activeAccountId = id; });
   *   GameState.update(s => { s.session.online.connected = true; });
   */
  function update(fn) {
    fn(_state);
  }

  // ── Convenience helper ────────────────────────────────────────────────────────

  /**
   * Returns the active account object, or null if none is set.
   * Shorthand for getPersistent().accounts[getPersistent().activeAccountId].
   */
  function getActiveAccount() {
    const p = _state.persistent;
    return (p.accounts && p.activeAccountId) ? (p.accounts[p.activeAccountId] || null) : null;
  }

  // ── Persistence ───────────────────────────────────────────────────────────────

  /**
   * Serializes _state.persistent to localStorage under 'smb_state'.
   * _state.session is intentionally excluded — it is runtime-only.
   */
  function save() {
    try {
      localStorage.setItem('smb_state', JSON.stringify(_state.persistent));
    } catch (e) {}
  }

  /**
   * Loads persistent state into _state.persistent from localStorage.
   *
   * Priority:
   *   1. 'smb_state' key  (written by GameState.save())
   *   2. Legacy 'stickman_accounts' key  (written by the old AccountManager)
   *
   * The legacy key is never deleted — this is a non-destructive one-way
   * migration. The next call to save() will write 'smb_state' and future
   * loads will use that key.
   */
  function load() {
    // ── Prefer canonical key ─────────────────────────────────────────────────
    try {
      const raw = localStorage.getItem('smb_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Assign parsed data, then ensure required sub-objects always exist.
          _state.persistent = Object.assign(
            { activeAccountId: null, accounts: {}, admin: { overrides: {} } },
            parsed
          );
          if (!_state.persistent.admin)           _state.persistent.admin           = { overrides: {} };
          if (!_state.persistent.admin.overrides) _state.persistent.admin.overrides = {};
          return;
        }
      }
    } catch (e) {}

    // ── Fall back: migrate legacy 'stickman_accounts' key ────────────────────
    try {
      const legacy = localStorage.getItem('stickman_accounts');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.accounts && parsed.activeAccountId) {
          _state.persistent.accounts        = parsed.accounts;
          _state.persistent.activeAccountId = parsed.activeAccountId;
          // Do NOT call save() here — smb-accounts.js finalizes and saves
          // after validating the migrated data.
        }
      }
    } catch (e) {}
  }

  // Eager load: _state is fully populated before any downstream IIFE runs.
  load();

  return { get, getPersistent, getSession, set, update, save, load, getActiveAccount };

})();
