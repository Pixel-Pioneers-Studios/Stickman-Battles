// smb-accounts.js — Local multi-account system
// Must be loaded BEFORE smb-save.js so _getSaveKey() works on first loadGame() call.
// Requires smb-state.js (loaded earlier) — reads/writes via GameState instead of
// maintaining its own _state and localStorage key.
'use strict';

const AccountManager = (() => {

  // GameState is already populated (smb-state.js called load() at parse time).
  // No local _state needed — all account data lives in GameState.

  // ── Persistence ──────────────────────────────────────────────────────────────
  function _persist() {
    GameState.save();
  }

  function _genId() {
    return 'acct_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  // ── loadAccounts ─────────────────────────────────────────────────────────────
  // Validates the state already loaded by GameState, seeds defaults on first run,
  // and flushes to 'smb_state' so future loads hit the canonical key.
  function loadAccounts() {
    const p = GameState.getPersistent();

    // Guard: activeAccountId points to a deleted account
    if (p.activeAccountId && p.accounts && !p.accounts[p.activeAccountId]) {
      const keys = Object.keys(p.accounts);
      GameState.update(s => { s.persistent.activeAccountId = keys.length > 0 ? keys[0] : null; });
    }

    // Already have a valid active account — flush and return
    if (p.accounts && Object.keys(p.accounts).length > 0 && GameState.getPersistent().activeAccountId) {
      _persist();
      return;
    }

    // First run or fully corrupted — seed a default "Player 1" account.
    // Use the legacy save key so no existing save data is lost on migration.
    const defaultId = 'acct_default';
    GameState.update(s => {
      s.persistent.activeAccountId = defaultId;
      s.persistent.accounts = {
        [defaultId]: {
          id:        defaultId,
          username:  'Player 1',
          createdAt: Date.now(),
          saveKey:   'smc_save_v1',
        },
      };
    });
    _persist();
  }

  // ── Getters ──────────────────────────────────────────────────────────────────
  function getActiveAccount() {
    const p = GameState.getPersistent();
    return (p.accounts && p.activeAccountId) ? (p.accounts[p.activeAccountId] || null) : null;
  }

  function getActiveSaveKey() {
    const acct = getActiveAccount();
    return acct ? acct.saveKey : 'smc_save_v1';
  }

  function getAllAccounts() {
    return Object.values(GameState.getPersistent().accounts || {}).sort((a, b) => a.createdAt - b.createdAt);
  }

  // ── createAccount ────────────────────────────────────────────────────────────
  function createAccount(username) {
    const name = (String(username || '').trim().slice(0, 20)) || 'Player';
    const id = _genId();
    GameState.update(s => {
      s.persistent.accounts[id] = {
        id,
        username:  name,
        createdAt: Date.now(),
        saveKey:   'smb_acct_' + id,
      };
    });
    _persist();
    return id;
  }

  // ── switchAccount ────────────────────────────────────────────────────────────
  function switchAccount(id) {
    const p = GameState.getPersistent();
    if (!p.accounts[id]) return false;
    if (p.activeAccountId === id) return true;
    // Flush current account's state before switching
    if (typeof saveGame === 'function') saveGame();
    GameState.update(s => { s.persistent.activeAccountId = id; });
    _persist();
    // Restore the newly active account's saved state
    if (typeof loadGame === 'function') loadGame();
    return true;
  }

  // ── deleteAccount ────────────────────────────────────────────────────────────
  function deleteAccount(id) {
    const p = GameState.getPersistent();
    if (!p.accounts || !p.accounts[id]) return false;
    const acct = p.accounts[id];
    // Remove save data for this account
    try {
      localStorage.removeItem(acct.saveKey);
      localStorage.removeItem(acct.saveKey + '_backup');
    } catch(e) {}
    const wasActive = (p.activeAccountId === id);
    GameState.update(s => { delete s.persistent.accounts[id]; });
    // If the active account was deleted, pick or create a replacement
    if (wasActive) {
      const remaining = Object.keys(GameState.getPersistent().accounts);
      if (remaining.length === 0) {
        const newId = createAccount('Player 1');
        GameState.update(s => { s.persistent.activeAccountId = newId; });
      } else {
        GameState.update(s => { s.persistent.activeAccountId = remaining[0]; });
      }
      if (typeof loadGame === 'function') loadGame();
    }
    _persist();
    return true;
  }

  // ── saveAccountData ──────────────────────────────────────────────────────────
  function saveAccountData() {
    if (typeof saveGame === 'function') saveGame();
  }

  // Initialize on script parse (before smb-save.js runs)
  loadAccounts();

  return {
    loadAccounts,
    getActiveAccount,
    getActiveSaveKey,
    getAllAccounts,
    createAccount,
    switchAccount,
    deleteAccount,
    saveAccountData,
  };
})();

// ── UI ────────────────────────────────────────────────────────────────────────

function openAccountsModal() {
  let modal = document.getElementById('accountsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'accountsModal';
    modal.style.cssText = [
      'display:none','position:fixed','inset:0',
      'background:rgba(0,0,0,0.88)','z-index:10000',
      'align-items:center','justify-content:center',
    ].join(';');
    modal.innerHTML = [
      '<div style="background:#0b0b1e;border:1px solid rgba(100,180,255,0.3);border-radius:12px;',
        'padding:28px;width:min(440px,90vw);color:#dde4ff;',
        "font-family:'Segoe UI',Arial,sans-serif;box-shadow:0 0 40px rgba(0,100,255,0.18);\">",
        '<h3 style="margin:0 0 16px;font-size:1.1rem;color:#88ccff;">&#128100; Accounts</h3>',
        '<div id="accountsList" style="display:flex;flex-direction:column;gap:8px;',
          'max-height:260px;overflow-y:auto;margin-bottom:16px;"></div>',
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">',
          '<button onclick="_acctCreatePrompt()" ',
            'style="background:rgba(80,160,255,0.15);border:1px solid rgba(80,160,255,0.45);',
            'border-radius:7px;color:#88ccff;padding:7px 16px;cursor:pointer;font-size:0.82rem;flex:1;">',
            '+ New Account',
          '</button>',
          '<button onclick="closeAccountsModal()" ',
            'style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);',
            'border-radius:7px;color:#aab;padding:7px 16px;cursor:pointer;font-size:0.82rem;">',
            'Close',
          '</button>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(modal);
  }
  _acctRefreshList();
  modal.style.display = 'flex';
}

function closeAccountsModal() {
  const modal = document.getElementById('accountsModal');
  if (modal) modal.style.display = 'none';
}

function _acctRefreshList() {
  const list = document.getElementById('accountsList');
  if (!list) return;
  const accounts = AccountManager.getAllAccounts();
  const active   = AccountManager.getActiveAccount();
  list.innerHTML  = '';

  if (accounts.length === 0) {
    list.innerHTML = '<div style="font-size:0.8rem;opacity:0.5;text-align:center;padding:12px;">No accounts found.</div>';
    return;
  }

  accounts.forEach(function(acct) {
    const isActive = active && acct.id === active.id;
    const date     = new Date(acct.createdAt).toLocaleDateString();
    const row      = document.createElement('div');
    row.style.cssText = [
      'display:flex','align-items:center','gap:8px','padding:8px 12px','border-radius:8px',
      'border:1px solid ' + (isActive ? 'rgba(80,200,120,0.5)' : 'rgba(100,150,255,0.2)'),
      'background:'       + (isActive ? 'rgba(40,120,80,0.18)'  : 'rgba(255,255,255,0.04)'),
    ].join(';');

    const switchBtn = !isActive
      ? '<button onclick="AccountManager.switchAccount(\'' + _acctEscId(acct.id) + '\');_acctRefreshList();_acctToast(\'Switched to ' + _acctEscStr(acct.username) + '\')" '
        + 'style="background:rgba(80,160,255,0.15);border:1px solid rgba(80,160,255,0.4);border-radius:6px;color:#88ccff;padding:4px 10px;cursor:pointer;font-size:0.75rem;">Switch</button>'
      : '';

    const delBtn = '<button onclick="_acctConfirmDelete(\'' + _acctEscId(acct.id) + '\',\'' + _acctEscStr(acct.username) + '\')" '
      + 'style="background:rgba(255,60,60,0.12);border:1px solid rgba(255,80,80,0.35);border-radius:6px;color:#ff8888;padding:4px 10px;cursor:pointer;font-size:0.75rem;">Delete</button>';

    row.innerHTML = [
      '<div style="flex:1;min-width:0;">',
        '<div style="font-size:0.88rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:' + (isActive ? '#88ffaa' : '#dde4ff') + ';">',
          _acctEscHtml(acct.username),
          isActive ? ' <span style="font-size:0.7rem;color:#88ffaa;">(active)</span>' : '',
        '</div>',
        '<div style="font-size:0.7rem;opacity:0.45;">Created ' + date + '</div>',
      '</div>',
      switchBtn,
      delBtn,
    ].join('');

    list.appendChild(row);
  });
}

function _acctCreatePrompt() {
  const name = prompt('Enter a name for the new account (max 20 chars):');
  if (name === null) return;
  AccountManager.createAccount(name);
  _acctRefreshList();
  _acctToast('Account created!');
}

function _acctConfirmDelete(id, username) {
  if (!confirm('Delete account "' + username + '"?\nThis cannot be undone.')) return;
  AccountManager.deleteAccount(id);
  _acctRefreshList();
  _acctToast('Account deleted.');
}

// ── Safe string helpers ───────────────────────────────────────────────────────
function _acctEscHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _acctEscStr(s) {
  // Used inside single-quoted JS attribute strings — escape ' and strip < >
  return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/[<>]/g,'');
}
function _acctEscId(s) {
  // Account IDs are auto-generated alphanumeric+underscore — no escaping needed, but be safe
  return String(s).replace(/[^a-zA-Z0-9_]/g,'');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function _acctToast(msg) {
  let t = document.getElementById('accountsToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'accountsToast';
    t.style.cssText = [
      'position:fixed','top:24px','left:50%','transform:translateX(-50%)',
      'background:rgba(5,5,20,0.92)','color:#dde4ff',
      'padding:8px 22px','border-radius:8px','font-size:0.82rem',
      'z-index:99999','pointer-events:none','transition:opacity 0.3s',
      'border:1px solid rgba(80,200,120,0.45)',
      "font-family:'Segoe UI',Arial,sans-serif",
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent    = msg;
  t.style.opacity  = '1';
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(function() { t.style.opacity = '0'; }, 2200);
}
