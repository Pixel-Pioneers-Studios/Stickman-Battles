// smb-admin.js — Developer admin control system
// Loaded after smb-save.js. Story/network globals are referenced at call-time,
// not at parse-time, so load order relative to those files is not critical.
'use strict';

// ── Admin identity ─────────────────────────────────────────────────────────────
// Add account IDs here to grant admin powers.
const ADMIN_IDS = ['dev_master_account_id'];

// All achievement IDs — kept in sync with smb-achievements.js
const _ADMIN_ALL_ACH_IDS = [
  'first_blood', 'hat_trick', 'survivor', 'untouchable', 'combo_king',
  'gunslinger', 'hammer_time', 'clash_master',
  'wave_5', 'wave_10', 'survival_win', 'koth_win',
  'boss_slayer', 'true_form', 'yeti_hunter', 'beast_tamer',
  'chaos_survivor', 'super_saver', 'speedrun', 'perfectionist',
];

// ── isAdmin ────────────────────────────────────────────────────────────────────
// Legacy helper kept for external callers. New internal code should use _isAdmin().
function isAdmin(accountId) {
  return ADMIN_IDS.indexOf(String(accountId)) !== -1;
}

// ── _isAdmin ───────────────────────────────────────────────────────────────────
// Authoritative admin check used by all internal admin logic.
//
// Precedence:
//   1. GameState.getPersistent().admin.overrides[id] — if the key exists, its
//      boolean value wins (true = elevated, false = explicitly revoked).
//   2. ADMIN_IDS hardcoded list — fallback when no override is present.
//
// This means admins can be granted or revoked at runtime without redeploying:
//   GameState.update(s => { s.persistent.admin.overrides['acct_123'] = true; });
//   GameState.update(s => { s.persistent.admin.overrides['acct_123'] = false; }); // revoke
function _isAdmin(id) {
  const overrides = GameState.getPersistent().admin.overrides;
  if (overrides.hasOwnProperty(id)) {
    return !!overrides[id];
  }
  return ADMIN_IDS.includes(String(id));
}

// ── Internal helpers ───────────────────────────────────────────────────────────

// Returns the AccountManager entry for the given id, or null.
function _adminGetAcct(accountId) {
  if (!window.AccountManager) return null;
  return AccountManager.getAllAccounts().find(function(a) { return a.id === accountId; }) || null;
}

// True if accountId is the currently active account.
function _adminIsActive(accountId) {
  if (!window.AccountManager) return false;
  const active = AccountManager.getActiveAccount();
  return active && active.id === accountId;
}

// Decode → mutate → re-encode a raw save blob in localStorage for any account.
// mutFn(data) receives the decoded save object and should mutate it in-place.
function _adminMutateRawSave(accountId, mutFn) {
  const acct = _adminGetAcct(accountId);
  if (!acct) { console.warn('[Admin] Account not found:', accountId); return false; }
  try {
    const raw  = localStorage.getItem(acct.saveKey);
    const data = raw
      ? JSON.parse(decodeURIComponent(escape(atob(raw))))
      : { version: 2, unlocks: {}, settings: {}, story: null };
    mutFn(data);
    localStorage.setItem(acct.saveKey, btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
    return true;
  } catch(e) {
    console.warn('[Admin] Mutate raw save failed:', e);
    return false;
  }
}

// ── setPlayerChapter ───────────────────────────────────────────────────────────
// Sets the story chapter pointer. Marks all previous chapters as defeated so
// the chapter is reachable via normal story flow.
function setPlayerChapter(accountId, chapterId) {
  chapterId = parseInt(chapterId, 10) || 0;

  if (_adminIsActive(accountId)) {
    // Active account — use live story functions so the UI updates immediately.
    const story = (typeof getStoryDataForSave === 'function') ? getStoryDataForSave() : null;
    if (story) {
      story.chapter = chapterId;
      // Mark every prior chapter as defeated so none are gated.
      story.defeated = story.defeated || [];
      for (let i = 0; i < chapterId; i++) {
        if (story.defeated.indexOf(i) === -1) story.defeated.push(i);
      }
      if (typeof restoreStoryDataFromSave === 'function') restoreStoryDataFromSave(story);
    }
    if (typeof saveGame === 'function') saveGame();
    _adminLog('Chapter set to ' + chapterId + ' on active account.');
    return;
  }

  // Non-active account — modify the raw save blob directly.
  _adminMutateRawSave(accountId, function(data) {
    if (!data.story) data.story = {};
    data.story.chapter  = chapterId;
    data.story.defeated = data.story.defeated || [];
    for (let i = 0; i < chapterId; i++) {
      if (data.story.defeated.indexOf(i) === -1) data.story.defeated.push(i);
    }
  });
  _adminLog('Chapter set to ' + chapterId + ' on account ' + accountId + '.');
}

// ── unlockAllItems ─────────────────────────────────────────────────────────────
function unlockAllItems(accountId) {
  const allLetters = [0, 1, 2, 3, 4, 5, 6, 7];

  if (_adminIsActive(accountId)) {
    // Set individual localStorage keys (source of truth for live game state).
    localStorage.setItem('smc_bossBeaten',  '1');
    localStorage.setItem('smc_trueform',    '1');
    localStorage.setItem('smc_megaknight',  '1');
    localStorage.setItem('smc_letters', JSON.stringify(allLetters));
    localStorage.setItem('smc_achievements', JSON.stringify(_ADMIN_ALL_ACH_IDS));
    // Unlock achievements via the live function so in-memory Set stays in sync.
    if (typeof unlockAchievement === 'function') {
      _ADMIN_ALL_ACH_IDS.forEach(function(id) { unlockAchievement(id); });
    }
    // Sync the hidden code-input display if available.
    if (typeof syncCodeInput === 'function') syncCodeInput();
    if (typeof saveGame === 'function') saveGame();
    _adminLog('All items unlocked on active account.');
    return;
  }

  _adminMutateRawSave(accountId, function(data) {
    if (!data.unlocks) data.unlocks = {};
    data.unlocks.bossBeaten   = true;
    data.unlocks.trueform     = true;
    data.unlocks.megaknight   = true;
    data.unlocks.letters      = allLetters;
    data.unlocks.achievements = _ADMIN_ALL_ACH_IDS.slice();
  });
  _adminLog('All items unlocked on account ' + accountId + '.');
}

// ── resetAccount ──────────────────────────────────────────────────────────────
function resetAccount(accountId) {
  const acct = _adminGetAcct(accountId);
  if (!acct) return;

  // Wipe save blobs from localStorage.
  try { localStorage.removeItem(acct.saveKey); } catch(e) {}
  try { localStorage.removeItem(acct.saveKey + '_backup'); } catch(e) {}

  if (_adminIsActive(accountId)) {
    // Wipe individual smc_* keys that are used as live state.
    ['smc_bossBeaten','smc_trueform','smc_megaknight',
     'smc_letters','smc_achievements','smc_story2'].forEach(function(k) {
      try { localStorage.removeItem(k); } catch(e) {}
    });
    // Reload save system to restore defaults.
    if (typeof loadGame === 'function') loadGame();
    _adminLog('Active account reset to defaults.');
    return;
  }

  _adminLog('Account ' + accountId + ' save data cleared.');
}

// ── forceJoinLobby ─────────────────────────────────────────────────────────────
// Legacy helper — wraps adminJoinAnyLobby for backwards compat with panel buttons.
function forceJoinLobby(lobbyId) {
  adminJoinAnyLobby(lobbyId);
}

// ── adminJoinAnyLobby ─────────────────────────────────────────────────────────
// Admin bypasses normal join flow — no UI input required, leaves current lobby
// first. Uses LobbyManager when available so presence state stays consistent.
function adminJoinAnyLobby(lobbyId) {
  if (!_adminPanelIsAllowed()) { _adminLog('adminJoinAnyLobby: not admin'); return; }
  if (!lobbyId) { _adminToast('Enter a lobby ID', true); return; }
  const id = String(lobbyId).toUpperCase().trim();
  if (typeof LobbyManager !== 'undefined' && typeof LobbyManager.joinLobby === 'function') {
    LobbyManager.joinLobby(id);
  } else if (window.NetworkManager && typeof NetworkManager.connect === 'function') {
    // Fallback: connect directly via NetworkManager (no lobby metadata).
    NetworkManager.connect(id, 10).catch(function(e) {
      console.warn('[Admin] Direct connect failed:', e);
    });
  }
  _adminLog('Joined lobby: ' + id);
}

// ── adminKickPlayer ───────────────────────────────────────────────────────────
// Broadcasts a kick event to all peers. The peer whose account ID matches
// receives it via handleAdminNetworkEvent and disconnects itself.
// Replaces the old kickPlayer() stub.
function adminKickPlayer(accountId) {
  if (!_adminPanelIsAllowed()) { _adminLog('adminKickPlayer: not admin'); return; }
  if (!accountId) return;

  _adminLog('Kick broadcast for account: ' + accountId);

  // Broadcast to all connected peers so the target receives it.
  if (window.NetworkManager && typeof NetworkManager.sendGameEvent === 'function') {
    NetworkManager.sendGameEvent('adminKick', { targetAccountId: accountId });
  }

  // If the target is the local account, disconnect immediately.
  if (_adminIsActive(accountId)) {
    if (typeof LobbyManager !== 'undefined') { LobbyManager.leaveLobby(); }
    else if (window.NetworkManager)          { NetworkManager.disconnect(); }
  }
}

// Keep old name as alias so existing panel buttons still work.
function kickPlayer(accountId) { adminKickPlayer(accountId); }

// ── adminSetChapterLive ───────────────────────────────────────────────────────
// Sets chapter on the target account locally AND broadcasts to connected peers
// so the target applies the change in their live session.
function adminSetChapterLive(accountId, chapter) {
  if (!_adminPanelIsAllowed()) { _adminLog('adminSetChapterLive: not admin'); return; }
  chapter = parseInt(chapter, 10) || 0;

  // Apply locally if the target is our own active account.
  if (_adminIsActive(accountId)) {
    setPlayerChapter(accountId, chapter);
  }

  // Broadcast to peers — the matching peer applies it on receipt.
  if (window.NetworkManager && typeof NetworkManager.sendGameEvent === 'function') {
    NetworkManager.sendGameEvent('adminSetChapter', {
      targetAccountId: accountId,
      chapter:         chapter,
    });
  }

  _adminLog('Chapter ' + chapter + ' set live for account: ' + accountId);
}

// ── handleAdminNetworkEvent ───────────────────────────────────────────────────
// Called from smb-network.js _handleGameEvent for every incoming gameEvent.
// Returns true if handled (stops further processing), false otherwise.
function handleAdminNetworkEvent(msg) {
  if (!msg || !msg.event) return false;

  // ── adminKick ──────────────────────────────────────────────────────────────
  if (msg.event === 'adminKick') {
    if (window.AccountManager) {
      const active = AccountManager.getActiveAccount();
      if (active && active.id === msg.targetAccountId) {
        _adminLog('Kicked from session by admin.');
        if (typeof LobbyManager !== 'undefined') { LobbyManager.leaveLobby(); }
        else if (window.NetworkManager)          { NetworkManager.disconnect(); }
      }
    }
    return true;
  }

  // ── adminSetChapter ────────────────────────────────────────────────────────
  if (msg.event === 'adminSetChapter') {
    if (window.AccountManager && typeof msg.targetAccountId === 'string') {
      const active = AccountManager.getActiveAccount();
      if (active && active.id === msg.targetAccountId) {
        const ch = parseInt(msg.chapter, 10) || 0;
        setPlayerChapter(active.id, ch);
        _adminLog('Chapter set to ' + ch + ' by remote admin.');
      }
    }
    return true;
  }

  return false;
}

// ── deleteAccount (admin shortcut) ────────────────────────────────────────────
function adminDeleteAccount(accountId) {
  if (!window.AccountManager) return;
  AccountManager.deleteAccount(accountId);
  _adminLog('Deleted account: ' + accountId);
  _adminPanelRefresh();
}

// ── Console log helper ────────────────────────────────────────────────────────
function _adminLog(msg) {
  const prefix = '[Admin] ';
  console.log(prefix + msg);
  // Mirror to in-game console if it exists.
  const log = document.getElementById('gameConsoleLog');
  if (log) {
    const line = document.createElement('div');
    line.style.color = '#ffdd88';
    line.textContent = prefix + msg;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Panel UI
// ═══════════════════════════════════════════════════════════════════════════════

let _adminPanelOpen = false;

function _adminPanelIsAllowed() {
  if (!window.AccountManager) return false;
  const active = AccountManager.getActiveAccount();
  if (!active) return false;
  // Role-based check first; fall back to legacy ADMIN_IDS for existing admins
  if (typeof hasPermission === 'function' && hasPermission('admin')) return true;
  return _isAdmin(active.id);
}

function _adminPanelToggle() {
  if (!_adminPanelIsAllowed()) {
    // Silently ignore for non-admins — no UI feedback on purpose.
    return;
  }
  _adminPanelOpen = !_adminPanelOpen;
  const panel = _adminPanelGetOrCreate();
  panel.style.display = _adminPanelOpen ? 'flex' : 'none';
  if (_adminPanelOpen) _adminPanelRefresh();
}

function _adminPanelGetOrCreate() {
  let panel = document.getElementById('adminControlPanel');
  if (panel) return panel;

  panel = document.createElement('div');
  panel.id = 'adminControlPanel';
  panel.style.cssText = [
    'display:none',
    'position:fixed',
    'top:50%','left:50%',
    'transform:translate(-50%,-50%)',
    'z-index:99998',
    'flex-direction:column',
    'gap:0',
    'min-width:360px',
    'max-width:min(480px,92vw)',
    'max-height:80vh',
    'overflow-y:auto',
    'background:#080814',
    'border:1px solid rgba(255,160,40,0.55)',
    'border-radius:12px',
    'box-shadow:0 0 48px rgba(255,140,0,0.18)',
    "font-family:'Segoe UI',Arial,sans-serif",
    'color:#ffe0a0',
  ].join(';');

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = [
    'display:flex','align-items:center','justify-content:space-between',
    'padding:12px 18px',
    'background:rgba(255,140,0,0.1)',
    'border-bottom:1px solid rgba(255,140,0,0.3)',
    'border-radius:12px 12px 0 0',
    'position:sticky','top:0',
  ].join(';');
  hdr.innerHTML = [
    '<span style="font-size:0.9rem;font-weight:700;letter-spacing:1px;color:#ffcc66;">',
      '&#9888; ADMIN PANEL',
    '</span>',
    '<button onclick="_adminPanelToggle()" style="background:none;border:none;',
      'color:#ff8888;font-size:1rem;cursor:pointer;padding:0 4px;" title="Close (F9)">&#x2715;</button>',
  ].join('');
  panel.appendChild(hdr);

  // Body — populated by _adminPanelRefresh
  const body = document.createElement('div');
  body.id = 'adminPanelBody';
  body.style.cssText = 'padding:16px 18px;display:flex;flex-direction:column;gap:14px;';
  panel.appendChild(body);

  document.body.appendChild(panel);
  return panel;
}

function _adminPanelRefresh() {
  const body = document.getElementById('adminPanelBody');
  if (!body) return;

  const active   = window.AccountManager ? AccountManager.getActiveAccount() : null;
  const activeId = active ? active.id : '';
  const allAccts = window.AccountManager ? AccountManager.getAllAccounts() : [];

  // Build account options string for <select>
  const acctOptions = allAccts.map(function(a) {
    return '<option value="' + _adminEsc(a.id) + '">' + _adminEsc(a.username) + (a.id === activeId ? ' (active)' : '') + '</option>';
  }).join('');

  body.innerHTML = [
    // ── Active account info ────────────────────────────────────────────────
    '<div style="font-size:0.78rem;opacity:0.55;padding-bottom:4px;border-bottom:1px solid rgba(255,140,0,0.2);">',
      'Active: <strong style="color:#ffcc66;">' + (active ? _adminEsc(active.username) : 'none') + '</strong>',
      ' &nbsp;|&nbsp; ID: <code style="font-size:0.72rem;color:#aac;">' + (activeId || '—') + '</code>',
    '</div>',

    // ── Set Chapter ────────────────────────────────────────────────────────
    '<div>',
      '<div style="font-size:0.8rem;font-weight:600;color:#ffcc66;margin-bottom:6px;">Set Story Chapter</div>',
      '<div style="display:flex;gap:6px;align-items:center;">',
        '<input id="adminChapterInput" type="number" min="0" value="0"',
          ' style="width:70px;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
          'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.82rem;outline:none;">',
        '<select id="adminChapterAcctSel"',
          ' style="flex:1;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
          'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.78rem;outline:none;">',
          acctOptions,
        '</select>',
        '<button onclick="_adminPanelSetChapter()"',
          ' style="background:rgba(255,160,40,0.15);border:1px solid rgba(255,160,40,0.45);',
          'border-radius:6px;color:#ffcc66;padding:5px 12px;cursor:pointer;font-size:0.8rem;">Apply</button>',
      '</div>',
    '</div>',

    // ── Give All Unlocks ───────────────────────────────────────────────────
    '<div>',
      '<div style="font-size:0.8rem;font-weight:600;color:#ffcc66;margin-bottom:6px;">Give All Unlocks</div>',
      '<div style="display:flex;gap:6px;align-items:center;">',
        '<select id="adminUnlockAcctSel"',
          ' style="flex:1;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
          'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.78rem;outline:none;">',
          acctOptions,
        '</select>',
        '<button onclick="_adminPanelUnlockAll()"',
          ' style="background:rgba(255,160,40,0.15);border:1px solid rgba(255,160,40,0.45);',
          'border-radius:6px;color:#ffcc66;padding:5px 12px;cursor:pointer;font-size:0.8rem;">Unlock All</button>',
      '</div>',
    '</div>',

    // ── Teleport to Story Fight ────────────────────────────────────────────
    '<div>',
      '<div style="font-size:0.8rem;font-weight:600;color:#ffcc66;margin-bottom:6px;">Teleport to Story Fight</div>',
      '<div style="font-size:0.73rem;opacity:0.5;margin-bottom:5px;">Starts the chapter immediately. Must be on the menu screen.</div>',
      '<div style="display:flex;gap:6px;align-items:center;">',
        '<input id="adminTeleportInput" type="number" min="0" value="0" placeholder="Chapter ID"',
          ' style="width:80px;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
          'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.82rem;outline:none;">',
        '<button onclick="_adminPanelTeleport()"',
          ' style="background:rgba(255,160,40,0.15);border:1px solid rgba(255,160,40,0.45);',
          'border-radius:6px;color:#ffcc66;padding:5px 12px;cursor:pointer;font-size:0.8rem;">Go</button>',
      '</div>',
    '</div>',

    // ── Reset Account ──────────────────────────────────────────────────────
    '<div>',
      '<div style="font-size:0.8rem;font-weight:600;color:#ffcc66;margin-bottom:6px;">Reset Account Save</div>',
      '<div style="display:flex;gap:6px;align-items:center;">',
        '<select id="adminResetAcctSel"',
          ' style="flex:1;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
          'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.78rem;outline:none;">',
          acctOptions,
        '</select>',
        '<button onclick="_adminPanelReset()"',
          ' style="background:rgba(180,40,40,0.15);border:1px solid rgba(255,80,80,0.4);',
          'border-radius:6px;color:#ff8888;padding:5px 12px;cursor:pointer;font-size:0.8rem;">Reset</button>',
      '</div>',
    '</div>',

    // ── Delete Account ─────────────────────────────────────────────────────
    '<div>',
      '<div style="font-size:0.8rem;font-weight:600;color:#ffcc66;margin-bottom:6px;">Delete Account</div>',
      '<div style="display:flex;gap:6px;align-items:center;">',
        '<select id="adminDeleteAcctSel"',
          ' style="flex:1;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
          'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.78rem;outline:none;">',
          acctOptions,
        '</select>',
        '<button onclick="_adminPanelDelete()"',
          ' style="background:rgba(180,0,0,0.2);border:1px solid rgba(255,60,60,0.5);',
          'border-radius:6px;color:#ff6666;padding:5px 12px;cursor:pointer;font-size:0.8rem;">Delete</button>',
      '</div>',
    '</div>',

    // ── Online Controls ────────────────────────────────────────────────────
    '<div style="border-top:1px solid rgba(255,140,0,0.15);padding-top:12px;">',
      '<div style="font-size:0.8rem;font-weight:600;color:#ffcc66;margin-bottom:8px;">Online Controls</div>',

      // Join Any Lobby
      '<div style="margin-bottom:8px;">',
        '<div style="font-size:0.73rem;opacity:0.6;margin-bottom:4px;">Join Any Lobby</div>',
        '<div style="display:flex;gap:6px;">',
          '<input id="adminLobbyInput" placeholder="Lobby ID" maxlength="20"',
            ' style="flex:1;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
            'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.78rem;outline:none;',
            'text-transform:uppercase;" onkeydown="if(event.key===\'Enter\')_adminPanelJoinLobby()">',
          '<button onclick="_adminPanelJoinLobby()"',
            ' style="background:rgba(255,160,40,0.12);border:1px solid rgba(255,160,40,0.35);',
            'border-radius:6px;color:#ffcc66;padding:5px 10px;cursor:pointer;font-size:0.78rem;">Join</button>',
        '</div>',
      '</div>',

      // Kick Player
      '<div style="margin-bottom:8px;">',
        '<div style="font-size:0.73rem;opacity:0.6;margin-bottom:4px;">Kick Player (by account)</div>',
        '<div style="display:flex;gap:6px;align-items:center;">',
          '<select id="adminKickAcctSel"',
            ' style="flex:1;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
            'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.78rem;outline:none;">',
            acctOptions,
          '</select>',
          '<button onclick="_adminPanelKick()"',
            ' style="background:rgba(180,40,40,0.18);border:1px solid rgba(255,80,80,0.45);',
            'border-radius:6px;color:#ff9999;padding:5px 10px;cursor:pointer;font-size:0.78rem;">Kick</button>',
        '</div>',
      '</div>',

      // Set Chapter Live
      '<div>',
        '<div style="font-size:0.73rem;opacity:0.6;margin-bottom:4px;">Set Chapter Live (local + remote)</div>',
        '<div style="display:flex;gap:6px;align-items:center;">',
          '<input id="adminLiveChapterInput" type="number" min="0" value="0"',
            ' style="width:64px;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
            'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.82rem;outline:none;">',
          '<select id="adminLiveChapterAcctSel"',
            ' style="flex:1;background:#0a0a1c;border:1px solid rgba(255,160,40,0.4);',
            'border-radius:6px;color:#ffe0a0;padding:5px 8px;font-size:0.78rem;outline:none;">',
            acctOptions,
          '</select>',
          '<button onclick="_adminPanelSetChapterLive()"',
            ' style="background:rgba(255,160,40,0.12);border:1px solid rgba(255,160,40,0.35);',
            'border-radius:6px;color:#ffcc66;padding:5px 10px;cursor:pointer;font-size:0.78rem;">Set Live</button>',
        '</div>',
      '</div>',
    '</div>',

    // ── Footer hint ────────────────────────────────────────────────────────
    '<div style="font-size:0.7rem;opacity:0.35;text-align:center;padding-top:4px;',
      'border-top:1px solid rgba(255,140,0,0.15);">Press F9 to close</div>',
  ].join('');
}

// ── Panel action handlers ─────────────────────────────────────────────────────

function _adminPanelSetChapter() {
  const id  = (document.getElementById('adminChapterAcctSel') || {}).value || '';
  const ch  = parseInt((document.getElementById('adminChapterInput') || {}).value, 10) || 0;
  if (!id) return;
  setPlayerChapter(id, ch);
  _adminToast('Chapter set to ' + ch);
}

function _adminPanelUnlockAll() {
  const id = (document.getElementById('adminUnlockAcctSel') || {}).value || '';
  if (!id) return;
  unlockAllItems(id);
  _adminToast('All items unlocked');
}

function _adminPanelTeleport() {
  const ch = parseInt((document.getElementById('adminTeleportInput') || {}).value, 10) || 0;
  if (typeof gameRunning !== 'undefined' && gameRunning) {
    _adminToast('Cannot teleport mid-game.', true);
    return;
  }
  if (typeof startStoryFromMenu === 'function') {
    startStoryFromMenu(ch);
    _adminPanelToggle(); // close panel
    _adminToast('Launching chapter ' + ch);
  } else {
    _adminToast('startStoryFromMenu not available', true);
  }
}

function _adminPanelReset() {
  const id = (document.getElementById('adminResetAcctSel') || {}).value || '';
  if (!id) return;
  const acct = _adminGetAcct(id);
  const name = acct ? acct.username : id;
  if (!confirm('Reset all save data for "' + name + '"?\nThis cannot be undone.')) return;
  resetAccount(id);
  _adminPanelRefresh();
  _adminToast('Account reset: ' + name);
}

function _adminPanelDelete() {
  const id = (document.getElementById('adminDeleteAcctSel') || {}).value || '';
  if (!id) return;
  const acct = _adminGetAcct(id);
  const name = acct ? acct.username : id;
  if (!confirm('Permanently delete account "' + name + '"?')) return;
  adminDeleteAccount(id);
  _adminToast('Deleted: ' + name);
}

function _adminPanelJoinLobby() {
  const lid = ((document.getElementById('adminLobbyInput') || {}).value || '').trim();
  if (!lid) { _adminToast('Enter a lobby ID first', true); return; }
  adminJoinAnyLobby(lid);
  _adminToast('Joining lobby: ' + lid);
}

function _adminPanelKick() {
  const id = (document.getElementById('adminKickAcctSel') || {}).value || '';
  if (!id) return;
  const acct = _adminGetAcct(id);
  const name = acct ? acct.username : id;
  adminKickPlayer(id);
  _adminToast('Kick sent: ' + name);
}

function _adminPanelSetChapterLive() {
  const id = (document.getElementById('adminLiveChapterAcctSel') || {}).value || '';
  const ch = parseInt((document.getElementById('adminLiveChapterInput') || {}).value, 10) || 0;
  if (!id) return;
  adminSetChapterLive(id, ch);
  _adminToast('Chapter ' + ch + ' applied live');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function _adminToast(msg, isError) {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast';
    t.style.cssText = [
      'position:fixed','bottom:22px','right:22px',
      'background:rgba(8,8,20,0.96)','color:#ffe0a0',
      'padding:8px 20px','border-radius:8px','font-size:0.8rem',
      'z-index:99999','pointer-events:none','transition:opacity 0.3s',
      'border:1px solid rgba(255,160,40,0.5)',
      "font-family:'Segoe UI',Arial,sans-serif",
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent  = '[Admin] ' + msg;
  t.style.borderColor = isError ? 'rgba(255,80,80,0.55)' : 'rgba(255,160,40,0.5)';
  t.style.opacity = '1';
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(function() { t.style.opacity = '0'; }, 2600);
}

// ── HTML escape (panel only) ──────────────────────────────────────────────────
function _adminEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── F9 keydown listener ───────────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'F9') {
    e.preventDefault();
    _adminPanelToggle();
  }
});
