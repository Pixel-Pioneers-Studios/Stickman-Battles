'use strict';
// smb-public-hub.js: client for the Public Server (hostless shared lobbies).
// The server (pubhub.js) owns the lobby rules: roster, hub -> vote -> round clock, teams.
// HUB: free-for-all on Mega City with roaming bots and infinite respawns. A private lobby
//      waits in a room instead: no bots, a pad per game, and the host starts the round.
// VOTE: an overlay. The server tallies and picks the next mode.
// ROUND: one of STAGES below (sports, Loadout Scramble, Infection, King of the Hill, Horde).
// Each browser simulates only its own fighter and sends state 20x a second. Other players
// are network puppets (isRemote + _pubRemote). Bots and the soccer ball are simulated by one
// "authority" browser and mirrored elsewhere. When it leaves, the server names a new one.
// Hits are decided on the attacker's machine and routed through the server.
// Load after smb-online.js. Fighter, players, startGame, dealDamage, sports are read at call time.

const PubHub = (() => {
  const STATE_EVERY   = 3;    // frames between own-state sends (20 Hz)
  const WORLD_EVERY   = 4;    // frames between world snapshots (15 Hz)
  const INTERP_MS     = 110;  // puppets render this far in the past, between two packets
  const BOT_TARGET    = 6;    // humans + bots the hub aims for
  const BOT_MIN       = 2;    // always some bots wandering, however full the hub
  // One entry per local match the lobby can run. `follow` = the camera tracks
  // your own fighter (maps too wide to frame everyone); `bots` = the authority
  // keeps roaming bots topped up.
  const STAGES = {
    hub:        { label: 'Free for all',     arena: 'megacity',  bots: true, follow: true },
    room:       { label: 'Waiting room',     arena: 'colosseum' },
    scramble:   { label: 'Loadout Scramble', arena: 'megacity',  bots: true, follow: true },
    tag:        { label: 'Infection',        arena: 'ruins' },
    koth:       { label: 'King of the Hill', arena: 'colosseum' },
    horde:      { label: 'Horde Defense',    arena: 'forest' },
    soccer:     { label: 'Soccer',           sport: 'soccer' },
    basketball: { label: 'Basketball',       sport: 'basketball' },
  };
  const EMOTES = ['GG', '\u{1F44D}', '\u{1F602}', '\u{1F62E}', '\u{1F621}', '\u{1F44B}'];
  const EMOTE_FRAMES  = 150;
  const KOTH_HALF_W   = 110;

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
  let _stage = null;           // key into STAGES: which local match is running
  let _code = '';              // this lobby's join code
  let _private = false;
  let _host = -1;              // private lobbies: the slot that starts rounds
  let _joinOpts = null;        // what the next pub:join asks for (reconnects reuse the code)
  let _round = null;           // server round state: scores, infected, lives, wave
  const _emotes = {};          // slot -> { id, t } frames left
  let _hordeWave = 0;          // authority: last wave this browser started
  let _hordeGap = 0;           // authority: frames until the next wave may spawn
  let _hordeDone = false;
  let _kothAt = 0;             // authority: last King of the Hill score tick (ms)
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

  // Small helpers
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
  function _def() { return STAGES[_stage] || STAGES.hub; }
  function _isSport() { return !!_def().sport; }
  function _inRound() { return !!(_phase && _phase.phase === 'round'); }
  // Stages with network-mirrored bots: the roaming ones, and Horde's waves.
  function _hasBots() { return !!_def().bots || _stage === 'horde'; }

  function _serverUrl() {
    // Local dev: `node server.js` serves the game and the lobby from one origin
    // (port 3001). Any other local server (VS Code Live Server / Live Preview,
    // python http.server) has no lobby, so it uses the hosted one.
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    if (local && location.port === '3001') return location.origin;
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

  // Joining and leaving
  // opts: { code } joins that lobby, { create: 'private' } opens a new private
  // one, nothing joins any public lobby.
  async function join(opts) {
    opts = opts || {};
    if (_connecting) return;
    if (_active) {
      // Accepting an invite while already in a different lobby: move over.
      if (!opts.code || String(opts.code).toUpperCase() === _code) return;
      leave();
    }
    _joinOpts = opts.code ? { code: String(opts.code) } : (opts.create ? { create: opts.create } : null);
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
      _sock.emit('pub:join', Object.assign({ name: _myName(), color: _myColorGuess(), fc: _myFriendCode() }, _joinOpts || {}));
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
    _sock.on('pub:joinFail', m => {
      _connecting = false;
      _toast(m && m.reason === 'full' ? 'That lobby is full' : 'That lobby has closed');
      if (_active) leave(); else _teardownSocket();
    });
    _sock.on('pub:round', r => { _round = r; _renderHud(); });
    _sock.on('pub:startFail', () => _toast('Nobody is standing on a game yet — step onto a pad, then start'));
    _sock.on('pub:emote', m => { if (m && EMOTES[m.id]) _emotes[m.slot] = { id: m.id, t: EMOTE_FRAMES }; });
    _sock.on('pub:roster', _onRoster);
    _sock.on('pub:joined', m => { _roster[m.slot] = Object.assign(_roster[m.slot] || {}, { name: m.name, color: m.color }); _toast(m.name + ' joined'); });
    _sock.on('pub:left', _onLeft);
    _sock.on('pub:authority', m => _setAuthority(m.slot));
    _sock.on('pub:phase', _onPhase);
    _sock.on('pub:votes', t => { if (_phase) _phase.votes = t; _renderVote(); _renderHud(); });
    _sock.on('pub:state', _onState);
    _sock.on('pub:world', _onWorld);
    _sock.on('pub:proj', _onProj);
    _sock.on('pub:hit', _onHit);
    _sock.on('pub:event', _onEvent);
    _sock.on('pub:chat', m => {
      if (window._cgChatDisabled) return;
      if (typeof NetworkManager !== 'undefined' && NetworkManager.appendChat) NetworkManager.appendChat(m.name, m.text);
    });
  }

  function _myFriendCode() {
    return (window.FriendsManager && FriendsManager.code) || null;
  }

  // Called by FriendsManager once this browser's friend code is known.
  function setFriendCode(fc) {
    if (fc && _active && _sock && _sock.connected) _sock.emit('pub:fc', fc);
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

  // fromMenu: backToMenu() is already tearing the match down: don't call it again.
  function leave(fromMenu) {
    if (!_active && !_sock) return;
    const wasActive = _active;
    if (_sock && _sock.connected) { try { _sock.emit('pub:leave'); } catch (e) {} }
    _teardownSocket();
    _active = false;
    _connecting = false;
    window._pubHubActive = false;
    window._pubFollowCam = false;
    window._pubRoomCam = false;
    _code = ''; _private = false; _host = -1; _joinOpts = null;
    const me = _me();
    if (me && me._pubTeamSet) { delete me._teamId; me._pubTeamSet = false; }
    if (window.FriendsManager) FriendsManager.setLobby(null);
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
    for (const k of Object.keys(_emotes)) delete _emotes[k];
    _roster = {};
    _world = null;
    _stage = null;
    _round = null;
    _setupDone = false;
    _myVote = null;
  }

  // Server messages
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
    _code = w.code || '';
    _private = !!w.private;
    _host = w.host !== undefined ? w.host : -1;
    // A dropped connection must come back to THIS lobby, not any public one.
    if (_code) _joinOpts = { code: _code };
    if (window.FriendsManager) FriendsManager.setLobby({ code: _code, label: _label });
    _roster = {};
    for (const r of (w.roster || [])) _roster[r.slot] = { name: r.name, color: r.color, fc: r.fc };
    // A first-time visitor's friend code may not have existed when the join went out.
    if (_roster[_slot] && !_roster[_slot].fc) setFriendCode(_myFriendCode());
    if (!rejoin) _saved = { infiniteMode: typeof infiniteMode !== 'undefined' ? infiniteMode : false };
    _onPhase(w.phase, true);
    // Back in after a drop, still in the same kind of match: keep playing, and
    // if the bots are now ours, bring them back.
    if (rejoin && _setupDone && _def().bots && _isAuth()) _balanceBots();
    if (rejoin) { _toast('Reconnected'); return; }
    if (typeof NetworkManager !== 'undefined' && NetworkManager.clearChat) NetworkManager.clearChat();
    _toast(_private
      ? 'Private lobby ' + _code + ' — share the link to bring friends in'
      : 'Joined ' + _label + ' — ' + Object.keys(_roster).length + '/' + _max + ' players', _private ? 5000 : 2600);
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
    for (const r of (m.roster || [])) _roster[r.slot] = { name: r.name, color: r.color, fc: r.fc };
    if (m.authority !== undefined) _setAuthority(m.authority);
    if (m.options && _phase) { _phase.options = m.options; _renderVote(); }
    if (m.host !== undefined && m.host !== _host) {
      const had = _host >= 0;
      _host = m.host;
      if (had && _host >= 0) _toast(_host === _slot ? 'You are the host now — you start the rounds' : _nameOf(_host) + ' is the host now', 3600);
    }
    // Puppets for anyone we have not built yet appear on their first state packet.
    _renderHud();
    if (_def().bots && _isAuth()) _balanceBots();
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
    if (_def().bots) _balanceBots();
    if (_stage === 'horde') { _hordeWave = Math.max(_hordeWave, (_round && _round.wave) || 0); _hordeGap = 120; }
    // Sports: the ball state we were mirroring becomes the simulation.
    if (_isSport() && _world && typeof sportsBalls !== 'undefined') {
      _applySoccerSnapshot(_world, true);
    }
  }

  const _phaseLog = [];        // recent transitions, for the console: PubHub.phaseLog
  function _onPhase(p, fromWelcome) {
    if (!p) return;
    _phaseLog.push(new Date().toISOString().slice(11, 19) + ' ' + p.phase + '/' + p.mode + (p.result ? ' ' + JSON.stringify(p.result) : ''));
    if (_phaseLog.length > 20) _phaseLog.shift();
    _phase = p;
    if (p.round) _round = p.round;
    _skew = (p.serverNow || Date.now()) - Date.now();
    if (p.phase !== 'vote') _myVote = null;
    const want = (p.phase === 'round' || p.phase === 'results') && STAGES[p.mode] ? p.mode : (_private ? 'room' : 'hub');
    if (want !== _stage) _startStage(want);
    else if (STAGES[want].sport && p.teams) _applyTeams();
    if (p.phase === 'results' && !fromWelcome) _showResults(p);
    _renderHud();
    _renderVote();
  }

  // Local match lifecycle
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
    const def = _def();
    window._pubFollowCam = !!def.follow;
    window._pubRoomCam = stage === 'room';
    _hordeWave = 0; _hordeGap = 150; _hordeDone = false;
    if (def.sport) {
      gameMode = 'minigames';
      if (typeof minigameType !== 'undefined') minigameType = 'sports';
      if (typeof selectSport === 'function') selectSport(def.sport);
      else if (typeof sportsType !== 'undefined') sportsType = def.sport;
    } else {
      gameMode = '2p';
      if (typeof selectedArena !== 'undefined') selectedArena = def.arena;
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
    me._pubDead = false;
    if (_def().follow) {
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
    if (_def().bots && _isAuth()) _balanceBots();
    for (const slot of Object.keys(_buf)) _ensurePuppet(+slot);
    if (_inRound()) _onRoundStart();
    if (_isSport()) {
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
    // Touch: the movement buttons own the bottom-left corner.
    const mc = document.getElementById('mobileControls');
    const touch = (mc && mc.classList.contains('active')) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    el.style.bottom = inLobby ? (touch ? '100px' : '16px') : 'auto';
    const log = document.getElementById('chatMessages');
    if (log) log.style.height = (inLobby && touch) ? '46px' : '120px';
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

  // Puppets (other players)
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
    if (_isSport() && _phase && _phase.teams && _phase.teams[slot] !== undefined) f._sportsTeam = _phase.teams[slot];
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

  // Another human's projectile snapshot (NetProj): shown as visual-only ghosts on their puppet.
  function _onProj(m) {
    if (!_active || !m || m.slot === _slot || !Array.isArray(m.p) || m.p.length > 16) return;
    const f = _puppets[m.slot];
    if (f && typeof NetProj !== 'undefined') NetProj.apply('h' + m.slot, f, m.p);
  }

  function _onState(m) {
    if (!_active || !m || m.slot === _slot || !m.s) return;
    _buf[m.slot] = _buf[m.slot] || [];
    _push(_buf[m.slot], m.s);
    if (_setupDone) _ensurePuppet(m.slot);
  }

  // Bots
  function _humanCount() { return Object.keys(_roster).length || 1; }

  function _balanceBots() {
    if (!_isAuth() || !_def().bots || !_setupDone) return;
    const want = Math.max(BOT_MIN, BOT_TARGET - _humanCount());
    const ids = Object.keys(_bots);
    for (let i = ids.length; i < want; i++) _spawnBot();
    for (let i = ids.length; i > want; i--) _removeBot(ids[i - 1]);
  }

  // opts (Horde waves): { diff, name, hpMul }
  function _spawnBot(opts) {
    opts = opts || {};
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
      weapons[Math.floor(Math.random() * weapons.length)], {}, true, opts.diff || (Math.random() < 0.5 ? 'easy' : 'medium'));
    if (classes.length && typeof applyClass === 'function') applyClass(b, classes[Math.floor(Math.random() * classes.length)]);
    if (opts.hpMul) { b.maxHealth = Math.round(b.maxHealth * opts.hpMul); b.health = b.maxHealth; }
    b.name = opts.name || 'BOT';
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
    delete s.hat; delete s.cape; delete s.ab; delete s.su;
    if (s.n === 'BOT') delete s.n;
    return s;
  }

  function _onWorld(w) {
    if (!_active || _isAuth() || !w) return;
    if (Array.isArray(w.bots) && _hasBots() && _setupDone) {
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
    if (w.soccer && _isSport()) { _world = w.soccer; _worldFresh = true; }
  }

  // Hits
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
    const dmg = Number(h.dmg) || 0, kb = Number(h.kb) || 0;
    _netInboundHit = { dmg, kb };
    try { dealDamage(attacker, victim, dmg, kb); }
    finally { _netInboundHit = null; }
  }

  function _onEvent(ev) {
    if (!_active || !ev) return;
    if (ev.type === 'goal') {
    }
    if (ev.type === 'infected') {
      const who = ev.slot === _slot ? 'You are' : ((_roster[ev.slot] && _roster[ev.slot].name) || 'A player') + ' is';
      _toast(who + ' infected', 2200);
    }
  }

  // Rounds
  function _slotOf(f) {
    if (!f) return null;
    if (f === _me()) return _slot;
    if (f._pubRemote && f._pubBotId === undefined && f._pubSlot !== undefined) return f._pubSlot;
    return null;
  }

  // Who landed the last hit on `f`, as the server names them: a slot number,
  // a bot id, or null (a fall, a hazard, or too long ago to count).
  function _killerOf(f) {
    const a = f && f._lastAttacker;
    if (!a || a === f) return null;
    if (typeof frameCount !== 'undefined' && frameCount - (f._lastAttackerFrame || 0) > 600) return null;
    const who = a.owner && a.owner !== a ? a.owner : a;
    if (who._pubBotId) return who._pubBotId;
    return _slotOf(who);
  }

  function _reportKill(victim) {
    if (!_sock || !_sock.connected) return;
    const ev = { type: 'kill', by: _killerOf(victim) };
    if (victim._pubBotId) ev.bot = victim._pubBotId;
    _sock.emit('pub:event', ev);
  }

  function _rerollLoadout(me) {
    if (typeof resolveWeaponAndClassValues !== 'function' || typeof WEAPONS === 'undefined') return;
    const roll = resolveWeaponAndClassValues('random', 'random');
    if (!roll || !WEAPONS[roll.weaponKey]) return;
    me.weaponKey = roll.weaponKey;
    me.weapon = WEAPONS[roll.weaponKey];
    me._ammo = 0;
    if (typeof applyClass === 'function' && typeof CLASSES !== 'undefined' && CLASSES[roll.classKey] && roll.classKey !== 'megaknight') applyClass(me, roll.classKey);
    const cn = (typeof CLASSES !== 'undefined' && CLASSES[me.charClass]) ? CLASSES[me.charClass].name + ' + ' : '';
    _toast('New loadout: ' + cn + (me.weapon.name || roll.weaponKey), 2000);
  }

  function _onRoundStart() {
    const me = _me();
    if (!me) return;
    me._lastAttacker = null;
    if (_stage === 'scramble') _rerollLoadout(me);
    if (_stage === 'tag') _toast('One player is infected. A hit from them spreads it — stay clean until the clock runs out', 5000);
    if (_stage === 'room') return;
    if (_stage === 'koth') _toast('Stand on the hill alone to score. First to hold it for 30 seconds wins', 5000);
    if (_stage === 'horde') _toast('Same team. Clear five waves — every fall costs the team a life', 5000);
    if (_stage === 'scramble') _toast('First to 10 KOs. You get a new weapon and class every life', 5000);
  }

  // Sides for rounds that have them. Fighters sharing a _teamId cannot hurt
  // each other (areAlliedEntities) and bots will not target their own side.
  function _teamFor(f, isBot) {
    if (_stage === 'horde') return isBot ? 'pubHorde' : 'pubCrew';
    if (_stage === 'tag' && _round && _round.infected && !isBot) {
      return _round.infected.indexOf(_slotOf(f)) >= 0 ? 'pubInfected' : 'pubClean';
    }
    return undefined;
  }

  function _stampTeam(f, isBot) {
    const t = _teamFor(f, isBot);
    if (t === undefined) {
      if (f._pubTeamSet) { delete f._teamId; f._pubTeamSet = false; }
    } else if (f._teamId !== t) {
      f._teamId = t; f._pubTeamSet = true;
    }
  }

  function _isInfected(slot) {
    return !!(_stage === 'tag' && _round && _round.infected && _round.infected.indexOf(slot) >= 0);
  }

  // King of the Hill: the hill is the middle of the arena floor.
  function _kothZone() {
    const plats = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
    const fl = plats.find(q => q && q.isFloor);
    return fl ? { x: fl.x + fl.w / 2, y: fl.y } : { x: GAME_W / 2, y: 460 };
  }

  function _onHill(f, z) {
    return f && f.health > 0 && Math.abs(f.cx() - z.x) <= KOTH_HALF_W && f.y + f.h >= z.y - 150 && f.y + f.h <= z.y + 12;
  }

  function _kothTick() {
    const z = _kothZone();
    const holders = [];
    const me = _me();
    if (_onHill(me, z)) holders.push(_slot);
    for (const slot of Object.keys(_puppets)) if (_onHill(_puppets[slot], z)) holders.push(+slot);
    if (holders.length === 1) _sock.emit('pub:event', { type: 'kothTick', holder: holders[0] });
  }

  // Horde Defense: the authority sends five waves, each bigger and harder.
  function _hordeTick() {
    if (_hordeDone || !_inRound()) return;
    _hordeWave = Math.max(_hordeWave, (_round && _round.wave) || 0);
    if (Object.keys(_bots).length) { _hordeGap = 150; return; }
    if (--_hordeGap > 0) return;
    const waves = (_round && _round.waves) || 5;
    if (_hordeWave >= waves) {
      _hordeDone = true;
      _sock.emit('pub:event', { type: 'roundOver' });
      return;
    }
    _hordeWave++;
    _sock.emit('pub:event', { type: 'wave', n: _hordeWave });
    const n = Math.min(8, 2 + _hordeWave + Math.floor(_humanCount() / 2));
    const diff = _hordeWave <= 2 ? 'easy' : (_hordeWave <= 4 ? 'medium' : 'hard');
    for (let i = 0; i < n; i++) _spawnBot({ diff, name: 'RAIDER' });
    if (_hordeWave === waves) _spawnBot({ diff: 'hard', name: 'WARLORD', hpMul: 2.5 });
    _hordeGap = 150;
  }

  // Waiting room (private lobbies)
  // One pad per game along the arena floor. Standing on a pad is your pick.
  function _pads() {
    if (_stage !== 'room' || !_phase) return [];
    const plats = (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
    const fl = plats.find(q => q && q.isFloor);
    if (!fl) return [];
    const opts = (_phase.options || []).filter(o => o.key !== 'hub' && o.reason !== 'Coming soon');
    if (!opts.length) return [];
    const left = Math.max(fl.x, 0) + 24, right = Math.min(fl.x + fl.w, GAME_W) - 24;
    const w = (right - left) / opts.length;
    return opts.map((o, i) => ({ key: o.key, label: o.label, enabled: o.enabled, reason: o.reason, x: left + i * w + 5, w: w - 10, y: fl.y }));
  }

  function _padUnder(f) {
    if (!f || f.health <= 0) return null;
    const feet = f.y + f.h;
    for (const p of _pads()) {
      if (p.enabled && f.cx() >= p.x && f.cx() <= p.x + p.w && feet >= p.y - 24 && feet <= p.y + 12) return p.key;
    }
    return null;
  }

  // The game the host's Start would launch right now: most players, the host's
  // own pad breaking a tie (the server decides the same way).
  function _leadingPad() {
    const t = (_phase && _phase.votes) || {};
    let best = null, n = 0, tied = false;
    for (const k of Object.keys(t)) {
      if (t[k] > n) { best = k; n = t[k]; tied = false; } else if (t[k] === n && n > 0) tied = true;
    }
    if (tied) {
      const hostPad = _host === _slot ? _myVote : _padUnder(_puppets[_host]);
      if (hostPad && t[hostPad] === n) return hostPad;
    }
    return n > 0 ? best : null;
  }

  function _padTick() {
    const key = _padUnder(_me());
    if (key === _myVote) return;
    _myVote = key;
    if (_sock && _sock.connected) _sock.emit('pub:vote', key);
  }

  function start() {
    if (_active && _sock && _private && _host === _slot) _sock.emit('pub:start');
  }

  function _drawRoom() {
    const pads = _pads();
    const tally = (_phase && _phase.votes) || {};
    const lead = _leadingPad();
    ctx.textAlign = 'center';
    for (const p of pads) {
      const n = tally[p.key] || 0;
      const mine = _myVote === p.key, top = lead === p.key;
      const rgb = !p.enabled ? '120,130,150' : top ? '255,209,102' : '110,160,255';
      const g = ctx.createLinearGradient(0, p.y - 110, 0, p.y);
      g.addColorStop(0, 'rgba(' + rgb + ',0)');
      g.addColorStop(1, 'rgba(' + rgb + ',' + (mine || top ? 0.26 : 0.10) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(p.x, p.y - 110, p.w, 110);
      ctx.fillStyle = 'rgba(' + rgb + ',' + (p.enabled ? 0.9 : 0.4) + ')';
      ctx.fillRect(p.x, p.y - 4, p.w, 4);
      ctx.font = 'bold 12px Rajdhani, sans-serif';
      ctx.fillStyle = p.enabled ? (top ? '#ffd166' : '#dfe6ff') : 'rgba(200,205,220,0.55)';
      const words = p.label.split(' ');
      // Long names wrap onto two lines so six pads fit across the floor.
      const lines = (ctx.measureText(p.label).width > p.w - 4 && words.length > 1)
        ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [p.label];
      lines.forEach((ln, i) => ctx.fillText(ln, p.x + p.w / 2, p.y - 138 + (i - (lines.length - 1)) * 13));
      ctx.font = 'bold 11px Rajdhani, sans-serif';
      ctx.fillStyle = p.enabled ? (n ? '#ffd166' : 'rgba(223,230,255,0.55)') : 'rgba(200,205,220,0.5)';
      ctx.fillText(p.enabled ? (n ? n + (n === 1 ? ' player' : ' players') : 'stand here') : p.reason, p.x + p.w / 2, p.y - 124);
    }
    // The lobby code, on the wall where everyone in the room can read it.
    if (_code) {
      ctx.font = 'bold 12px Rajdhani, sans-serif';
      ctx.fillStyle = 'rgba(223,230,255,0.7)';
      ctx.fillText('LOBBY CODE', GAME_W / 2, 150);
      ctx.font = 'bold 30px Rajdhani, sans-serif';
      ctx.fillStyle = '#ffd166';
      ctx.fillText(_code.split('').join(' '), GAME_W / 2, 180);
    }
  }

  function emote(id) {
    if (!_active || !_sock || !_sock.connected || !EMOTES[id]) return;
    _sock.emit('pub:emote', id);
  }

  // Soccer mirroring
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

  // Per-frame
  function tick() {
    if (!_active) return;
    if (!_setupDone) {
      if (typeof gameRunning !== 'undefined' && gameRunning && players && players[0]) _setupLocalMatch();
      else return;
    }
    _frame++;
    const me = _me();
    if (me && me.lives < 50) me.lives = 99;

    // My own KOs and respawns. The edge is detected here rather than in
    // checkDeaths() so every death path (falls, hazards, hits) is counted once.
    if (me) {
      if (me.health <= 0 && !me._pubDead) { me._pubDead = true; _reportKill(me); }
      else if (me.health > 0 && me._pubDead) {
        me._pubDead = false;
        me._lastAttacker = null;
        if (_stage === 'scramble' && _inRound()) _rerollLoadout(me);
      }
      _stampTeam(me, false);
    }
    for (const k of Object.keys(_emotes)) if (--_emotes[k].t <= 0) delete _emotes[k];

    for (const slot of Object.keys(_puppets)) {
      const s = _sample(_buf[slot]);
      if (s) _applyPacked(_puppets[slot], s);
      _stampTeam(_puppets[slot], false);
    }
    for (const id of Object.keys(_bots)) _stampTeam(_bots[id], true);
    if (!_isAuth()) {
      for (const id of Object.keys(_bots)) {
        const s = _sample(_botBuf[id]);
        if (s) _applyPacked(_bots[id], s);
      }
    } else {
      for (const id of Object.keys(_bots)) {
        const b = _bots[id];
        if (b.lives < 50) b.lives = 99;
        if (b.health <= 0) {
          if (!b._pubDead) { b._pubDead = Date.now(); _reportKill(b); }
          // Horde raiders stay down: gone before the 1.1s respawn timer brings
          // them back (wall-clock, so a slow frame rate cannot lose the race).
          else if (_stage === 'horde' && Date.now() - b._pubDead > 700) _removeBot(id);
        } else if (b._pubDead) { b._pubDead = 0; b._lastAttacker = null; }
      }
    }

    if (!_sock || !_sock.connected) return;
    if (me && _frame % STATE_EVERY === 0) _sock.volatile.emit('pub:state', _packState(me));
    if (me && typeof NetProj !== 'undefined') {
      const pl = NetProj.collect(me);
      if (pl) _sock.volatile.emit('pub:proj', pl);
    }
    if (_isAuth() && _frame % WORLD_EVERY === 0) {
      const w = {};
      if (_hasBots()) w.bots = Object.values(_bots).map(_packBot);
      if (_isSport()) w.soccer = _packSoccer();
      _sock.volatile.emit('pub:world', w);
    }
    if (_stage === 'room' && _phase && _phase.phase === 'hub' && _frame % 10 === 0) _padTick();
    if (_isAuth() && _inRound()) {
      // Wall-clock, not frames: a slow machine must not slow the scoring down.
      if (_stage === 'koth' && Date.now() - _kothAt >= 1000) { _kothAt = Date.now(); _kothTick(); }
      if (_stage === 'horde') _hordeTick();
    }
    if (_frame % 30 === 0) _renderHud();
  }

  // World-space, above fighters: name tags so you can tell people apart.
  function drawWorld() {
    if (!_active || typeof ctx === 'undefined') return;
    ctx.save();
    if (_stage === 'koth') _drawHill();
    if (_stage === 'room' && _phase && _phase.phase === 'hub') _drawRoom();
    ctx.font = 'bold 11px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    for (const slot of Object.keys(_puppets)) {
      const f = _puppets[slot];
      if (!f || f.health <= 0) continue;
      const sick = _isInfected(+slot);
      ctx.fillStyle = sick ? 'rgba(20,70,20,0.8)' : 'rgba(0,0,0,0.55)';
      const label = (sick ? '☣ ' : '') + (_private && +slot === _host ? '★ ' : '') + (f.name || ('P' + (+slot + 1)));
      const w = ctx.measureText(label).width + 10;
      ctx.fillRect(f.cx() - w / 2, f.y - 24, w, 14);
      ctx.fillStyle = sick ? '#8dff7a' : '#ffffff';
      ctx.fillText(label, f.cx(), f.y - 13);
    }
    const me = _me();
    if (me && me.health > 0 && _isInfected(_slot)) {
      ctx.fillStyle = 'rgba(20,70,20,0.8)';
      const w = ctx.measureText('☣ INFECTED').width + 10;
      ctx.fillRect(me.cx() - w / 2, me.y - 24, w, 14);
      ctx.fillStyle = '#8dff7a';
      ctx.fillText('☣ INFECTED', me.cx(), me.y - 13);
    }
    for (const k of Object.keys(_emotes)) {
      const f = +k === _slot ? me : _puppets[k];
      if (f && f.health > 0) _drawEmote(f, _emotes[k]);
    }
    ctx.restore();
  }

  function _drawEmote(f, e) {
    const age = EMOTE_FRAMES - e.t;
    const pop = Math.min(1, age / 8);
    const a = Math.min(1, e.t / 20);
    const text = EMOTES[e.id];
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(f.cx(), f.y - 44 - Math.min(10, age * 0.3));
    ctx.scale(pop, pop);
    ctx.font = 'bold 18px Rajdhani, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = Math.max(30, ctx.measureText(text).width + 16);
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -14, w, 28, 9); else ctx.rect(-w / 2, -14, w, 28);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, 13); ctx.lineTo(5, 13); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#10131f';
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  function _drawHill() {
    const z = _kothZone();
    const pulse = 0.5 + 0.5 * Math.sin(_frame * 0.06);
    const g = ctx.createLinearGradient(0, z.y - 150, 0, z.y);
    g.addColorStop(0, 'rgba(255,209,102,0)');
    g.addColorStop(1, 'rgba(255,209,102,' + (0.16 + 0.10 * pulse) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(z.x - KOTH_HALF_W, z.y - 150, KOTH_HALF_W * 2, 150);
    ctx.fillStyle = 'rgba(255,209,102,0.85)';
    ctx.fillRect(z.x - KOTH_HALF_W, z.y - 3, KOTH_HALF_W * 2, 3);
    ctx.font = 'bold 12px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE HILL', z.x, z.y - 156);
  }

  // HUD, vote and results overlays (DOM)
  let _hud = null, _vote = null, _results = null, _emoteBar = null;

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
      #pubResults ol{list-style:none;margin:12px 0 2px;padding:0;min-width:250px;font:600 14px Rajdhani,sans-serif;color:#dfe6ff;text-align:left}
      #pubResults li{display:flex;gap:10px;align-items:center;padding:4px 8px;border-radius:7px}
      #pubResults li.me{background:rgba(255,209,102,.14)}
      #pubResults li b{width:22px;color:#ffd166;text-align:center}
      #pubResults li span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #pubResults li i{font-style:normal;opacity:.75;font-variant-numeric:tabular-nums}
      #pubHud{flex-wrap:wrap;justify-content:center;max-width:94vw}
      #pubHud .ph-code{letter-spacing:1.5px;color:#ffd166}
      #pubHud button.ph-soft{background:rgba(90,130,255,.18);border-color:rgba(130,170,255,.5);color:#cfdcff}
      #pubHud .ph-bad{color:#8dff7a}
      #pubHud button.ph-go{background:#F2762B;border-color:#F2762B;color:#160A02;font-weight:800}
      #pubHud button.ph-go:disabled{opacity:.45;cursor:default}
      #pubEmotes{position:fixed;right:14px;bottom:14px;z-index:60;display:flex;gap:6px}
      #pubEmotes button{min-width:38px;height:34px;padding:0 6px;border-radius:9px;border:1px solid rgba(120,160,255,.3);
        background:rgba(8,10,24,.78);color:#dfe6ff;font:700 14px Rajdhani,"Apple Color Emoji","Segoe UI Emoji",sans-serif;cursor:pointer}
      #mobileControls.active ~ #pubEmotes{bottom:182px}
      #pubEmotes button:hover{border-color:#ffd166}
      #pubEmotes button small{display:block;font:600 9px Rajdhani,sans-serif;opacity:.5;line-height:1}
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
    _emoteBar = document.createElement('div');
    _emoteBar.id = 'pubEmotes';
    _emoteBar.innerHTML = EMOTES.map((t, i) => '<button type="button" data-e="' + i + '" title="Emote (key ' + (i + 1) + ')">' + t + '<small>' + (i + 1) + '</small></button>').join('');
    _emoteBar.style.display = 'none';
    _emoteBar.querySelectorAll('button').forEach(b => { b.onclick = () => { emote(+b.dataset.e); b.blur(); }; });
    document.body.appendChild(_emoteBar);
    // Number keys: vote while a vote is open, emote the rest of the time.
    document.addEventListener('keydown', e => {
      if (!_active || !_phase || e.repeat) return;
      const t = e.target && e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      const n = parseInt(e.key, 10);
      if (!(n >= 1)) return;
      if (_phase.phase === 'vote') {
        const opts = (_phase.options || []).filter(o => o.enabled);
        if (n <= opts.length) vote(opts[n - 1].key);
      } else if (n <= EMOTES.length) {
        emote(n - 1);
      }
    });
  }

  function _hideOverlay() {
    if (_hud) _hud.style.display = 'none';
    if (_vote) _vote.style.display = 'none';
    if (_results) _results.style.display = 'none';
    if (_emoteBar) _emoteBar.style.display = 'none';
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
    if (_phase && _phase.phase === 'hub' && _private) what = 'Waiting room — stand on a pad to pick a game';
    else if (_phase && _phase.phase === 'hub') what = 'Free for all — vote in <span class="ph-timer">' + _fmt(left) + '</span>';
    else if (_phase && _phase.phase === 'vote') what = 'Voting — <span class="ph-timer">' + _fmt(left) + '</span>';
    else if (_phase && _phase.phase === 'round') what = _escape(_def().label) + ' — <span class="ph-timer">' + _fmt(left) + '</span> left';
    else if (_phase && _phase.phase === 'results') what = 'Round over';
    const score = _inRound() ? _scoreLine() : '';
    const inRoom = _private && _phase && _phase.phase === 'hub';
    const amHost = _host === _slot;
    const lead = inRoom ? _leadingPad() : null;
    const leadLabel = lead && STAGES[lead] ? STAGES[lead].label : '';
    _hud.innerHTML = '<span>' + _escape(_label) + ' · ' + n + '/' + _max + '</span><span>' + what + '</span>' +
      (score ? '<span>' + score + '</span>' : '') +
      (_private ? '<button type="button" class="ph-soft" id="pubLinkBtn" title="Copy the invite link">Code <span class="ph-code">' + _escape(_code) + '</span> · Copy link</button>' : '') +
      (inRoom && amHost ? '<button type="button" class="ph-go" id="pubStartBtn"' + (lead ? '' : ' disabled') + '>' + (lead ? 'Start ' + _escape(leadLabel) : 'Start') + '</button>' : '') +
      (inRoom && !amHost ? '<span>' + (lead ? _escape(leadLabel) + ' — w' : 'W') + 'aiting for ' + _escape(_host >= 0 ? _nameOf(_host) : 'the host') + ' to start</span>' : '') +
      '<button type="button" class="ph-soft" id="pubFriendsBtn">Friends</button>' +
      '<button type="button" id="pubLeaveBtn">Leave</button>';
    _hud.style.display = 'flex';
    if (_emoteBar) _emoteBar.style.display = 'flex';
    const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = () => { fn(); b.blur(); }; };
    on('pubLeaveBtn', () => leave());
    on('pubLinkBtn', copyInviteLink);
    on('pubStartBtn', start);
    on('pubFriendsBtn', () => { if (window.FriendsManager) FriendsManager.open(); });
  }

  function _nameOf(slot) {
    return slot === _slot ? 'You' : ((_roster[slot] && _roster[slot].name) || 'Player');
  }

  // One line of live score for the HUD, in the terms of the running round.
  function _scoreLine() {
    const r = _round || {};
    const sc = r.scores || {};
    if (_stage === 'horde') return 'Wave ' + Math.max(1, r.wave || 0) + '/' + (r.waves || 5) + ' · Team lives ' + (r.lives || 0);
    if (_stage === 'tag') {
      const inf = r.infected || [];
      const clean = Object.keys(_roster).length - inf.length;
      return (inf.indexOf(_slot) >= 0 ? '<span class="ph-bad">INFECTED — hit the clean players</span>' : 'CLEAN — do not get hit') + ' · ' + Math.max(0, clean) + ' clean';
    }
    if (_stage === 'scramble' || _stage === 'koth') {
      const unit = _stage === 'koth' ? 's' : ' KOs';
      let lead = null;
      for (const k of Object.keys(sc)) if (lead === null || sc[k] > sc[lead]) lead = k;
      const mine = sc[_slot] || 0;
      const leadTxt = (lead !== null && +lead !== _slot) ? ' · ' + _escape(_nameOf(+lead)) + ' ' + sc[lead] + unit : '';
      return 'You ' + mine + unit + leadTxt + ' · first to ' + (r.target || 0) + unit;
    }
    return '';
  }

  function inviteLink() {
    if (!_code) return '';
    return location.origin + location.pathname + '?lobby=' + encodeURIComponent(_code);
  }

  function copyInviteLink() {
    if (!_code) return;
    const fallback = () => _toast('Lobby code: ' + _code + ' — friends enter it under Online', 6000);
    const done = () => _toast('Invite link copied — send it to your friends', 3200);
    const copy = (url) => {
      if (url && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fallback);
      else fallback();
    };
    // On a portal the page URL is the portal's frame, not something a friend
    // can open: ask the portal for a link that carries the lobby code.
    if (typeof cgSdk !== 'undefined' && cgSdk && typeof cgSdk.lobbyInviteLink === 'function') {
      const viaPortal = cgSdk.lobbyInviteLink(_code);
      if (viaPortal) { Promise.resolve(viaPortal).then(copy, () => copy(inviteLink())); return; }
    }
    copy(inviteLink());
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
    const def = STAGES[p.mode] || {};
    const board = Array.isArray(r.board) ? r.board : [];
    let head = 'Round over', sub = '', won = false;
    if (r.reason === 'win' && def.sport) {
      const myTeam = p.teams ? p.teams[_slot] : undefined;
      head = (r.winner === 0 ? 'BLUE' : 'RED') + ' TEAM WINS';
      won = myTeam === r.winner;
      if (myTeam !== undefined) sub = won ? 'Your team won' : 'Your team lost';
      if (Array.isArray(r.score)) sub += (sub ? ' · ' : '') + r.score[0] + ' – ' + r.score[1];
    } else if (r.reason === 'win' && p.mode === 'tag') {
      const mine = board.find(b => b.slot === _slot);
      head = r.winner === 'infected' ? 'EVERYONE IS INFECTED' : 'THE SURVIVORS HELD OUT';
      won = !!mine && (r.winner === 'infected' ? mine.score > 0 : !mine.infected);
    } else if (r.reason === 'win' && p.mode === 'horde') {
      head = 'HORDE CLEARED'; won = true;
    } else if (r.reason === 'lose') {
      head = 'OVERRUN'; sub = 'The horde got through';
    } else if (r.reason === 'win') {
      won = r.winner === _slot;
      const w = board.find(b => b.slot === r.winner);
      head = won ? 'YOU WIN' : ((w ? w.name : 'Player').toUpperCase() + ' WINS');
    } else if (r.reason === 'time') {
      head = 'TIME';
    } else if (r.reason === 'players') {
      head = 'NOT ENOUGH PLAYERS';
    }
    // Podium: sports are scored by team, so only individual rounds list players.
    let rows = '';
    if (!def.sport && r.reason !== 'players' && board.length) {
      const unit = p.mode === 'koth' ? 's' : '';
      const medal = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
      rows = '<ol>' + board.slice(0, 5).map((b, i) =>
        '<li' + (b.slot === _slot ? ' class="me"' : '') + '><b>' + (medal[i] || (i + 1)) + '</b><span>' + _escape(b.name) + '</span>' +
        '<i>' + (p.mode === 'horde' ? b.kills + (b.kills === 1 ? ' KO' : ' KOs') : p.mode === 'tag' ? (b.infected ? 'infected' : 'clean') : b.score + unit + ' · ' + b.kills + '/' + b.deaths) + '</i></li>').join('') + '</ol>';
    }
    // A finished round pays a little, a win pays more. Not for abandoned rounds.
    let coins = 0;
    if (r.reason === 'win' || r.reason === 'lose' || r.reason === 'time') coins = won ? 25 : 10;
    if (coins && typeof awardCoins === 'function') { awardCoins(coins); if (typeof saveGame === 'function') saveGame(); }
    _results.innerHTML = _escape(head) + (sub ? '<small>' + _escape(sub) + '</small>' : '') + rows +
      (coins ? '<small>+' + coins + ' coins</small>' : '') + '<small>Back to the city in a moment</small>';
    _results.style.display = 'block';
    setTimeout(() => { if (_results) _results.style.display = 'none'; }, 8500);
  }

  function sendChat(text) {
    if (_sock && _sock.connected) _sock.emit('pub:chat', text);
  }

  return {
    join, leave, tick, drawWorld, onDamage, vote, sendChat, emote, start, setFriendCode,
    get host() { return _host; },
    get pads() { return _pads(); },
    sportsFollow, sportsKickoff, sportsWon,
    inviteLink, copyInviteLink,
    serverUrl: _serverUrl, loadIO: _loadIO,
    createPrivate() { return join({ create: 'private' }); },
    isAuthority: _isAuth,
    get code() { return _code; },
    get isPrivate() { return _private; },
    get stage() { return _stage; },
    get round() { return _round; },
    // Lobby-mates, for the Friends panel's "add" buttons.
    get roster() { return Object.keys(_roster).map(k => ({ slot: +k, name: _roster[k].name, fc: _roster[k].fc, me: +k === _slot })); },
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

// A shared invite link (?lobby=CODE) drops the visitor straight into that lobby.
(function () {
  let code = null;
  try { code = new URLSearchParams(location.search).get('lobby'); } catch (e) {}
  if (!code) return;
  window._pubInvitePending = true;   // smb-tutorial.js: do not start the first-run fight
  const go = () => setTimeout(() => {
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    // First-time visitors arrive behind the story prologue; the lobby replaces it.
    for (const id of ['storyModal', 'prologueOverlay']) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
    PubHub.join({ code });
  }, 1200);
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
