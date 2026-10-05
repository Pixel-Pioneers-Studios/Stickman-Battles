'use strict';
// smb-public-hub.js — client for the Public Server (hostless shared lobbies).
//
// The server (pubhub.js) owns the lobby rules: roster, the hub -> vote ->
// round clock, votes and teams. This module turns that into a game:
//   • HUB    — free-for-all on Mega City with roaming bots, infinite respawns.
//   • VOTE   — an overlay; the server tallies and picks the next mode.
//   • ROUND  — Soccer (team play) for now; other modes are listed as coming soon.
//
// Every browser simulates only its OWN fighter and sends its state 20x a second.
// Everyone else appears as a network-driven puppet (isRemote + _pubRemote).
// Shared objects — the bots and the soccer ball — are simulated by exactly one
// browser, the "authority" the server designates, and mirrored everywhere else.
// When the authority leaves, the server names a new one and that browser turns
// the mirrored bots back into real ones from the last snapshot.
//
// Hits are decided on the attacker's machine (same model as 1v1 online) and
// routed through the server: a hit on a player goes to that player, a hit on a
// bot goes to the authority.
//
// Load order: after smb-online.js. Everything else it touches (Fighter,
// players, startGame, dealDamage, sports) is read at call time.

const PubHub = (() => {
  const STATE_EVERY   = 3;    // frames between own-state sends (20 Hz)
  const WORLD_EVERY   = 4;    // frames between world snapshots (15 Hz)
  const INTERP_MS     = 110;  // puppets render this far in the past, between two packets
  const BOT_TARGET    = 6;    // humans + bots the hub aims for
  const BOT_MIN       = 2;    // always some bots wandering, however full the hub
  const HUB_ARENA     = 'megacity';

  let _sock = null;
  let _connecting = false;
  let _active = false;
  let _slot = -1;
  let _authority = -1;
  let _label = '';
  let _max = 10;
  let _roster = {};            // slot -> { name, color }
  let _phase = null;           // last phase payload from the server
  let _skew = 0;               // serverNow - Date.now()
  let _stage = null;           // 'hub' | 'soccer' — which local match is running
  let _setupDone = false;      // local match has been converted for the lobby
  let _frame = 0;
  let _myVote = null;
  let _saved = null;           // settings restored when leaving
  let _lastDisconnect = null;  // socket.io reason, for the console: PubHub.lastDisconnect

  const _buf = {};             // slot -> [{ s, t }] incoming fighter states
  const _puppets = {};         // slot -> Fighter
  const _bots = {};            // id -> Fighter (real on the authority, puppets elsewhere)
  const _botBuf = {};          // id -> [{ s, t }]
  let _nextBotNum = 0;
  let _world = null;           // latest soccer snapshot (non-authority)
  let _worldFresh = false;     // _world not yet applied
  let _sportsResetSeen = 0;
  let _sportsResetSeq = 0;

  // ── Small helpers ─────────────────────────────────────────────────────────
  function _toast(msg, ms) {
    if (typeof showToast === 'function') showToast(msg, ms || 2600);
  }
  function _isAuth() { return _active && _slot >= 0 && _slot === _authority; }
  function _me() { return (typeof players !== 'undefined' && players[0] && !players[0]._pubRemote && !players[0]._pubBotId) ? players[0] : null; }
  function _myName() {
    try {
      if (window.AccountManager) {
        const a = AccountManager.getActiveAccount();
        if (a && a.username) return a.username;
      }
    } catch (e) {}
    return 'Player';
  }
  function _serverNow() { return Date.now() + _skew; }

  function _serverUrl() {
    // Local dev: `node server.js` serves the game and the lobby from one origin.
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    if (local) return location.origin;
    const u = (typeof SERVER_CONFIG !== 'undefined' && SERVER_CONFIG.url) || location.origin;
    return String(u).replace(/\/$/, '');
  }

  // The client library comes from the lobby server itself (Socket.io serves it),
  // so it always matches the server version and passes the site's CSP.
  function _loadIO(url) {
    if (window.io) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url + '/socket.io/socket.io.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('socket.io client failed to load'));
      document.head.appendChild(s);
    });
  }

  // ── Joining and leaving ───────────────────────────────────────────────────
  async function join() {
    if (_active || _connecting) return;
    // One multiplayer session at a time: a peer-to-peer room would fight this
    // one for players[] and onlineMode.
    if (typeof NetworkManager !== 'undefined' && NetworkManager.connected) NetworkManager.disconnect();
    _connecting = true;
    _toast('Connecting to the Public Server…');
    const url = _serverUrl();
    // The server sleeps when idle on its current hosting plan; the first
    // connection after a quiet spell can take up to a minute to wake it
    // (the client library download below is what waits on that).
    const slow = setTimeout(() => _toast('Waking the Public Server up — this can take up to a minute', 8000), 4000);
    try {
      await _loadIO(url);
    } catch (e) {
      clearTimeout(slow);
      _connecting = false;
      _toast('Could not reach the Public Server');
      return;
    }
    // A dropped connection reconnects and rejoins; the match keeps running
    // meanwhile. Only a connection that cannot come back ends the session.
    _sock = window.io(url, {
      transports: ['websocket', 'polling'], timeout: 70000,
      reconnection: true, reconnectionAttempts: 6, reconnectionDelay: 1000, reconnectionDelayMax: 5000,
    });
    _sock.on('connect', () => {
      clearTimeout(slow);
      // Fires again after every reconnect: rejoining gives us a fresh slot.
      _sock.emit('pub:join', { name: _myName(), color: _myColorGuess() });
      // A server without the lobby (an older deploy) accepts the connection
      // but never answers the join. Don't leave the player waiting forever.
      if (!_active) {
        setTimeout(() => {
          if (_active || !_sock) return;
          _connecting = false;
          _toast('The Public Server is not available right now');
          _teardownSocket();
        }, 20000);
      }
    });
    _sock.on('connect_error', () => {
      if (_active) return;           // mid-session: the reconnect loop owns this
      clearTimeout(slow);
      _connecting = false;
      _toast('Could not reach the Public Server');
      _teardownSocket();
    });
    _sock.on('disconnect', (reason) => {
      _lastDisconnect = reason;
      if (!_active) return;
      // The server closed us on purpose (or we left): no point retrying.
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        _toast('Lost connection to the Public Server');
        leave();
        return;
      }
      _toast('Connection dropped — reconnecting…', 4000);
    });
    _sock.io.on('reconnect_failed', () => {
      if (!_active) return;
      _toast('Lost connection to the Public Server');
      leave();
    });
    _sock.on('pub:welcome', _onWelcome);
    _sock.on('pub:roster', _onRoster);
    _sock.on('pub:joined', m => { _roster[m.slot] = { name: m.name, color: m.color }; _toast(m.name + ' joined'); });
    _sock.on('pub:left', _onLeft);
    _sock.on('pub:authority', m => _setAuthority(m.slot));
    _sock.on('pub:phase', _onPhase);
    _sock.on('pub:votes', t => { if (_phase) _phase.votes = t; _renderVote(); });
    _sock.on('pub:state', _onState);
    _sock.on('pub:world', _onWorld);
    _sock.on('pub:hit', _onHit);
    _sock.on('pub:event', _onEvent);
    _sock.on('pub:chat', m => {
      if (window._cgChatDisabled) return;
      if (typeof NetworkManager !== 'undefined' && NetworkManager.appendChat) NetworkManager.appendChat(m.name, m.text);
    });
  }

  function _myColorGuess() {
    try {
      if (typeof p1Skin !== 'undefined' && p1Skin !== 'default' && typeof SKIN_COLORS !== 'undefined' && SKIN_COLORS[p1Skin]) return SKIN_COLORS[p1Skin];
    } catch (e) {}
    return null;
  }

  function _teardownSocket() {
    if (_sock) {
      try { _sock.removeAllListeners(); _sock.disconnect(); } catch (e) {}
    }
    _sock = null;
  }

  // fromMenu: backToMenu() is already tearing the match down — don't call it again.
  function leave(fromMenu) {
    if (!_active && !_sock) return;
    const wasActive = _active;
    if (_sock && _sock.connected) { try { _sock.emit('pub:leave'); } catch (e) {} }
    _teardownSocket();
    _active = false;
    _connecting = false;
    window._pubHubActive = false;
    _clearWorld();
    _hideOverlay();
    if (_saved) {
      if (typeof infiniteMode !== 'undefined') infiniteMode = _saved.infiniteMode;
      _saved = null;
    }
    if (typeof NetworkManager !== 'undefined' && NetworkManager.setChatVisible) NetworkManager.setChatVisible(false);
    _placeChat(false);
    if (wasActive && !fromMenu && typeof backToMenu === 'function') backToMenu();
  }

  function _clearWorld() {
    for (const k of Object.keys(_buf)) delete _buf[k];
    for (const k of Object.keys(_puppets)) delete _puppets[k];
    for (const k of Object.keys(_bots)) delete _bots[k];
    for (const k of Object.keys(_botBuf)) delete _botBuf[k];
    _roster = {};
    _world = null;
    _stage = null;
    _setupDone = false;
    _myVote = null;
  }

  // ── Server messages ───────────────────────────────────────────────────────
  // Background tabs stop running the game loop; tell the server so the bots and
  // ball move to a player who is actually watching.
  function _reportVisibility() {
    if (_sock && _sock.connected) _sock.emit('pub:away', !!document.hidden);
  }
  document.addEventListener('visibilitychange', () => { if (_active) _reportVisibility(); });

  function _onWelcome(w) {
    const rejoin = _active;
    _connecting = false;
    _active = true;
    if (document.hidden) _reportVisibility();
    window._pubHubActive = true;
    if (rejoin) _dropNetworkEntities();
    _slot = w.slot;
    _authority = w.authority;
    if (players && players[0]) players[0]._pubSlot = _slot;
    _label = w.label || 'Public Server';
    _max = w.max || 10;
    _roster = {};
    for (const r of (w.roster || [])) _roster[r.slot] = { name: r.name, color: r.color };
    if (!rejoin) _saved = { infiniteMode: typeof infiniteMode !== 'undefined' ? infiniteMode : false };
    _onPhase(w.phase, true);
    // Back in after a drop, still in the same kind of match: keep playing, and
    // if the bots are now ours, bring them back.
    if (rejoin && _setupDone && _stage === 'hub' && _isAuth()) _balanceBots();
    if (rejoin) { _toast('Reconnected'); return; }
    if (typeof NetworkManager !== 'undefined' && NetworkManager.clearChat) NetworkManager.clearChat();
    _toast('Joined ' + _label + ' — ' + Object.keys(_roster).length + '/' + _max + ' players');
  }

  // Slots are reassigned on rejoin, so every puppet and mirrored bot is stale.
  function _dropNetworkEntities() {
    if (typeof players !== 'undefined' && Array.isArray(players)) {
      for (let i = players.length - 1; i >= 1; i--) {
        if (players[i] && (players[i]._pubRemote || players[i]._pubBotId)) players.splice(i, 1);
      }
    }
    for (const k of Object.keys(_buf)) delete _buf[k];
    for (const k of Object.keys(_puppets)) delete _puppets[k];
    for (const k of Object.keys(_bots)) delete _bots[k];
    for (const k of Object.keys(_botBuf)) delete _botBuf[k];
  }

  function _onRoster(m) {
    _roster = {};
    for (const r of (m.roster || [])) _roster[r.slot] = { name: r.name, color: r.color };
    if (m.authority !== undefined) _setAuthority(m.authority);
    // Puppets for anyone we have not built yet appear on their first state packet.
    _renderHud();
    if (_stage === 'hub' && _isAuth()) _balanceBots();
  }

  function _onLeft(m) {
    const f = _puppets[m.slot];
    if (f && typeof players !== 'undefined') {
      const i = players.indexOf(f);
      if (i >= 0) players.splice(i, 1);
    }
    delete _puppets[m.slot];
    delete _buf[m.slot];
    const who = _roster[m.slot] ? _roster[m.slot].name : 'A player';
    delete _roster[m.slot];
    _toast(who + ' left');
    _renderHud();
  }

  function _setAuthority(slot) {
    const was = _isAuth();
    _authority = slot;
    const now = _isAuth();
    if (now && !was) _takeOverWorld();
    if (!now && was) _releaseWorld();
  }

  // Someone else took the job (this tab went to the background): our real bots
  // become mirrors driven by the new authority's snapshots.
  function _releaseWorld() {
    for (const id of Object.keys(_bots)) {
      const b = _bots[id];
      b.isRemote = true; b._pubRemote = true; b.isAI = false;
    }
  }

  // This browser just became the authority: the mirrored bots become real ones
  // exactly where they were last seen.
  function _takeOverWorld() {
    for (const id of Object.keys(_bots)) {
      const b = _bots[id];
      b.isRemote = false; b._pubRemote = false;
      b.isAI = true; b.controls = {};
      b.lives = 99; b.invincible = Math.max(b.invincible || 0, 30);
      delete _botBuf[id];
    }
    if (_stage === 'hub') _balanceBots();
    // Soccer: the ball state we were mirroring becomes the simulation.
    if (_stage === 'soccer' && _world && typeof sportsBalls !== 'undefined') {
      _applySoccerSnapshot(_world, true);
    }
  }

  const _phaseLog = [];        // recent transitions, for the console: PubHub.phaseLog
  function _onPhase(p, fromWelcome) {
    if (!p) return;
    _phaseLog.push(new Date().toISOString().slice(11, 19) + ' ' + p.phase + '/' + p.mode + (p.result ? ' ' + JSON.stringify(p.result) : ''));
    if (_phaseLog.length > 20) _phaseLog.shift();
    _phase = p;
    _skew = (p.serverNow || Date.now()) - Date.now();
    if (p.phase !== 'vote') _myVote = null;
    // Which local match should be running for this phase?
    const want = (p.phase === 'round' || p.phase === 'results') && p.mode === 'soccer' ? 'soccer' : 'hub';
    if (want !== _stage) _startStage(want);
    else if (want === 'soccer' && p.teams) _applyTeams();
    if (p.phase === 'results' && !fromWelcome) _showResults(p);
    _renderHud();
    _renderVote();
  }

  // ── Local match lifecycle ─────────────────────────────────────────────────
  function _startStage(stage) {
    _stage = stage;
    _setupDone = false;
    _world = null;
    for (const k of Object.keys(_puppets)) delete _puppets[k];
    for (const k of Object.keys(_bots)) delete _bots[k];
    for (const k of Object.keys(_botBuf)) delete _botBuf[k];
    // Stop the running match without the game-over screen: the loop exits on
    // its next frame and startGame() schedules a fresh one.
    if (typeof gameRunning !== 'undefined') gameRunning = false;
    if (typeof infiniteMode !== 'undefined') infiniteMode = true;
    if (typeof completeRandomizer !== 'undefined') completeRandomizer = false;
    if (stage === 'soccer') {
      gameMode = 'minigames';
      if (typeof minigameType !== 'undefined') minigameType = 'sports';
      if (typeof selectSport === 'function') selectSport('soccer');
      else if (typeof sportsType !== 'undefined') sportsType = 'soccer';
    } else {
      gameMode = '2p';
      if (typeof selectedArena !== 'undefined') selectedArena = HUB_ARENA;
    }
    if (typeof startGame === 'function') startGame();
  }

  // Runs on the first frame of a freshly started local match: drop whatever
  // opponents the normal 1v1/minigame setup created and build the lobby.
  function _setupLocalMatch() {
    const me = players[0];
    if (!me) return;
    me.isAI = false; me.isRemote = false;
    me.name = _myName();
    me.lives = 99;
    me.target = null;
    me._pubSlot = _slot;
    players.length = 1;
    if (typeof minions !== 'undefined' && Array.isArray(minions)) minions.length = 0;
    if (_stage === 'hub') {
      // Spread arrivals across the city instead of stacking them on one ledge.
      const a = currentArena || {};
      const left = a.mapLeft !== undefined ? a.mapLeft : 0;
      const right = a.mapRight !== undefined ? a.mapRight : GAME_W;
      me.spawnX = left + 200 + Math.random() * Math.max(100, right - left - 400);
      me.x = me.spawnX;
      me.y = 300;
      me.invincible = 90;
    }
    _setupDone = true;
    if (_stage === 'hub' && _isAuth()) _balanceBots();
    for (const slot of Object.keys(_buf)) _ensurePuppet(+slot);
    if (_stage === 'soccer') {
      _applyTeams();
      if (typeof _sportsResetPositions === 'function') _sportsResetPositions();
      if (typeof _sportsServe === 'function') _sportsServe(-1);
      _sportsResetSeen = 0;
      _sportsResetSeq = 0;
    }
    _placeChat(true);
    if (typeof NetworkManager !== 'undefined' && NetworkManager.setChatVisible) NetworkManager.setChatVisible(!window._cgChatDisabled);
  }

  // The room chat is pinned top-left for 1v1, over the health bars. In the
  // lobby it sits bottom-left instead; leaving puts it back.
  function _placeChat(inLobby) {
    const el = document.getElementById('onlineChat');
    if (!el) return;
    el.style.top = inLobby ? 'auto' : '60px';
    el.style.bottom = inLobby ? '16px' : 'auto';
  }

  function _applyTeams() {
    if (!_phase || !_phase.teams) return;
    const me = _me();
    if (me) me._sportsTeam = _phase.teams[_slot] !== undefined ? _phase.teams[_slot] : 0;
    for (const slot of Object.keys(_puppets)) {
      const t = _phase.teams[slot];
      if (t !== undefined) _puppets[slot]._sportsTeam = t;
    }
  }

  // ── Puppets (other players) ───────────────────────────────────────────────
  function _ensurePuppet(slot) {
    // Before setup, players[] still belongs to the previous (or loading) match;
    // a puppet pushed into it would be lost when the new match replaces it.
    if (slot === _slot || !_setupDone) return null;
    if (_puppets[slot]) return _puppets[slot];
    if (typeof Fighter === 'undefined' || typeof players === 'undefined') return null;
    const meta = _roster[slot] || {};
    const f = new Fighter(0, -400, meta.color || '#8899aa', 'sword', {}, false, 'medium');
    f.isRemote = true; f._pubRemote = true; f._pubSlot = slot;
    f.isAI = false;
    f.name = meta.name || ('Player ' + (slot + 1));
    f.playerNum = slot + 1;
    f.lives = 99;
    if (_stage === 'soccer' && _phase && _phase.teams && _phase.teams[slot] !== undefined) f._sportsTeam = _phase.teams[slot];
    _puppets[slot] = f;
    players.push(f);
    return f;
  }

  function _packState(p) {
    return {
      x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10,
      vx: +(p.vx || 0).toFixed(2), vy: +(p.vy || 0).toFixed(2),
      h: Math.round(p.health), mh: p.maxHealth, f: p.facing,
      og: p.onGround ? 1 : 0,
      at: p.attackTimer || 0, ad: p.attackDuration || 12,
      hu: p.hurtTimer || 0, st: p.stunTimer || 0,
      inv: p.invincible || 0, sh: p.shielding ? 1 : 0,
      w: p.weaponKey, c: p.charClass || 'none', col: p.color,
      hat: p.hat || 'none', cape: p.cape || 'none',
      ab: p.abilityCooldown || 0, su: p.superReady ? 1 : 0,
      n: p.name,
    };
  }

  function _applyPacked(f, s) {
    f.x = s.x; f.y = s.y;
    f.vx = s.vx || 0; f.vy = s.vy || 0;
    if (s.h != null) f.health = s.h;
    if (s.mh != null) f.maxHealth = s.mh;
    if (s.f) f.facing = s.f;
    f.onGround = !!s.og;
    f.state = s.at > 0 ? 'attacking' : (s.og ? 'idle' : 'jumping');
    f.attackTimer = s.at || 0;
    f.attackDuration = s.ad || 12;
    f.hurtTimer = s.hu || 0;
    f.stunTimer = s.st || 0;
    f.invincible = s.inv || 0;
    f.shielding = !!s.sh;
    f.abilityCooldown = s.ab || 0;
    f.superReady = !!s.su;
    if (s.c && s.c !== f._pubClass && typeof applyClass === 'function' && typeof CLASSES !== 'undefined' && CLASSES[s.c]) {
      f._pubClass = s.c;
      const keepHp = f.health;
      applyClass(f, s.c);
      f.health = keepHp;
    }
    if (s.w && s.w !== f.weaponKey && typeof WEAPONS !== 'undefined' && WEAPONS[s.w]) {
      f.weaponKey = s.w; f.weapon = WEAPONS[s.w];
    }
    if (s.col) f.color = s.col;
    if (s.hat) f.hat = s.hat;
    if (s.cape) f.cape = s.cape;
    if (s.n) f.name = s.n;
  }

  // Two buffered packets either side of (now - INTERP_MS), position blended.
  function _sample(buf) {
    if (!buf || !buf.length) return null;
    const t = performance.now() - INTERP_MS;
    let a = buf[0], b = buf[0];
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i].t <= t && buf[i + 1].t >= t) { a = buf[i]; b = buf[i + 1]; break; }
      if (buf[i + 1].t < t) { a = buf[i + 1]; b = buf[i + 1]; }
    }
    if (a === b) return a.s;
    const k = Math.max(0, Math.min(1, (t - a.t) / Math.max(1, b.t - a.t)));
    return Object.assign({}, b.s, { x: a.s.x + (b.s.x - a.s.x) * k, y: a.s.y + (b.s.y - a.s.y) * k });
  }

  function _push(buf, s) {
    buf.push({ s, t: performance.now() });
    if (buf.length > 20) buf.shift();
  }

  function _onState(m) {
    if (!_active || !m || m.slot === _slot || !m.s) return;
    _buf[m.slot] = _buf[m.slot] || [];
    _push(_buf[m.slot], m.s);
    if (_setupDone) _ensurePuppet(m.slot);
  }

  // ── Bots ──────────────────────────────────────────────────────────────────
  function _humanCount() { return Object.keys(_roster).length || 1; }

  function _balanceBots() {
    if (!_isAuth() || _stage !== 'hub' || !_setupDone) return;
    const want = Math.max(BOT_MIN, BOT_TARGET - _humanCount());
    const ids = Object.keys(_bots);
    for (let i = ids.length; i < want; i++) _spawnBot();
    for (let i = ids.length; i > want; i--) _removeBot(ids[i - 1]);
  }

  function _spawnBot() {
    if (typeof Fighter === 'undefined' || typeof players === 'undefined') return;
    const id = 'b' + (_nextBotNum++ % 1000);
    const a = currentArena || {};
    const left = a.mapLeft !== undefined ? a.mapLeft : 0;
    const right = a.mapRight !== undefined ? a.mapRight : GAME_W;
    const weapons = (typeof WEAPON_KEYS !== 'undefined' && WEAPON_KEYS.length) ? WEAPON_KEYS : ['sword'];
    const classes = (typeof CLASSES !== 'undefined') ? Object.keys(CLASSES).filter(k => k !== 'none' && k !== 'megaknight') : [];
    const colors = ['#ff6b6b', '#ffd166', '#06d6a0', '#a78bfa', '#f78c6b', '#4cc9f0'];
    const b = new Fighter(left + 200 + Math.random() * Math.max(100, right - left - 400), 200,
      colors[Math.floor(Math.random() * colors.length)],
      weapons[Math.floor(Math.random() * weapons.length)], {}, true, Math.random() < 0.5 ? 'easy' : 'medium');
    if (classes.length && typeof applyClass === 'function') applyClass(b, classes[Math.floor(Math.random() * classes.length)]);
    b.name = 'BOT';
    b.lives = 99;
    b._pubBotId = id;
    b.spawnX = b.x; b.spawnY = 300;
    _bots[id] = b;
    players.push(b);
  }

  function _removeBot(id) {
    const b = _bots[id];
    if (b && typeof players !== 'undefined') {
      const i = players.indexOf(b);
      if (i >= 0) players.splice(i, 1);
    }
    delete _bots[id];
    delete _botBuf[id];
  }

  function _packBot(b) {
    const s = _packState(b);
    s.id = b._pubBotId;
    delete s.hat; delete s.cape; delete s.n; delete s.ab; delete s.su;
    return s;
  }

  function _onWorld(w) {
    if (!_active || _isAuth() || !w) return;
    if (Array.isArray(w.bots) && _stage === 'hub' && _setupDone) {
      const seen = {};
      for (const s of w.bots) {
        if (!s || !s.id) continue;
        seen[s.id] = true;
        if (!_bots[s.id]) {
          const f = new Fighter(s.x, s.y, s.col || '#aaaaaa', s.w || 'sword', {}, false, 'medium');
          f.isRemote = true; f._pubRemote = true; f._pubBotId = s.id;
          f.isAI = false; f.name = 'BOT'; f.lives = 99;
          _bots[s.id] = f;
          players.push(f);
        }
        _botBuf[s.id] = _botBuf[s.id] || [];
        _push(_botBuf[s.id], s);
      }
      for (const id of Object.keys(_bots)) if (!seen[id]) _removeBot(id);
    }
    if (w.soccer && _stage === 'soccer') { _world = w.soccer; _worldFresh = true; }
  }

  // ── Hits ──────────────────────────────────────────────────────────────────
  // Called from dealDamage() for every hit this browser resolves. Only hits
  // authored HERE are forwarded; hits applied because a packet told us to are
  // made by a puppet attacker and are never echoed back.
  function onDamage(attacker, target, dmg, kb) {
    if (!_active || !attacker || !target || attacker === target) return;
    if (attacker._pubRemote) return;
    let from;
    if (attacker._pubBotId) from = attacker._pubBotId;            // authority's own bot
    else if (attacker === players[0]) from = _slot;               // me
    else if (attacker.owner === players[0]) from = _slot;         // my projectile / summon
    else return;
    let to;
    if (target._pubRemote && target._pubSlot !== undefined) to = target._pubSlot;
    else if (target._pubRemote && target._pubBotId) to = target._pubBotId;   // a bot mirrored here
    else return;                                                   // local-only victim
    if (_sock && _sock.connected) _sock.emit('pub:hit', { attacker: from, target: to, dmg, kb });
  }

  function _onHit(h) {
    if (!_active || !h || typeof dealDamage !== 'function') return;
    const attacker = typeof h.attacker === 'string' ? _bots[h.attacker] : _puppets[h.attacker];
    let victim = null;
    if (h.target === _slot) victim = _me();
    else if (typeof h.target === 'string' && _isAuth()) victim = _bots[h.target];
    if (!attacker || !victim || victim.health <= 0) return;
    dealDamage(attacker, victim, Number(h.dmg) || 0, Number(h.kb) || 0);
  }

  function _onEvent(ev) {
    if (!_active || !ev) return;
    if (ev.type === 'goal') {
      // Soccer banners arrive with the snapshot; nothing else to do.
    }
  }

  // ── Soccer mirroring ──────────────────────────────────────────────────────
  function _packSoccer() {
    if (typeof sportsBalls === 'undefined') return null;
    return {
      balls: sportsBalls.map(b => ({
        x: Math.round(b.x), y: Math.round(b.y), vx: +b.vx.toFixed(2), vy: +b.vy.toFixed(2),
        r: b.r, hid: b.hidden ? 1 : 0, fire: b.fire || 0, ch: b.charged || 0, spin: +(b.spin || 0).toFixed(2),
      })),
      score: sportsScore.slice(),
      pause: sportsPause,
      reset: _sportsResetSeq,
      banner: sportsBanner ? { text: sportsBanner.text, sub: sportsBanner.sub, color: sportsBanner.color, t: sportsBanner.t } : null,
      win: sportsWinnerIdx,
    };
  }

  function _applySoccerSnapshot(w, takeOver) {
    if (!w || typeof sportsBalls === 'undefined') return;
    while (sportsBalls.length < w.balls.length && typeof _sportsMakeBall === 'function') sportsBalls.push(_sportsMakeBall(0, 0));
    sportsBalls.length = w.balls.length;
    w.balls.forEach((s, i) => {
      const b = sportsBalls[i];
      // Mirrors ease toward the authority's ball rather than teleporting.
      const k = takeOver ? 1 : 0.45;
      b.x += (s.x - b.x) * k; b.y += (s.y - b.y) * k;
      b.vx = s.vx; b.vy = s.vy; b.r = s.r || b.r;
      b.hidden = !!s.hid; b.fire = s.fire || 0; b.charged = s.ch || 0; b.spin = s.spin || 0;
    });
    sportsScore[0] = w.score[0]; sportsScore[1] = w.score[1];
    sportsPause = w.pause;
    sportsWinnerIdx = w.win;
    if (w.banner) {
      if (!sportsBanner || sportsBanner.text !== w.banner.text || sportsBanner.sub !== w.banner.sub) sportsBanner = Object.assign({}, w.banner);
    }
    if (w.reset !== _sportsResetSeen) {
      _sportsResetSeen = w.reset;
      // Kickoff after a goal: put my own fighter back on my side.
      const me = _me();
      if (me && typeof SPORTS_FLOOR_Y !== 'undefined') {
        const left = me._sportsTeam === 0;
        me.x = (left ? 170 : 730) - me.w / 2 + (Math.random() - 0.5) * 60;
        me.y = SPORTS_FLOOR_Y - me.h - 2;
        me.vx = 0; me.vy = 0; me.facing = left ? 1 : -1;
      }
    }
  }

  // Called at the top of updateSports() on browsers that are NOT the
  // authority: they draw the authority's ball and score and simulate nothing.
  function sportsFollow() {
    if (sportsBanner && --sportsBanner.t <= 0) sportsBanner = null;
    if (_world && _worldFresh) { _worldFresh = false; _applySoccerSnapshot(_world, false); }
    const g = (typeof SPORTS !== 'undefined' && SPORTS[sportsType]) ? SPORTS[sportsType].grav : 0.5;
    for (const b of (typeof sportsBalls !== 'undefined' ? sportsBalls : [])) {
      // Dead-reckon between snapshots so the ball moves every frame.
      if (b.hidden || sportsPause > 0) continue;
      b.vy += g;
      b.x += b.vx; b.y += b.vy;
      if (typeof SPORTS_FLOOR_Y !== 'undefined' && b.y > SPORTS_FLOOR_Y - b.r) { b.y = SPORTS_FLOOR_Y - b.r; b.vy = 0; }
    }
  }

  // The authority's _sportsResetPositions()/serve after a goal: remote players
  // reset themselves when they see the counter move.
  function sportsKickoff() { _sportsResetSeq++; }

  // Authority: a team reached the win score. The server ends the round for
  // everyone; nobody runs endGame().
  function sportsWon(team) {
    if (!_isAuth() || !_sock) return;
    _sock.emit('pub:event', { type: 'roundOver', winner: team, score: sportsScore.slice() });
  }

  // ── Per-frame ─────────────────────────────────────────────────────────────
  function tick() {
    if (!_active) return;
    if (!_setupDone) {
      if (typeof gameRunning !== 'undefined' && gameRunning && players && players[0]) _setupLocalMatch();
      else return;
    }
    _frame++;
    const me = _me();
    if (me && me.lives < 50) me.lives = 99;

    // Drive puppets from their buffered packets.
    for (const slot of Object.keys(_puppets)) {
      const s = _sample(_buf[slot]);
      if (s) _applyPacked(_puppets[slot], s);
    }
    if (!_isAuth()) {
      for (const id of Object.keys(_bots)) {
        const s = _sample(_botBuf[id]);
        if (s) _applyPacked(_bots[id], s);
      }
    } else {
      for (const id of Object.keys(_bots)) {
        const b = _bots[id];
        if (b.lives < 50) b.lives = 99;
      }
    }

    if (!_sock || !_sock.connected) return;
    if (me && _frame % STATE_EVERY === 0) _sock.volatile.emit('pub:state', _packState(me));
    if (_isAuth() && _frame % WORLD_EVERY === 0) {
      const w = {};
      if (_stage === 'hub') w.bots = Object.values(_bots).map(_packBot);
      if (_stage === 'soccer') w.soccer = _packSoccer();
      _sock.volatile.emit('pub:world', w);
    }
    if (_frame % 30 === 0) _renderHud();
  }

  // World-space, above fighters: name tags so you can tell people apart.
  function drawWorld() {
    if (!_active || typeof ctx === 'undefined') return;
    ctx.save();
    ctx.font = 'bold 11px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    for (const slot of Object.keys(_puppets)) {
      const f = _puppets[slot];
      if (!f || f.health <= 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const label = f.name || ('P' + (+slot + 1));
      const w = ctx.measureText(label).width + 10;
      ctx.fillRect(f.cx() - w / 2, f.y - 24, w, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, f.cx(), f.y - 13);
    }
    ctx.restore();
  }

  // ── HUD, vote and results overlays (DOM) ──────────────────────────────────
  let _hud = null, _vote = null, _results = null;

  function _ensureDom() {
    if (_hud) return;
    const css = document.createElement('style');
    css.textContent = `
      #pubHud{position:fixed;top:46px;left:50%;transform:translateX(-50%);z-index:60;display:flex;gap:10px;align-items:center;
        background:rgba(8,10,24,.78);border:1px solid rgba(120,160,255,.25);border-radius:10px;padding:6px 12px;
        font:600 13px Rajdhani,sans-serif;color:#dfe6ff;pointer-events:auto}
      #pubHud .ph-timer{font-variant-numeric:tabular-nums;color:#ffd166}
      #pubHud button{background:rgba(255,80,80,.18);border:1px solid rgba(255,120,120,.5);color:#ffb3b3;border-radius:7px;
        padding:3px 9px;font:600 12px Rajdhani,sans-serif;cursor:pointer}
      #pubVote{position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:70;width:min(300px,86vw);
        background:rgba(8,10,24,.94);border:1px solid rgba(120,160,255,.35);border-radius:14px;padding:14px;
        font:600 14px Rajdhani,sans-serif;color:#dfe6ff;text-align:center}
      #pubVote h3{margin:0 0 4px;font:800 20px 'Russo One',Rajdhani,sans-serif;letter-spacing:1px}
      #pubVote .pv-sub{opacity:.7;margin-bottom:12px}
      #pubVote .pv-opt{display:flex;justify-content:space-between;align-items:center;width:100%;margin:6px 0;padding:9px 12px;
        border-radius:9px;border:1px solid rgba(120,160,255,.3);background:rgba(40,60,120,.25);color:#dfe6ff;
        font:700 14px Rajdhani,sans-serif;cursor:pointer}
      #pubVote .pv-opt.mine{border-color:#ffd166;background:rgba(255,209,102,.16)}
      #pubVote .pv-opt:disabled{opacity:.4;cursor:default}
      #pubVote .pv-n{color:#ffd166}
      #pubResults{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:70;
        background:rgba(8,10,24,.92);border:1px solid rgba(255,209,102,.4);border-radius:14px;padding:16px 26px;
        font:800 22px 'Russo One',Rajdhani,sans-serif;color:#ffd166;text-align:center}
      #pubResults small{display:block;font:600 14px Rajdhani,sans-serif;color:#dfe6ff;opacity:.8;margin-top:4px}
    `;
    document.head.appendChild(css);
    _hud = document.createElement('div');
    _hud.id = 'pubHud';
    document.body.appendChild(_hud);
    _vote = document.createElement('div');
    _vote.id = 'pubVote';
    _vote.style.display = 'none';
    document.body.appendChild(_vote);
    _results = document.createElement('div');
    _results.id = 'pubResults';
    _results.style.display = 'none';
    document.body.appendChild(_results);
    document.addEventListener('keydown', e => {
      if (!_active || !_phase || _phase.phase !== 'vote') return;
      const n = parseInt(e.key, 10);
      const opts = (_phase.options || []).filter(o => o.enabled);
      if (n >= 1 && n <= opts.length) vote(opts[n - 1].key);
    });
  }

  function _hideOverlay() {
    if (_hud) _hud.style.display = 'none';
    if (_vote) _vote.style.display = 'none';
    if (_results) _results.style.display = 'none';
  }

  function _fmt(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function _renderHud() {
    if (!_active) return;
    _ensureDom();
    const left = _phase ? _phase.endsAt - _serverNow() : 0;
    const n = Object.keys(_roster).length;
    let what = 'Free for all';
    if (_phase && _phase.phase === 'hub') what = 'Free for all — vote in <span class="ph-timer">' + _fmt(left) + '</span>';
    else if (_phase && _phase.phase === 'vote') what = 'Voting — <span class="ph-timer">' + _fmt(left) + '</span>';
    else if (_phase && _phase.phase === 'round') what = 'Soccer — <span class="ph-timer">' + _fmt(left) + '</span> left';
    else if (_phase && _phase.phase === 'results') what = 'Round over';
    _hud.innerHTML = '<span>' + _escape(_label) + ' · ' + n + '/' + _max + '</span><span>' + what + '</span>' +
      '<button type="button" id="pubLeaveBtn">Leave</button>';
    _hud.style.display = 'flex';
    const btn = document.getElementById('pubLeaveBtn');
    if (btn) btn.onclick = () => leave();
  }

  function _escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function _renderVote() {
    if (!_active) return;
    _ensureDom();
    if (!_phase || _phase.phase !== 'vote') { _vote.style.display = 'none'; return; }
    const tally = _phase.votes || {};
    let i = 0;
    const rows = (_phase.options || []).map(o => {
      const num = o.enabled ? (++i) + '. ' : '';
      const note = o.enabled ? '<span class="pv-n">' + (tally[o.key] || 0) + '</span>' : '<span>' + _escape(o.reason) + '</span>';
      return '<button type="button" class="pv-opt' + (_myVote === o.key ? ' mine' : '') + '" data-k="' + o.key + '"' +
        (o.enabled ? '' : ' disabled') + '><span>' + num + _escape(o.label) + '</span>' + note + '</button>';
    }).join('');
    _vote.innerHTML = '<h3>WHAT NEXT?</h3><div class="pv-sub">Vote with the buttons or number keys — you can keep fighting while you choose</div>' + rows;
    _vote.style.display = 'block';
    _vote.querySelectorAll('.pv-opt').forEach(b => { b.onclick = () => vote(b.dataset.k); });
  }

  function vote(key) {
    if (!_active || !_sock || !_phase || _phase.phase !== 'vote') return;
    _myVote = key;
    _sock.emit('pub:vote', key);
    _renderVote();
  }

  function _showResults(p) {
    _ensureDom();
    const r = p.result || {};
    let head = 'Round over', sub = '';
    if (r.reason === 'win') {
      const myTeam = p.teams ? p.teams[_slot] : undefined;
      head = (r.winner === 0 ? 'BLUE' : 'RED') + ' TEAM WINS';
      if (myTeam !== undefined) sub = myTeam === r.winner ? 'Your team won' : 'Your team lost';
      if (Array.isArray(r.score)) sub += (sub ? ' · ' : '') + r.score[0] + ' – ' + r.score[1];
    } else if (r.reason === 'time') {
      head = 'TIME';
    } else if (r.reason === 'players') {
      head = 'NOT ENOUGH PLAYERS';
    }
    _results.innerHTML = _escape(head) + (sub ? '<small>' + _escape(sub) + '</small>' : '') + '<small>Back to the city in a moment</small>';
    _results.style.display = 'block';
    setTimeout(() => { if (_results) _results.style.display = 'none'; }, 5500);
  }

  function sendChat(text) {
    if (_sock && _sock.connected) _sock.emit('pub:chat', text);
  }

  return {
    join, leave, tick, drawWorld, onDamage, vote, sendChat,
    sportsFollow, sportsKickoff, sportsWon,
    isAuthority: _isAuth,
    get phaseLog() { return _phaseLog.slice(); },
    get active() { return _active; },
    get slot() { return _slot; },
    get authority() { return _authority; },
    get lastDisconnect() { return _lastDisconnect; },
    // Console: simulate a network drop (the reconnect path should rejoin).
    debugDrop() { if (_sock && _sock.io && _sock.io.engine) _sock.io.engine.close(); },
  };
})();

window.PubHub = PubHub;
