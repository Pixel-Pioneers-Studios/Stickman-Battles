// smb-online.js — Lobby presence layer
//
// Sits ON TOP of the existing NetworkManager (smb-network.js).
// NetworkManager owns the WebRTC connections and gameplay sync.
// LobbyManager owns lobby metadata, the player roster, and the
// simulated-server advertisement stored in localStorage.
//
// Load order: after smb-network.js, before smb-save.js.
'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const _LOB_KEY_PREFIX   = 'smblob_';      // localStorage key prefix for lobby ads
const _LOB_TTL_MS       = 90000;          // non-persistent lobbies expire after 90 s
const _LOB_ADV_HZ       = 20000;          // re-advertise every 20 s while hosting
const _PUBLIC_LOBBY_ID  = 'PUBLIC_SERVER'; // well-known ID for the persistent lobby

// ── LobbyManager ──────────────────────────────────────────────────────────────
const LobbyManager = (() => {

  // { id, players, maxPlayers, isPrivate, persistent? } — null when not in a lobby
  let _current   = null;
  let _advTimer  = null;
  let _localName = 'Player';

  // ── Private helpers ───────────────────────────────────────────────────────────

  function _playerName() {
    if (window.AccountManager) {
      const a = AccountManager.getActiveAccount();
      if (a) return a.username;
    }
    return _localName;
  }

  function _genId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // Write a public-server record that can never expire.
  function _writePublicLobby(players) {
    try {
      localStorage.setItem(
        _LOB_KEY_PREFIX + _PUBLIC_LOBBY_ID,
        JSON.stringify({
          id:         _PUBLIC_LOBBY_ID,
          label:      'Public Server',
          players:    players || [],
          maxPlayers: 10,
          isPrivate:  false,
          persistent: true,    // ← never expires, never deleted
          ts:         Date.now(),
        })
      );
    } catch(e) {}
  }

  // Create the persistent lobby record on startup (idempotent).
  function _initPublicLobby() {
    const existing = localStorage.getItem(_LOB_KEY_PREFIX + _PUBLIC_LOBBY_ID);
    if (!existing) _writePublicLobby([]);
    // Always refresh the timestamp so it is never reaped by a stale-key cleanup.
    else {
      try {
        const d = JSON.parse(existing);
        d.ts = Date.now();
        d.persistent = true;
        localStorage.setItem(_LOB_KEY_PREFIX + _PUBLIC_LOBBY_ID, JSON.stringify(d));
      } catch(e) { _writePublicLobby([]); }
    }
  }

  // Write a regular (non-persistent) lobby ad.
  function _advertise() {
    if (!_current) return;
    try {
      localStorage.setItem(
        _LOB_KEY_PREFIX + _current.id,
        JSON.stringify(Object.assign({}, _current, { ts: Date.now() }))
      );
    } catch(e) {}
  }

  // Remove the lobby ad — EXCEPT for the persistent public lobby.
  function _unadvertise() {
    if (!_current) return;
    if (_current.id === _PUBLIC_LOBBY_ID) {
      // Public lobby persists: reset to empty instead of removing.
      _writePublicLobby([]);
    } else {
      try { localStorage.removeItem(_LOB_KEY_PREFIX + _current.id); } catch(e) {}
    }
    clearInterval(_advTimer);
    _advTimer = null;
  }

  function _slotCount() {
    if (window.NetworkManager && typeof NetworkManager.getSlotCount === 'function') {
      return NetworkManager.getSlotCount();
    }
    return _current ? _current.players.length : 0;
  }

  function _makeLobby(id, maxPlayers, isPrivate, persistent) {
    return {
      id,
      label:      persistent ? 'Public Server' : id,
      players:    [{ slot: 0, name: _playerName() }],
      maxPlayers: Math.min(10, Math.max(2, maxPlayers || 2)),
      isPrivate:  !!isPrivate,
      persistent: !!persistent,
    };
  }

  // ── createLobby ──────────────────────────────────────────────────────────────
  // opts: { maxPlayers?, isPrivate?, id? }
  function createLobby(opts) {
    opts = opts || {};
    const id = (opts.id ? String(opts.id).toUpperCase().trim() : '') || _genId();

    if (_current) leaveLobby();

    _current = _makeLobby(id, opts.maxPlayers || 2, opts.isPrivate || false, false);

    GameState.update(s => { s.session.online.lobbyId = id; s.session.online.role = 'host'; s.session.online.connected = true; });

    _advertise();
    clearInterval(_advTimer);
    _advTimer = setInterval(function() {
      if (_current) {
        const count = _slotCount();
        while (_current.players.length < count) {
          _current.players.push({ slot: _current.players.length, name: 'Player ' + (_current.players.length + 1) });
        }
        _advertise();
      }
    }, _LOB_ADV_HZ);

    if (window.NetworkManager && typeof NetworkManager.connect === 'function') {
      NetworkManager.connect(id, _current.maxPlayers).then(function() {
        _lobbyUiRefresh();
      }).catch(function(e) {
        console.warn('[Lobby] NetworkManager.connect failed:', e);
        leaveLobby();
      });
    }

    _lobbyUiRefresh();
    return _current;
  }

  // ── joinLobby ─────────────────────────────────────────────────────────────────
  function joinLobby(id) {
    if (!id) { console.warn('[Lobby] joinLobby: id required'); return null; }
    id = String(id).toUpperCase().trim();

    if (_current) leaveLobby();

    let meta = null;
    try {
      const raw = localStorage.getItem(_LOB_KEY_PREFIX + id);
      if (raw) meta = JSON.parse(raw);
    } catch(e) {}

    const isPub = (id === _PUBLIC_LOBBY_ID);

    _current = {
      id,
      label:      meta ? (meta.label || id) : id,
      // Don't pre-populate a fake "Host" entry — we don't know if anyone is there yet.
      // The real player count comes from NetworkManager once the connection resolves.
      players:    meta ? meta.players.slice() : [],
      maxPlayers: meta ? meta.maxPlayers : (isPub ? 10 : 2),
      isPrivate:  meta ? !!meta.isPrivate : false,
      persistent: isPub,
    };
    // Add ourselves (slot unknown until slotAssign — use 0 as placeholder)
    _current.players.push({ slot: 0, name: _playerName() });

    GameState.update(s => { s.session.online.lobbyId = id; s.session.online.role = 'guest'; s.session.online.connected = true; });

    if (window.NetworkManager && typeof NetworkManager.connect === 'function') {
      NetworkManager.connect(id, _current.maxPlayers).then(function() {
        // After connection resolves we know our actual role (host vs guest)
        const role = (NetworkManager.isHost && NetworkManager.isHost()) ? 'host' : 'guest';
        GameState.update(function(s) { s.session.online.role = role; });
        // Fix slot assignment for the local player entry
        if (_current && _current.players.length > 0) {
          _current.players[0].slot = NetworkManager.getLocalSlot ? NetworkManager.getLocalSlot() : 0;
        }
        _lobbyUiRefresh();
      }).catch(function(e) {
        console.warn('[Lobby] Join failed:', e);
        leaveLobby();
      });
    }

    _lobbyUiRefresh();
    return _current;
  }

  // ── joinPublicLobby ───────────────────────────────────────────────────────────
  // Convenience shortcut — always joins the well-known public server.
  function joinPublicLobby() {
    return joinLobby(_PUBLIC_LOBBY_ID);
  }

  // ── leaveLobby ────────────────────────────────────────────────────────────────
  function leaveLobby() {
    _unadvertise();           // public lobby: resets to empty; others: removed
    if (window.NetworkManager && typeof NetworkManager.disconnect === 'function') {
      NetworkManager.disconnect();
    }
    _current = null;
    GameState.update(s => { s.session.online.lobbyId = null; s.session.online.role = null; s.session.online.connected = false; });
    _lobbyUiRefresh();
  }

  // ── getCurrentLobby ───────────────────────────────────────────────────────────
  function getCurrentLobby() {
    if (!_current) return null;
    const count = _slotCount();
    const players = _current.players.slice();
    while (players.length < count) {
      players.push({ slot: players.length, name: 'Player ' + (players.length + 1) });
    }
    return {
      id:         _current.id,
      label:      _current.label,
      players,
      maxPlayers: _current.maxPlayers,
      isPrivate:  _current.isPrivate,
      persistent: _current.persistent,
    };
  }

  // ── listLobbies ───────────────────────────────────────────────────────────────
  // Persistent lobbies are never expired and always appear first.
  function listLobbies() {
    const now      = Date.now();
    const persists = [];
    const regular  = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(_LOB_KEY_PREFIX)) continue;
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        let lob;
        try { lob = JSON.parse(raw); } catch(e) { continue; }
        if (!lob || !lob.id) continue;

        if (lob.persistent) {
          // Refresh timestamp so it is never accidentally cleaned up.
          lob.ts = Date.now();
          persists.push(lob);
          continue;
        }

        if (now - lob.ts > _LOB_TTL_MS) { localStorage.removeItem(k); continue; }
        if (lob.isPrivate) continue;
        regular.push(lob);
      }
    } catch(e) {}

    regular.sort(function(a, b) { return b.ts - a.ts; });
    return persists.concat(regular);
  }

  // Boot: ensure the public lobby always exists in localStorage.
  _initPublicLobby();

  return {
    createLobby,
    joinLobby,
    joinPublicLobby,
    leaveLobby,
    getCurrentLobby,
    listLobbies,
  };
})();

// ══════════════════════════════════════════════════════════════════════════════
// Lobby UI
// ══════════════════════════════════════════════════════════════════════════════

function _lobbyUiRefresh() {
  const wrap = document.getElementById('lobbySection');
  if (!wrap) return;

  const lob    = LobbyManager.getCurrentLobby();
  const isConn = window.NetworkManager && typeof NetworkManager.isConnected === 'function' && NetworkManager.isConnected();
  const isHost = window.NetworkManager && typeof NetworkManager.isHost === 'function'      && NetworkManager.isHost();
  const inPub  = lob && lob.id === _PUBLIC_LOBBY_ID;

  // ── Public Server button ────────────────────────────────────────────────────
  const pubBtn = document.getElementById('lobbyBtnPublic');
  if (pubBtn) {
    if (inPub) {
      pubBtn.textContent      = '✓ In Public Server';
      pubBtn.style.background = 'rgba(0,200,80,0.18)';
      pubBtn.style.borderColor = 'rgba(0,255,100,0.5)';
      pubBtn.style.color      = '#afffca';
      pubBtn.style.opacity    = '0.7';
      pubBtn.style.cursor     = 'default';
      pubBtn.onclick          = null;
    } else {
      pubBtn.textContent      = '🌐 Public Server';
      pubBtn.style.background = 'rgba(0,160,255,0.15)';
      pubBtn.style.borderColor = 'rgba(0,200,255,0.5)';
      pubBtn.style.color      = '#88eeff';
      pubBtn.style.opacity    = '1';
      pubBtn.style.cursor     = 'pointer';
      pubBtn.onclick          = function() { LobbyManager.joinPublicLobby(); };
    }
  }

  // ── Status bar ──────────────────────────────────────────────────────────────
  const statusEl = document.getElementById('lobbyStatus');
  if (statusEl) {
    if (lob) {
      const role  = isHost ? 'Hosting' : 'Joined';
      const label = lob.persistent ? 'Public Server' : lob.id;
      statusEl.style.display = '';
      statusEl.textContent = role + ' \u2022 ' + label + ' \u2022 ' + lob.players.length + '/' + lob.maxPlayers + ' players';
      statusEl.style.color = isHost ? '#88ffaa' : (inPub ? '#88eeff' : '#88ccff');
    } else {
      // Nothing to report when not in a lobby — the panel's own status line
      // and room chip already say where you are.
      statusEl.textContent = '';
      statusEl.style.display = 'none';
    }
  }

  // ── Player roster ───────────────────────────────────────────────────────────
  const roster = document.getElementById('lobbyRoster');
  if (roster) {
    if (lob && lob.players.length) {
      roster.style.display = 'flex';
      roster.innerHTML = lob.players.map(function(p, i) {
        const isLocal = window.NetworkManager
          && typeof NetworkManager.getLocalSlot === 'function'
          && NetworkManager.getLocalSlot() === p.slot;
        return [
          '<span class="online-chip', isLocal ? ' is-self' : (i === 0 ? ' is-host' : ''), '">',
            _lobEsc(p.name || ('P' + (p.slot + 1))),
            (i === 0 ? ' \u2605' : ''),
          '</span>',
        ].join('');
      }).join('');
    } else {
      roster.style.display = 'none';
      roster.innerHTML = '';
    }
  }

  // ── Show/hide controls based on lobby state ─────────────────────────────────
  const btnCreate  = document.getElementById('lobbyBtnCreate');
  const joinRow    = document.getElementById('lobbyJoinRow');
  const btnLeave   = document.getElementById('lobbyBtnLeave');
  const listWrap   = document.getElementById('lobbyListWrap');
  const maxSel     = document.getElementById('lobbyMaxSel');
  const privWrap   = document.getElementById('lobbyPrivChkWrap');

  if (btnCreate) btnCreate.style.display = lob ? 'none' : 'inline-block';
  if (joinRow)   joinRow.style.display   = lob ? 'none' : 'flex';
  if (listWrap)  listWrap.style.display  = lob ? 'none' : 'flex';
  if (maxSel)    maxSel.style.display    = lob ? 'none' : 'inline-block';
  if (privWrap)  privWrap.style.display  = lob ? 'none' : 'flex';
  // Leave button shown whenever in any lobby.
  if (btnLeave) btnLeave.style.display   = lob ? 'inline-block' : 'none';
}

function _lobbyRefreshList() {
  // The panel keeps ONE list of joinable rooms (#publicRoomList, owned by
  // refreshPublicRooms in smb-network.js) and it already folds in
  // LobbyManager.listLobbies(). A second list here only ever confused people
  // about which one was real.
  if (typeof refreshPublicRooms === 'function') refreshPublicRooms();
}

// ── Public functions called from button onclicks ──────────────────────────────

function lobbyCreate() {
  const maxSel  = document.getElementById('lobbyMaxSel');
  const privChk = document.getElementById('lobbyPrivChk');
  const max     = maxSel  ? (parseInt(maxSel.value) || 2) : 2;
  const priv    = privChk ? privChk.checked : false;
  LobbyManager.createLobby({ maxPlayers: max, isPrivate: priv });
}

function lobbyJoin() {
  const inp = document.getElementById('lobbyJoinInput');
  const id  = inp ? inp.value.trim() : '';
  if (!id) { _lobbyToast('Enter a lobby code first', true); return; }
  LobbyManager.joinLobby(id);
}

function lobbyLeave() {
  LobbyManager.leaveLobby();
}

window.LobbyManager = LobbyManager;

// ── Inject lobby section into #onlinePanel ────────────────────────────────────
function _lobbyInjectUI() {
  // Mount inside the panel's own step-1 block. The old version injected a
  // second, complete room UI (its own create/join/max-players/private/leave
  // widgets) above the panel's — two parallel ways to do the same thing, which
  // was the single biggest source of confusion on this screen. What is left
  // here is only what the panel does NOT already offer: the shared public
  // server and the list of open lobbies.
  const mount = document.getElementById('lobbyMount') || document.getElementById('onlinePanel');
  if (!mount || document.getElementById('lobbySection')) return;

  const sec = document.createElement('div');
  sec.id = 'lobbySection';
  sec.innerHTML = [
    '<div class="online-browser-head">',
      '<span class="online-label">Open rooms</span>',
      '<button class="online-chip-btn online-chip-quiet" ',
        'onclick="_lobbyRefreshList();_lobbyUiRefresh()">Refresh</button>',
    '</div>',
    '<button id="lobbyBtnPublic" onclick="LobbyManager.joinPublicLobby()">',
      '&#127760; Join the Public Server',
    '</button>',
    '<div id="lobbyStatus" style="display:none;"></div>',
    '<div id="lobbyRoster" class="online-roster" style="display:none;"></div>',
  ].join('');

  if (mount.id === 'lobbyMount') mount.appendChild(sec);
  else mount.insertBefore(sec, mount.firstChild);

  _lobbyRefreshList();
  _lobbyUiRefresh();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function _lobbyToast(msg, isError) {
  let t = document.getElementById('lobbyToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'lobbyToast';
    t.style.cssText = [
      'position:fixed','bottom:56px','left:50%','transform:translateX(-50%)',
      'background:rgba(5,5,20,0.94)','color:#dde4ff',
      'padding:8px 20px','border-radius:8px','font-size:0.8rem',
      'z-index:99999','pointer-events:none','transition:opacity 0.3s',
      'border:1px solid rgba(100,180,255,0.4)',
      "font-family:'Segoe UI',Arial,sans-serif",
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent       = msg;
  t.style.borderColor = isError ? 'rgba(255,80,80,0.5)' : 'rgba(100,180,255,0.4)';
  t.style.opacity     = '1';
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(function() { t.style.opacity = '0'; }, 2400);
}

// ── HTML escape ───────────────────────────────────────────────────────────────
function _lobEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _lobbyInjectUI);
} else {
  _lobbyInjectUI();
}

// Patch selectMode so the lobby list refreshes when the Online panel opens.
(function() {
  const _orig = window.selectMode;
  if (typeof _orig === 'function') {
    window.selectMode = function(mode) {
      _orig(mode);
      if (mode === 'online') {
        _lobbyRefreshList();
        _lobbyUiRefresh();
      }
    };
  }
})();
