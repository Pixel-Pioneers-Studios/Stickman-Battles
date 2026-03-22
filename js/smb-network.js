'use strict';

// ============================================================
// NETWORK MANAGER — WebRTC peer-to-peer via PeerJS
// Star topology: all guests connect to HOST.
// HOST: registers named PeerID "smcgame-<ROOMCODE>", manages up to 9 guests.
// GUESTS: connect to host, receive slot assignment (1-9).
// HOST relays all player states to all guests each tick.
// Supports up to 10 players total (slots 0-9, slot 0 = HOST).
// ============================================================
const NetworkManager = (() => {
  let _peer = null;
  let _connections = []; // all active DataConnections (host: N guests; guest: 1 to host)
  let _localSlot = 0;
  let _isHost = false;
  let _roomCode = '';
  let _maxPlayers = 10;
  let _remoteStates = {}; // slot -> latest state obj
  let _stateBuffers = {}; // slot -> [{state, ts}]
  const INTERP_DELAY = 130;
  const SEND_HZ = 20;
  let _sendTimer = 0;
  let _roomType = 'public';
  let _connected = false;
  let _slotCount = 1; // how many slots assigned so far (host = slot 0, guests get 1,2,...)
  let _pingTimers = {};
  let _latencies = {};

  function _log(msg) { console.log('[Net]', msg); }

  function showToast(msg, dur) {
    dur = dur || 2500;
    let t = document.getElementById('netToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'netToast';
      t.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.82);color:#fff;padding:10px 22px;border-radius:20px;font-size:15px;z-index:9999;pointer-events:none;transition:opacity 0.4s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._to);
    t._to = setTimeout(() => { t.style.opacity = '0'; }, dur);
  }

  function _setStatus(msg) {
    const el = document.getElementById('onlineStatus');
    if (el) el.textContent = msg;
  }

  function _appendChatMsg(sender, text) {
    const el = document.getElementById('chatMessages');
    if (!el) return;
    const d = document.createElement('div');
    d.style.cssText = 'padding:2px 0;font-size:13px;color:#ddd;';
    d.textContent = sender + ': ' + text;
    el.appendChild(d);
    el.scrollTop = el.scrollHeight;
  }

  function _initPeer(peerId) {
    _peer = peerId ? new Peer(peerId, { debug: 0 }) : new Peer({ debug: 0 });
    return new Promise((resolve, reject) => {
      _peer.on('open', id => { _log('Peer open: ' + id); resolve(id); });
      _peer.on('error', err => reject(err));
    });
  }

  // HOST: receives connections from guests
  function _setupHostListeners() {
    _peer.on('connection', conn => {
      if (_slotCount >= _maxPlayers) {
        conn.on('open', () => conn.send({ type: 'roomFull' }));
        return;
      }
      const guestSlot = _slotCount++;
      _connections.push(conn);
      _stateBuffers[guestSlot] = [];
      _log('Guest connecting to slot ' + guestSlot);

      conn.on('open', () => {
        conn.send({ type: 'slotAssign', slot: guestSlot, maxPlayers: _maxPlayers });
        _setStatus('Players: ' + _slotCount + '/' + _maxPlayers);
        showToast('Player ' + (guestSlot + 1) + ' joined!');
        _broadcast({ type: 'playerCount', count: _slotCount });
      });

      conn.on('data', msg => _handleMessage(guestSlot, conn, msg));
      conn.on('close', () => {
        _connections = _connections.filter(c => c !== conn);
        _slotCount = Math.max(1, _slotCount - 1);
        showToast('Player ' + (guestSlot + 1) + ' left');
        _setStatus('Players: ' + _slotCount + '/' + _maxPlayers);
      });
    });
  }

  function _handleMessage(fromSlot, fromConn, msg) {
    switch (msg.type) {
      case 'playerState':
        _stateBuffers[fromSlot] = _stateBuffers[fromSlot] || [];
        _stateBuffers[fromSlot].push({ state: msg.state, ts: performance.now() });
        if (_stateBuffers[fromSlot].length > 16) _stateBuffers[fromSlot].shift();
        _remoteStates[fromSlot] = msg.state;
        // HOST relays to all other connections
        if (_isHost) {
          const relay = { type: 'playerState', slot: fromSlot, state: msg.state };
          for (const c of _connections) { if (c !== fromConn && c.open) c.send(relay); }
        }
        break;

      case 'hostBroadcast':
        // Guest receives relayed state from host
        if (!_isHost && msg.slot !== undefined) {
          const s = msg.slot;
          _stateBuffers[s] = _stateBuffers[s] || [];
          _stateBuffers[s].push({ state: msg.state, ts: performance.now() });
          if (_stateBuffers[s].length > 16) _stateBuffers[s].shift();
          _remoteStates[s] = msg.state;
        }
        break;

      case 'hitEvent':
        if (typeof dealDamage === 'function' && players[msg.targetSlot]) {
          const attacker = players[msg.attackerSlot] || players[0];
          dealDamage(attacker, players[msg.targetSlot], msg.dmg, msg.kb);
        }
        if (_isHost) {
          const relay = Object.assign({}, msg);
          for (const c of _connections) { if (c !== fromConn && c.open) c.send(relay); }
        }
        break;

      case 'gameEvent':
        _handleGameEvent(msg);
        if (_isHost) {
          for (const c of _connections) { if (c !== fromConn && c.open) c.send(msg); }
        }
        break;

      case 'gameStateSync':
        if (!_isHost) {
          if (msg.arena && typeof selectArena === 'function') selectArena(msg.arena);
          if (msg.mode && typeof selectMode === 'function') selectMode(msg.mode);
        }
        break;

      case 'playerCount':
        _setStatus('Players: ' + msg.count + '/' + _maxPlayers);
        break;

      case 'roomFull':
        showToast('Room is full!');
        if (_peer) _peer.destroy();
        break;

      case 'ping':
        fromConn.send({ type: 'pong', id: msg.id });
        break;

      case 'pong':
        if (_pingTimers[msg.id]) {
          _latencies[fromSlot] = performance.now() - _pingTimers[msg.id];
          delete _pingTimers[msg.id];
        }
        break;
    }
  }

  function _handleGameEvent(msg) {
    if (msg.event === 'chat') {
      _appendChatMsg(msg.sender || 'P?', msg.text || '');
    } else if (msg.event === 'modeChange') {
      if (!_isHost && typeof selectMode === 'function') selectMode(msg.mode);
    } else if (msg.event === 'achievement') {
      if (typeof unlockAchievement === 'function') unlockAchievement(msg.id);
    } else if (msg.event === 'gameModeSelected') {
      _onlineGameMode = msg.data && msg.data.mode ? msg.data.mode : (msg.mode || '2p');
      gameMode = _onlineGameMode;
      if (typeof selectMode === 'function') selectMode(gameMode);
    }
  }

  function _broadcast(msg) {
    for (const c of _connections) { if (c && c.open) c.send(msg); }
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────

  async function connect(roomCode, maxPlayers) {
    maxPlayers = maxPlayers || 2;
    if (_peer) { _peer.destroy(); _peer = null; }
    _roomCode = roomCode.toUpperCase().trim();
    _maxPlayers = Math.min(10, Math.max(2, maxPlayers));
    _connections = [];
    _remoteStates = {};
    _stateBuffers = {};
    _slotCount = 1;

    const hostId = 'smcgame-' + _roomCode;
    _setStatus('Connecting...');

    try {
      // Try to register as HOST
      await _initPeer(hostId);
      _isHost = true;
      _localSlot = 0;
      localPlayerSlot = 0;
      onlineLocalSlot = 0;
      _connected = true;
      onlineMode = true;
      _setupHostListeners();
      _setStatus('Hosting \u2022 Players: 1/' + _maxPlayers);
      showToast('Room created! Share code: ' + _roomCode);
      if (_roomType === 'public') _advertisePublicRoom();
      const modeRow = document.getElementById('onlineGameModeRow');
      if (modeRow) modeRow.style.display = 'flex';
      const chatEl = document.getElementById('onlineChat');
      if (chatEl) chatEl.style.display = 'flex';
    } catch (err) {
      if (err.type === 'unavailable-id') {
        // Room exists — join as GUEST
        if (_peer) _peer.destroy();
        _peer = null;
        await _initPeer(undefined); // auto-generated ID
        _isHost = false;
        _connected = true;
        onlineMode = true;
        _setStatus('Joining room...');
        const conn = _peer.connect(hostId, { reliable: true });
        _connections = [conn];

        conn.on('open', () => { _log('Connected to host'); });
        conn.on('data', msg => {
          if (msg.type === 'slotAssign') {
            _localSlot = msg.slot;
            localPlayerSlot = msg.slot;
            onlineLocalSlot = msg.slot;
            _maxPlayers = msg.maxPlayers || _maxPlayers;
            _setStatus('Joined as P' + (_localSlot + 1) + ' \u2022 Waiting...');
            showToast('You are Player ' + (_localSlot + 1));
            const chatEl = document.getElementById('onlineChat');
            if (chatEl) chatEl.style.display = 'flex';
          } else if (msg.type === 'playerState') {
            // Host is relaying another guest's state
            const s = msg.slot;
            if (s !== undefined && s !== _localSlot) {
              _stateBuffers[s] = _stateBuffers[s] || [];
              _stateBuffers[s].push({ state: msg.state, ts: performance.now() });
              if (_stateBuffers[s].length > 16) _stateBuffers[s].shift();
              _remoteStates[s] = msg.state;
            }
          } else {
            _handleMessage(0, conn, msg);
          }
        });
        conn.on('close', () => {
          _connected = false;
          showToast('Disconnected from host');
          _setStatus('Disconnected');
          if (typeof gameRunning !== 'undefined' && gameRunning && typeof endGame === 'function') {
            endGame();
          }
        });
        conn.on('error', e => showToast('Connection error: ' + e));
      } else {
        _setStatus('Connection failed: ' + (err.message || err.type));
        showToast('Failed to connect');
        throw err;
      }
    }
  }

  function disconnect() {
    _broadcast({ type: 'gameEvent', event: 'playerLeft', slot: _localSlot });
    for (const c of _connections) { try { c.close(); } catch(e){} }
    _connections = [];
    if (_peer) { _peer.destroy(); _peer = null; }
    _connected = false;
    onlineMode = false;
    _setStatus('Disconnected');
    _unAdvertisePublicRoom();
  }

  function sendState() {
    if (!_connected) return;
    const p = (typeof players !== 'undefined') && players[_localSlot];
    if (!p) return;
    const state = {
      x: p.x, y: p.y, vx: p.vx, vy: p.vy,
      hp: p.health, facing: p.facing,
      anim: p.attackTimer > 0 ? 'attack' : p.onGround ? 'idle' : 'air',
      weapon: p.weaponKey, charClass: p.charClass || 'none',
      shield: p.shielding, stunTimer: p.stunTimer > 0,
      color: p.color, lives: p.lives,
      hat: p.hat || 'none', cape: p.cape || 'none',
      name: p.name || ('P' + (_localSlot + 1)),
      slot: _localSlot, ts: Date.now()
    };
    const msg = { type: 'playerState', slot: _localSlot, state };
    if (_isHost) {
      _broadcast(msg);
    } else if (_connections[0] && _connections[0].open) {
      _connections[0].send(msg);
    }
  }

  function sendHit(attackerSlot, targetSlot, dmg, kb) {
    // Support legacy 2-arg call: sendHit(dmg, kb)
    if (typeof targetSlot === 'undefined' || typeof dmg === 'undefined' || typeof kb === 'undefined') {
      // Legacy 2-player call: sendHit(dmg, kbDir)
      const legDmg = attackerSlot, legKb = targetSlot;
      const msg2 = { type: 'hitEvent', attackerSlot: _localSlot, targetSlot: _localSlot === 0 ? 1 : 0, dmg: legDmg, kb: legKb };
      if (_isHost) { _broadcast(msg2); }
      else if (_connections[0] && _connections[0].open) { _connections[0].send(msg2); }
      return;
    }
    const msg = { type: 'hitEvent', attackerSlot, targetSlot, dmg, kb };
    if (_isHost) { _broadcast(msg); }
    else if (_connections[0] && _connections[0].open) { _connections[0].send(msg); }
  }

  function sendGameEvent(event, data) {
    const msg = Object.assign({ type: 'gameEvent', event }, data || {});
    if (_isHost) { _broadcast(msg); }
    else if (_connections[0] && _connections[0].open) { _connections[0].send(msg); }
  }

  function sendChatMsg() {
    const inp = document.getElementById('chatInput');
    if (!inp || !inp.value.trim()) return;
    const text = inp.value.trim();
    inp.value = '';
    const sender = 'P' + (_localSlot + 1);
    _appendChatMsg(sender, text);
    sendGameEvent('chat', { sender, text });
  }

  function onChatKey(e) {
    if (e.key === 'Enter') sendChatMsg();
  }

  function getRemoteState(slot) {
    const buf = _stateBuffers[slot];
    if (!buf || buf.length === 0) return _remoteStates[slot] || null;
    const now = performance.now() - INTERP_DELAY;
    let a = buf[0], b = buf[0];
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i].ts <= now && buf[i+1].ts >= now) { a = buf[i]; b = buf[i+1]; break; }
      if (buf[i+1].ts < now) { a = buf[i+1]; b = buf[i+1]; }
    }
    if (a === b) return a.state;
    const t = Math.max(0, Math.min(1, (now - a.ts) / Math.max(1, b.ts - a.ts)));
    return Object.assign({}, b.state, {
      x: a.state.x + (b.state.x - a.state.x) * t,
      y: a.state.y + (b.state.y - a.state.y) * t,
    });
  }

  // Legacy getRemoteState() with no arg — returns slot 1 state for 2P compat
  function getRemoteStateLegacy() {
    const otherSlot = _localSlot === 0 ? 1 : 0;
    return getRemoteState(otherSlot);
  }

  function isHost() { return _isHost; }
  function isConnected() { return _connected; }
  function getLocalSlot() { return _localSlot; }
  function getSlotCount() { return _slotCount; }
  function getLatency(slot) { return _latencies[slot] || 0; }

  function tick(localPlayer) {
    // localPlayer param kept for legacy API compat — we use players[_localSlot] instead
    _sendTimer++;
    if (_sendTimer >= Math.ceil(60 / SEND_HZ)) {
      _sendTimer = 0;
      sendState();
    }
  }

  // Public room advertisement via localStorage
  let _advTimer = null;
  function _advertisePublicRoom() {
    if (_roomType !== 'public') return;
    const key = 'smcpub_' + _roomCode;
    localStorage.setItem(key, JSON.stringify({ code: _roomCode, ts: Date.now(), players: _slotCount, max: _maxPlayers }));
    clearInterval(_advTimer);
    _advTimer = setInterval(() => {
      if (_connected && _isHost && _roomType === 'public') {
        localStorage.setItem(key, JSON.stringify({ code: _roomCode, ts: Date.now(), players: _slotCount, max: _maxPlayers }));
      }
    }, 30000);
  }

  function _unAdvertisePublicRoom() {
    clearInterval(_advTimer);
    if (_roomCode) localStorage.removeItem('smcpub_' + _roomCode);
  }

  function setRoomType(type) {
    _roomType = type;
    const pubBtn = document.getElementById('roomTypePublicBtn');
    const privBtn = document.getElementById('roomTypePrivateBtn');
    if (pubBtn) pubBtn.classList.toggle('active', type === 'public');
    if (privBtn) privBtn.classList.toggle('active', type === 'private');
    const browser = document.getElementById('publicRoomBrowser');
    if (browser) browser.style.display = type === 'public' ? 'flex' : 'none';
    if (_isHost && type === 'public') _advertisePublicRoom();
    if (type === 'private') _unAdvertisePublicRoom();
  }

  function refreshPublicRooms() {
    const list = document.getElementById('publicRoomList');
    if (!list) return;
    list.innerHTML = '';
    const now = Date.now();
    let found = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('smcpub_')) continue;
      try {
        const d = JSON.parse(localStorage.getItem(k));
        if (now - d.ts > 120000) { localStorage.removeItem(k); continue; }
        found++;
        const btn = document.createElement('button');
        btn.className = 'btn pub-room-btn';
        btn.style.cssText = 'width:100%;margin:2px 0;font-size:13px;';
        btn.textContent = d.code + '  (' + d.players + '/' + d.max + ' players)';
        btn.onclick = () => {
          const inp = document.getElementById('onlineRoomCode');
          if (inp) inp.value = d.code;
        };
        list.appendChild(btn);
      } catch(e) {}
    }
    if (!found) list.innerHTML = '<div style="color:#aaa;font-size:13px;padding:4px;">No public rooms found</div>';
  }

  function setOnlineGameMode(mode) {
    if (!_isHost) return;
    _onlineGameMode = mode;
    gameMode = mode;
    if (typeof selectMode === 'function') selectMode(mode);
    document.querySelectorAll('#onlineGameModeRow .btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    sendGameEvent('gameModeSelected', { mode });
  }

  // Legacy sendGameStateSync for compatibility
  function sendGameStateSync(stateObj) {
    if (!_isHost) return;
    _broadcast({ type: 'gameStateSync', state: stateObj });
  }

  return {
    connect, disconnect, tick,
    sendState, sendHit, sendGameEvent, sendChatMsg,
    getRemoteState, getRemoteStateLegacy,
    getLocalSlot, getSlotCount, isHost, isConnected, getLatency,
    setRoomType, refreshPublicRooms, setOnlineGameMode, showToast,
    sendGameStateSync,
    get connected() { return _connected; },
    get slot() { return _localSlot; },
    get room() { return _roomCode; },
    get localSlot() { return _localSlot; },
  };
})();

// ============================================================
// STANDALONE FUNCTIONS (called from HTML onclick, etc.)
// ============================================================
function networkJoinRoom() {
  const code = ((document.getElementById('onlineRoomCode') || {}).value || '').trim();
  const maxEl = document.getElementById('onlineMaxPlayers');
  const max = maxEl ? (parseInt(maxEl.value) || 2) : 2;
  if (!code) { NetworkManager.showToast('Enter a room code'); return; }
  NetworkManager.connect(code, max).catch(e => console.error('[Net] Connect failed:', e));
}

function onChatKey(e) {
  if (e.key === 'Enter') { e.preventDefault(); NetworkManager.sendChatMsg(); }
}

function sendChatMsg() { NetworkManager.sendChatMsg(); }

function setRoomType(type) { NetworkManager.setRoomType(type); }

function refreshPublicRooms() { NetworkManager.refreshPublicRooms(); }

function setOnlineGameMode(mode) { NetworkManager.setOnlineGameMode(mode); }

function selectOnlineArena(arenaKey) {
  if (typeof selectArena === 'function') selectArena(arenaKey);
  NetworkManager.sendGameEvent('modeChange', { arena: arenaKey });
}

function showToast(msg, duration) {
  NetworkManager.showToast(msg, duration);
}
