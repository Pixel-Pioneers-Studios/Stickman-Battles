// GameState: runtime state authority.
// Two subtrees: `persistent` (accounts, admin overrides, saved to localStorage) and
// `session` (online lobby metadata, never serialized). Not for players[], physics or
// save blobs (those live in AccountManager and smb-save.js).
// Loads before smb-online.js, smb-accounts.js and smb-admin.js. load() runs at parse
// time, so downstream modules can read state synchronously.

'use strict';

const GameState = (() => {

  const DEBUG_STATE = false;

  // save() writes only `persistent`. `session` resets on every page load.
  let _state = {
    persistent: {
      activeAccountId: null,
      accounts:        {},
      admin: {
        overrides: {}, // keyed by accountId → true | false (false = explicit revocation)
        bans: {
          records: {}, // keyed by `${kind}:${target}` → ban record
        },
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

  // Throws if the persistent subtree has the wrong shape. Runs after load() and each update().
  function _validatePersistent(p) {
    if (!p) throw new Error("Persistent state missing");

    if (typeof p.accounts !== 'object') {
      if (DEBUG_STATE) console.warn('[GameState] Invalid accounts structure:', p.accounts);
      throw new Error('Invalid accounts structure');
    }

    if (!p.admin || typeof p.admin.overrides !== 'object') {
      if (DEBUG_STATE) console.warn('[GameState] Invalid admin overrides:', p.admin);
      throw new Error('Invalid admin overrides');
    }

    if (!p.admin.bans || typeof p.admin.bans.records !== 'object') {
      if (DEBUG_STATE) console.warn('[GameState] Invalid admin bans:', p.admin.bans);
      throw new Error('Invalid admin bans');
    }
  }

  function get() { return _state; }

  function getPersistent() { return _state.persistent; }

  function getSession() { return _state.session; }

  // Shallow merge onto the top level. Prefer update() for nested changes.
  function set(partial) {
    Object.assign(_state, partial);
  }

  // Passes a draft to fn and commits only if persistent state still validates.
  //   GameState.update(s => { s.persistent.activeAccountId = id; });
  function update(fn) {
    // The draft is shallow, so fn's nested edits hit live state directly. The deep
    // backup lets a failed validation roll them back.
    let _rollback = null;
    try { _rollback = JSON.parse(JSON.stringify(_state.persistent)); } catch (e) { /* not serializable, so no rollback */ }

    const draft = {
      persistent: { ..._state.persistent },
      session:    { ..._state.session },
    };

    fn(draft);

    try {
      _validatePersistent(draft.persistent);
    } catch (e) {
      if (_rollback) _state.persistent = _rollback;
      if (DEBUG_STATE) console.warn('[GameState] update() rejected — invalid state:', e.message);
      throw e;
    }

    _state.persistent = draft.persistent;
    _state.session    = draft.session;
  }

  // Active account object, or null.
  function getActiveAccount() {
    const p = _state.persistent;
    return (p.accounts && p.activeAccountId) ? (p.accounts[p.activeAccountId] || null) : null;
  }

  // Writes persistent state to localStorage. Session is never written.
  function save() {
    _validatePersistent(_state.persistent); // throws before touching localStorage
    try {
      localStorage.setItem('smb_state', JSON.stringify(_state.persistent));
    } catch (e) {}
    if (typeof cgSdk !== 'undefined' && cgSdk.saveProgress) {
      try { cgSdk.saveProgress(JSON.stringify(_state.persistent)); } catch (e) {}
    }
  }

  // Loads persistent state. Reads 'smb_state', falling back to the legacy
  // 'stickman_accounts' key. The legacy key is left in place. The next save() moves to 'smb_state'.
  function load() {
    // Canonical key first.
    try {
      const raw = localStorage.getItem('smb_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Make sure the required sub-objects exist.
          _state.persistent = Object.assign(
            { activeAccountId: null, accounts: {}, admin: { overrides: {}, bans: { records: {} } } },
            parsed
          );
          if (!_state.persistent.admin)           _state.persistent.admin           = { overrides: {} };
          if (!_state.persistent.admin.overrides) _state.persistent.admin.overrides = {};
          if (!_state.persistent.admin.bans)      _state.persistent.admin.bans      = { records: {} };
          if (!_state.persistent.admin.bans.records) _state.persistent.admin.bans.records = {};
          _validatePersistent(_state.persistent);
          return;
        }
      }
    } catch (e) {}

    // Legacy migration.
    try {
      const legacy = localStorage.getItem('stickman_accounts');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.accounts && parsed.activeAccountId) {
          _state.persistent.accounts        = parsed.accounts;
          _state.persistent.activeAccountId = parsed.activeAccountId;
          if (!_state.persistent.admin)           _state.persistent.admin           = { overrides: {}, bans: { records: {} } };
          if (!_state.persistent.admin.overrides) _state.persistent.admin.overrides = {};
          if (!_state.persistent.admin.bans)      _state.persistent.admin.bans      = { records: {} };
          if (!_state.persistent.admin.bans.records) _state.persistent.admin.bans.records = {};
          // No save() here. smb-accounts.js validates and saves the migrated data.
        }
      }
    } catch (e) {}
  }

  // Resets session.online to idle. Call on leaving a lobby or a clean disconnect.
  function resetSession() {
    _state.session = {
      online: {
        lobbyId:   null,
        role:      null,
        connected: false,
      },
    };
  }

  // Shallow merge onto session.online. Use this rather than mutating it, so writes are traceable.
  function setOnlineState(data) {
    _state.session.online = {
      ..._state.session.online,
      ...data,
    };
  }

  // Eager load, so _state is ready before any downstream IIFE runs.
  load();

  return { get, getPersistent, getSession, set, update, save, load, getActiveAccount, resetSession, setOnlineState };

})();

// Publish on window. A top-level const is not a window property, so `window.GameState` guards need this.
window.GameState = GameState;
