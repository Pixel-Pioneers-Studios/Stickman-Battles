'use strict';
// smb-admin-liveops-panel.js — Comprehensive Live-Service Admin Dashboard (F10)
// Depends on: smb-globals.js, smb-state.js, smb-accounts.js,
//             smb-admin-core.js, smb-admin-panels.js, smb-save.js, smb-liveops.js
//
// Open methods: F10 key | /admin console command | AdminDash.toggle()
// Authorized accounts only — silently blocked for non-admins.

(function () {

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  let _panelOpen  = false;
  let _activeTab  = 'dashboard';
  let _pollTimer  = null;
  let _serverState = null;     // last /admin/state response
  let _serverLogs  = [];       // last /admin/logs response
  let _localLogs   = [];       // actions taken this session
  let _logFilter   = '';

  const TABS = ['dashboard', 'liveops', 'players', 'match', 'patch', 'logs'];
  const TAB_LABELS = {
    dashboard: '📊 Dashboard',
    liveops:   '⚡ LiveOps',
    players:   '👥 Players',
    match:     '🎮 Match',
    patch:     '📦 Patch',
    logs:      '📜 Logs',
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVER FETCH HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function _serverBase() {
    return (typeof SERVER_CONFIG !== 'undefined' && SERVER_CONFIG.url)
      ? String(SERVER_CONFIG.url).replace(/\/$/, '') : '';
  }
  async function _apiFetch(method, path, body) {
    const base = _serverBase();
    if (!base) return null;
    try {
      if (window.AdminSession) await AdminSession.ensure();
      const headers = Object.assign({ 'Content-Type': 'application/json' },
        window.AdminSession ? AdminSession.authHeaders() : {});
      const opts = { method, headers };
      if (body !== undefined) opts.body = JSON.stringify(body);
      const res = await fetch(base + path, opts);
      if (res.status === 401 || res.status === 403) {
        if (window.AdminSession) await AdminSession.refresh();
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }

  async function _fetchServerState() {
    const data = await _apiFetch('GET', '/admin/state');
    if (data && data.ok) {
      _serverState = data;
      _refreshDashStats();
    }
  }

  async function _fetchServerLogs() {
    const data = await _apiFetch('GET', '/admin/logs?limit=300');
    if (data && data.ok) {
      _serverLogs = data.logs || [];
      if (_activeTab === 'logs') _refreshLogBox();
    }
  }

  async function _postLiveConfig(delta) {
    const res = await _apiFetch('POST', '/api/live-config', delta);
    if (res && res.ok) {
      _toast('LiveOps updated ✓');
      // Merge into local LiveOps so the game reacts immediately
      if (typeof LiveOps !== 'undefined') {
        LiveOps.apply(Object.assign({}, LiveOps.config, delta,
          delta.events  ? { events:  Object.assign({}, LiveOps.config.events,  delta.events)  } : {},
          delta.balance ? { balance: Object.assign({}, LiveOps.config.balance, delta.balance) } : {}
        ));
      }
      _pushLocalLog('LIVEOPS', 'Config updated: ' + JSON.stringify(delta));
    } else {
      // Server unreachable — apply locally only
      if (typeof LiveOps !== 'undefined') LiveOps.apply(Object.assign({}, LiveOps.config, delta));
      _toast('Server offline — applied locally only', true);
    }
  }

  async function _postPlayerAction(type, accountId, username, value) {
    const byAcct = (window.AccountManager && AccountManager.getActiveAccount) ? AccountManager.getActiveAccount() : null;
    await _apiFetch('POST', '/admin/player-action', {
      type,
      targetAccountId: accountId || null,
      targetUsername:  username  || null,
      value,
      adminBy: byAcct ? byAcct.username : 'admin',
    });
  }

  async function _postBroadcast(message, color, duration) {
    const byAcct = (window.AccountManager && AccountManager.getActiveAccount) ? AccountManager.getActiveAccount() : null;
    await _apiFetch('POST', '/admin/broadcast', {
      message, color: color || '#ffcc66', duration: duration || 6000,
      adminBy: byAcct ? byAcct.username : 'admin',
    });
    // Also display locally for the admin themselves
    if (typeof LiveOps !== 'undefined') LiveOps.notify(message, color || '#ffcc66', duration || 6000);
    _pushLocalLog('ANNOUNCE', message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL LOG
  // ═══════════════════════════════════════════════════════════════════════════

  function _pushLocalLog(level, msg) {
    const entry = { ts: Date.now(), level, msg };
    _localLogs.push(entry);
    if (_localLogs.length > 300) _localLogs.shift();
    const prefix = '[' + level + ']';
    console.log(prefix, msg);
    if (_activeTab === 'logs') _refreshLogBox();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYER ACTIONS (local save mutation + optional server broadcast)
  // ═══════════════════════════════════════════════════════════════════════════

  function _resolveAccount(idOrName) {
    if (!window.AccountManager) return null;
    const all = AccountManager.getAllAccounts ? AccountManager.getAllAccounts() : [];
    // Try exact ID match first
    let acct = all.find(function(a) { return a.id === idOrName; });
    if (!acct) acct = all.find(function(a) { return (a.username || '').toLowerCase() === idOrName.toLowerCase(); });
    return acct || null;
  }

  function _grantCoins(accountId, amount) {
    amount = parseInt(amount, 10) || 0;
    if (!amount) { _toast('Invalid coin amount', true); return; }
    const acct = _adminGetAcct(accountId);
    const label = acct ? acct.username : accountId;
    if (_adminIsActive(accountId)) {
      if (typeof addCoins === 'function') { addCoins(amount); if (typeof saveGame === 'function') saveGame(); }
      else if (typeof playerCoins !== 'undefined') { playerCoins = Math.max(0, playerCoins + amount); }
    } else {
      _adminMutateRawSave(accountId, function(data) {
        data.coins = Math.max(0, (typeof data.coins === 'number' ? data.coins : 0) + amount);
      });
    }
    _pushLocalLog('ADMIN', (amount > 0 ? 'Granted ' : 'Removed ') + Math.abs(amount) + ' coins → ' + label);
    _postPlayerAction('giveCoins', accountId, label, amount);
    _toast((amount > 0 ? '+' : '') + amount + ' ⬡ → ' + label);
  }

  function _grantCosmetic(accountId, cosmeticId) {
    if (!cosmeticId) { _toast('Enter cosmetic ID', true); return; }
    const acct = _adminGetAcct(accountId);
    const label = acct ? acct.username : accountId;
    _adminMutateRawSave(accountId, function(data) {
      if (!Array.isArray(data.cosmetics)) data.cosmetics = [];
      if (!data.cosmetics.includes(cosmeticId)) data.cosmetics.push(cosmeticId);
    });
    if (_adminIsActive(accountId) && typeof saveGame === 'function') saveGame();
    _pushLocalLog('ADMIN', 'Granted cosmetic ' + cosmeticId + ' → ' + label);
    _postPlayerAction('giveCosmetic', accountId, label, cosmeticId);
    _toast('Cosmetic granted: ' + cosmeticId);
  }

  function _removeCosmetic(accountId, cosmeticId) {
    if (!cosmeticId) { _toast('Enter cosmetic ID', true); return; }
    const acct = _adminGetAcct(accountId);
    const label = acct ? acct.username : accountId;
    _adminMutateRawSave(accountId, function(data) {
      if (!Array.isArray(data.cosmetics)) return;
      data.cosmetics = data.cosmetics.filter(function(c) { return c !== cosmeticId; });
    });
    if (_adminIsActive(accountId) && typeof saveGame === 'function') saveGame();
    _pushLocalLog('ADMIN', 'Removed cosmetic ' + cosmeticId + ' ← ' + label);
    _toast('Cosmetic removed: ' + cosmeticId);
  }

  function _unlockSovereign(accountId) {
    _adminMutateRawSave(accountId, function(data) {
      if (!data.unlocks) data.unlocks = {};
      data.unlocks.bossBeaten = true;
    });
    if (_adminIsActive(accountId) && typeof saveGame === 'function') saveGame();
    _pushLocalLog('ADMIN', 'Sovereign fight unlocked → ' + accountId);
    _toast('Sovereign fight unlocked');
  }

  function _unlockTrueForm(accountId) {
    _adminMutateRawSave(accountId, function(data) {
      if (!data.unlocks) data.unlocks = {};
      data.unlocks.bossBeaten = true;
      data.unlocks.trueform = true;
    });
    if (_adminIsActive(accountId)) {
      if (typeof setAccountFlagWithRuntime === 'function') {
        setAccountFlagWithRuntime(['unlocks', 'trueform'], true, function(v) {
          if (typeof unlockedTrueBoss !== 'undefined') unlockedTrueBoss = v;
        });
      }
      if (typeof saveGame === 'function') saveGame();
    }
    _pushLocalLog('ADMIN', 'TrueForm unlocked → ' + accountId);
    _toast('True Form unlocked');
  }

  function _unlockMultiverse(accountId) {
    _adminMutateRawSave(accountId, function(data) {
      if (!data.unlocks) data.unlocks = {};
      data.unlocks.interTravel = true;
      data.unlocks.tfEndingSeen = true;
    });
    if (_adminIsActive(accountId) && typeof saveGame === 'function') saveGame();
    _pushLocalLog('ADMIN', 'Multiverse Arc unlocked → ' + accountId);
    _toast('Multiverse Arc unlocked');
  }

  function _grantParadox(accountId) {
    _adminMutateRawSave(accountId, function(data) {
      if (!data.unlocks) data.unlocks = {};
      data.unlocks.paradoxCompanion = true;
    });
    if (_adminIsActive(accountId) && typeof saveGame === 'function') saveGame();
    _pushLocalLog('ADMIN', 'Paradox Companion granted → ' + accountId);
    _toast('Paradox Companion granted');
  }

  function _getSaveSnapshot(accountId) {
    const acct = _adminGetAcct(accountId);
    if (!acct) return null;
    try {
      const raw = localStorage.getItem(acct.saveKey);
      if (!raw) return null;
      return JSON.parse(decodeURIComponent(escape(atob(raw))));
    } catch (_) { return null; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  function _esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _el(id) { return document.getElementById(id); }
  function _val(id) { return (_el(id) || {}).value || ''; }

  function _btnStyle(color, small) {
    return [
      'background:' + color + '22',
      'border:1px solid ' + color + '88',
      'border-radius:7px',
      'color:' + color,
      'padding:' + (small ? '4px 10px' : '6px 14px'),
      'cursor:pointer',
      'font-size:' + (small ? '0.72rem' : '0.76rem'),
      'font-family:inherit',
      'white-space:nowrap',
      'transition:background 0.15s',
    ].join(';');
  }

  function _inputStyle(extra) {
    return [
      'background:#080818',
      'border:1px solid rgba(100,180,255,0.22)',
      'border-radius:6px',
      'color:#c8d8ff',
      'padding:6px 10px',
      'font-size:0.78rem',
      'outline:none',
      'font-family:inherit',
      extra || '',
    ].join(';');
  }

  function _sectionStyle() {
    return 'background:rgba(14,18,44,0.6);border:1px solid rgba(100,180,255,0.1);border-radius:10px;padding:14px;';
  }

  function _secTitle(label) {
    return '<div style="font-size:0.68rem;color:rgba(160,200,255,0.45);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">' + label + '</div>';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL SHELL (created once, reused)
  // ═══════════════════════════════════════════════════════════════════════════

  function _getOrCreatePanel() {
    let panel = _el('adminLivePanel');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'adminLivePanel';
    panel.style.cssText = [
      'display:none',
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'z-index:999990',
      'flex-direction:column',
      'width:min(820px,96vw)',
      'max-height:90vh',
      'overflow:hidden',
      'background:#070714',
      'border:1px solid rgba(80,140,255,0.35)',
      'border-radius:14px',
      'box-shadow:0 0 80px rgba(40,80,255,0.15)',
      "font-family:'Segoe UI',Arial,sans-serif",
      'color:#c8d8ff',
    ].join(';');

    // ── Header ────────────────────────────────────────────────────────────────
    const hdr = document.createElement('div');
    hdr.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:space-between',
      'padding:11px 18px',
      'background:rgba(20,40,120,0.25)',
      'border-bottom:1px solid rgba(80,140,255,0.18)',
      'flex-shrink:0', 'gap:12px',
    ].join(';');
    hdr.innerHTML = [
      '<div style="display:flex;align-items:center;gap:10px;">',
        '<span style="font-size:1rem;font-weight:800;letter-spacing:2px;color:#7aaaff;">',
          '★ ADMIN CONTROL CENTER',
        '</span>',
        '<span id="alpVersion" style="font-size:0.65rem;color:rgba(122,170,255,0.45);',
          'padding:2px 8px;border:1px solid rgba(80,140,255,0.2);border-radius:4px;"></span>',
      '</div>',
      '<div style="display:flex;align-items:center;gap:10px;">',
        '<span id="alpOnlineTag" style="font-size:0.72rem;color:#44ff88;"></span>',
        '<button onclick="AdminDash.close()" title="Close (F10)"',
          ' style="background:none;border:none;color:#ff7777;font-size:1.15rem;',
          'cursor:pointer;padding:2px 6px;line-height:1;">&#x2715;</button>',
      '</div>',
    ].join('');
    panel.appendChild(hdr);

    // ── Tab bar ───────────────────────────────────────────────────────────────
    const tabBar = document.createElement('div');
    tabBar.id = 'alpTabBar';
    tabBar.style.cssText = [
      'display:flex', 'overflow-x:auto', 'flex-shrink:0',
      'background:rgba(8,10,28,0.8)',
      'border-bottom:1px solid rgba(80,140,255,0.1)',
    ].join(';');
    panel.appendChild(tabBar);

    // ── Command bar ───────────────────────────────────────────────────────────
    const cmdBar = document.createElement('div');
    cmdBar.style.cssText = [
      'display:flex', 'gap:6px', 'padding:6px 12px', 'flex-shrink:0',
      'background:rgba(8,10,25,0.9)',
      'border-bottom:1px solid rgba(80,140,255,0.08)',
      'align-items:center',
    ].join(';');
    cmdBar.innerHTML = [
      '<span style="font-size:0.7rem;color:#3355aa;white-space:nowrap;font-family:monospace;">/</span>',
      '<input id="alpCmdInput" placeholder="admin command... e.g. /givecoins Aarush 500"',
        ' style="' + _inputStyle('flex:1;font-family:monospace;') + '">',
      '<button onclick="AdminDash.runCmd()"',
        ' style="' + _btnStyle('#5577ff') + '">Run ↵</button>',
    ].join('');
    panel.appendChild(cmdBar);
    const cmdInput = cmdBar.querySelector('#alpCmdInput');
    if (cmdInput) cmdInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); AdminDash.runCmd(); }
    });

    // ── Body ──────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.id = 'alpBody';
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';
    panel.appendChild(body);

    document.body.appendChild(panel);
    _buildTabBar();
    return panel;
  }

  function _buildTabBar() {
    const bar = _el('alpTabBar');
    if (!bar) return;
    bar.innerHTML = TABS.map(function(t) {
      return [
        '<button id="alpTab_' + t + '" onclick="AdminDash.tab(\'' + t + '\')"',
          ' style="padding:8px 15px;background:none;border:none;',
          'border-bottom:2px solid transparent;color:rgba(150,190,255,0.4);',
          'cursor:pointer;font-size:0.74rem;white-space:nowrap;',
          'font-family:inherit;transition:color 0.18s,border-color 0.18s;">',
          TAB_LABELS[t],
        '</button>',
      ].join('');
    }).join('');
    _setTabActive(_activeTab);
  }

  function _setTabActive(name) {
    TABS.forEach(function(t) {
      const btn = _el('alpTab_' + t);
      if (!btn) return;
      btn.style.color = t === name ? '#88bbff' : 'rgba(150,190,255,0.4)';
      btn.style.borderBottomColor = t === name ? '#4466ff' : 'transparent';
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB RENDERERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Dashboard ────────────────────────────────────────────────────────────────
  function _renderDashboard() {
    const cfg = (_serverState && _serverState.liveConfig) ||
                (typeof LiveOps !== 'undefined' ? LiveOps.config : {});
    const ev  = cfg.events || {};
    const bal = cfg.balance || {};
    const online = _serverState ? _serverState.onlinePlayers : '—';
    const rooms  = _serverState ? _serverState.activeRooms   : '—';
    const uptime = _serverState ? _fmtUptime(_serverState.uptime) : '—';

    function statCard(label, id, val, color) {
      return [
        '<div style="background:rgba(15,22,55,0.6);border:1px solid rgba(80,140,255,0.1);',
          'border-radius:10px;padding:12px 14px;">',
          '<div style="font-size:0.63rem;color:rgba(150,190,255,0.38);text-transform:uppercase;',
            'letter-spacing:1px;margin-bottom:5px;">' + label + '</div>',
          '<div id="' + id + '" style="font-size:1.12rem;font-weight:700;color:' + color + ';">' + val + '</div>',
        '</div>',
      ].join('');
    }

    function evBadge(label, active, color) {
      return '<span style="padding:3px 10px;border-radius:20px;font-size:0.68rem;border:1px solid ' +
        (active ? color : 'rgba(255,255,255,0.1)') + ';color:' +
        (active ? color : 'rgba(255,255,255,0.22)') + ';">' +
        (active ? '● ' : '○ ') + label + '</span>';
    }

    return [
      '<div style="display:flex;flex-direction:column;gap:14px;">',

      // Stat cards
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;">',
        statCard('Online Players', 'alpStatOnline', online, '#44ff88'),
        statCard('Active Rooms',   'alpStatRooms',  rooms,  '#88aaff'),
        statCard('Uptime',         'alpStatUptime', uptime, '#ffcc55'),
        statCard('Version',        'alpStatVer',    _esc(cfg.latestVersion || '?'), '#88ccff'),
        statCard('Coin Mult',      'alpStatCoin',   (cfg.coinMultiplier || 1) + 'x', '#ffdd44'),
        statCard('XP Mult',        'alpStatXP',     (cfg.xpMultiplier   || 1) + 'x', '#88ff99'),
        statCard('Dmg Mult',       'alpStatDmg',    (bal.playerDamageMult || 1) + 'x', '#ff8866'),
        statCard('Maintenance',    'alpStatMaint',  (cfg.maintenance ? 'ON' : 'OFF'), cfg.maintenance ? '#ff5555' : '#44aa55'),
      '</div>',

      // MOTD display
      '<div style="' + _sectionStyle() + '">',
        _secTitle('📢 Current MOTD'),
        '<div style="font-size:0.82rem;color:#ffddaa;">' + _esc(cfg.motd || '(none)') + '</div>',
      '</div>',

      // Event status badges
      '<div style="' + _sectionStyle() + '">',
        _secTitle('🎯 Live Events & Status'),
        '<div style="display:flex;flex-wrap:wrap;gap:8px;">',
          evBadge('Double Coins', !!ev.doubleCoins, '#ffdd44'),
          evBadge('Blood Moon',   !!ev.bloodMoon,   '#ff4444'),
          evBadge('XP Weekend',   !!ev.xpWeekend,   '#88ff99'),
          evBadge('Boss Rush',    !!ev.bossRush,     '#ff8844'),
          evBadge('Rare Skin Sale', !!ev.rareSkinSale, '#cc88ff'),
          evBadge('Matchmaking',  !cfg.matchmakingLocked, '#44ff88'),
          evBadge('PvP Enabled',  !cfg.pvpLocked,    '#44aaff'),
        '</div>',
      '</div>',

      '</div>',
    ].join('');
  }

  function _refreshDashStats() {
    if (!_serverState) return;
    const cfg = _serverState.liveConfig || {};
    const bal = cfg.balance || {};
    const s = function(id, v) { const el = _el(id); if (el) el.textContent = v; };
    s('alpStatOnline', _serverState.onlinePlayers);
    s('alpStatRooms',  _serverState.activeRooms);
    s('alpStatUptime', _fmtUptime(_serverState.uptime));
    s('alpStatVer',    cfg.latestVersion || '?');
    s('alpStatCoin',   (cfg.coinMultiplier || 1) + 'x');
    s('alpStatXP',     (cfg.xpMultiplier   || 1) + 'x');
    s('alpStatDmg',    (bal.playerDamageMult || 1) + 'x');
    s('alpStatMaint',  cfg.maintenance ? 'ON' : 'OFF');
    const ov = _el('alpOnlineTag');
    if (ov) { ov.textContent = '● ' + _serverState.onlinePlayers + ' online'; }
    const vv = _el('alpVersion');
    if (vv) vv.textContent = 'v' + (cfg.latestVersion || '?');
  }

  function _fmtUptime(sec) {
    if (!sec) return '0s';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + s + 's';
    return s + 's';
  }

  // ── LiveOps ──────────────────────────────────────────────────────────────────
  function _renderLiveOps() {
    const cfg = (_serverState && _serverState.liveConfig) ||
                (typeof LiveOps !== 'undefined' ? LiveOps.config : {});
    const ev  = cfg.events || {};
    const bal = cfg.balance || {};

    function toggle(label, id, checked, onchange) {
      return [
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;',
          'padding:6px 10px;background:rgba(255,255,255,0.025);border-radius:7px;',
          'font-size:0.77rem;color:#b0c8f0;">',
          '<input type="checkbox" id="' + id + '" ' + (checked ? 'checked' : '') +
            ' onchange="' + _esc(onchange) + '"',
            ' style="width:15px;height:15px;cursor:pointer;accent-color:#5588ff;">',
          label,
        '</label>',
      ].join('');
    }

    function slider(label, id, val, min, max, step, onchange) {
      const display = parseFloat(val).toFixed(2);
      return [
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">',
          '<span style="font-size:0.74rem;color:#8899cc;min-width:120px;">' + label + '</span>',
          '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"',
            ' oninput="document.getElementById(\'' + id + '_v\').textContent=parseFloat(this.value).toFixed(2);' + _esc(onchange) + '"',
            ' style="flex:1;accent-color:#5588ff;cursor:pointer;">',
          '<span id="' + id + '_v" style="font-size:0.77rem;color:#88bbff;min-width:38px;text-align:right;">' + display + '</span>',
        '</div>',
      ].join('');
    }

    function presetBtn(label, fn, danger) {
      return '<button onclick="' + _esc(fn) + '" style="' + _btnStyle(danger ? '#ff4444' : '#3355cc') + '">' + label + '</button>';
    }

    return [
      '<div style="display:flex;flex-direction:column;gap:13px;">',

      // ── Event toggles
      '<div style="' + _sectionStyle() + '">',
        _secTitle('🎛️ Live Events'),
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">',
          toggle('Double Coins',     'alpEvDoubleCoins', !!ev.doubleCoins,         "AdminDash.setEvent('doubleCoins',this.checked)"),
          toggle('Blood Moon',       'alpEvBloodMoon',   !!ev.bloodMoon,           "AdminDash.setEvent('bloodMoon',this.checked)"),
          toggle('XP Weekend',       'alpEvXPWeekend',   !!ev.xpWeekend,           "AdminDash.setEvent('xpWeekend',this.checked)"),
          toggle('Boss Rush',        'alpEvBossRush',    !!ev.bossRush,            "AdminDash.setEvent('bossRush',this.checked)"),
          toggle('Rare Skin Sale',   'alpEvRareSale',    !!ev.rareSkinSale,        "AdminDash.setEvent('rareSkinSale',this.checked)"),
          toggle('Maintenance Mode', 'alpEvMaint',       !!cfg.maintenance,        "AdminDash.setMaintenance(this.checked)"),
          toggle('Lock Matchmaking', 'alpEvMMlock',      !!cfg.matchmakingLocked,  "AdminDash.setMatchmaking(!this.checked)"),
          toggle('Lock PvP',         'alpEvPvPlock',     !!cfg.pvpLocked,          "AdminDash.setPvpLock(this.checked)"),
        '</div>',
      '</div>',

      // ── Multiplier sliders
      '<div style="' + _sectionStyle() + '">',
        _secTitle('🎚️ Multipliers'),
        slider('💰 Coin Mult',      'alpSlCoin', cfg.coinMultiplier       || 1, 0.5, 5,   0.25, "AdminDash.setMultiplier('coin',this.value)"),
        slider('✨ XP Mult',         'alpSlXP',   cfg.xpMultiplier         || 1, 0.5, 5,   0.25, "AdminDash.setMultiplier('xp',this.value)"),
        slider('⚔️ Damage Mult',    'alpSlDmg',  bal.playerDamageMult     || 1, 0.1, 3,   0.1,  "AdminDash.setBalance('playerDamageMult',this.value)"),
        slider('❤️ Enemy HP Mult',  'alpSlEHP',  bal.enemyHpMult          || 1, 0.1, 3,   0.1,  "AdminDash.setBalance('enemyHpMult',this.value)"),
      '</div>',

      // ── Quick presets
      '<div style="' + _sectionStyle() + '">',
        _secTitle('⚡ Quick Presets'),
        '<div style="display:flex;flex-wrap:wrap;gap:8px;">',
          presetBtn('⧡ Double Coins Weekend', "AdminDash.applyPreset('doubleCoinsWeekend')"),
          presetBtn('🌑 Blood Moon Night',    "AdminDash.applyPreset('bloodMoon')"),
          presetBtn('💀 Boss Rush Event',     "AdminDash.applyPreset('bossRush')"),
          presetBtn('🏆 Tournament Mode',     "AdminDash.applyPreset('tournament')"),
          presetBtn('🔄 Reset All Events',    "AdminDash.applyPreset('resetAll')", true),
        '</div>',
      '</div>',

      // ── MOTD editor
      '<div style="' + _sectionStyle() + '">',
        _secTitle('📢 Message of the Day'),
        '<div style="display:flex;gap:8px;">',
          '<input id="alpMotd" value="' + _esc(cfg.motd || '') + '"',
            ' placeholder="Enter MOTD (empty to clear)"',
            ' style="' + _inputStyle('flex:1') + '">',
          '<button onclick="AdminDash.setMotd()" style="' + _btnStyle('#5566ff') + '">Set MOTD</button>',
        '</div>',
      '</div>',

      // ── Broadcast
      '<div style="' + _sectionStyle() + '">',
        _secTitle('📣 Broadcast Announcement'),
        '<div style="display:flex;gap:8px;">',
          '<input id="alpAnnounce" placeholder="Announcement for all players..."',
            ' style="' + _inputStyle('flex:1') + '">',
          '<button onclick="AdminDash.broadcast()" style="' + _btnStyle('#ffaa44') + '">📣 Send</button>',
        '</div>',
      '</div>',

      // ── Shop rotation
      '<div style="' + _sectionStyle() + '">',
        _secTitle('🏪 Shop Rotation (comma-separated cosmetic IDs)'),
        '<div style="display:flex;gap:8px;">',
          '<input id="alpShop" value="' + _esc((cfg.shopRotation || []).join(', ')) + '"',
            ' placeholder="skin_void, skin_neon, wskin_void"',
            ' style="' + _inputStyle('flex:1') + '">',
          '<button onclick="AdminDash.setShop()" style="' + _btnStyle('#5566ff') + '">Update Shop</button>',
        '</div>',
      '</div>',

      '</div>',
    ].join('');
  }

  // ── Players ──────────────────────────────────────────────────────────────────
  function _renderPlayers() {
    const allAccts = (window.AccountManager && AccountManager.getAllAccounts) ? AccountManager.getAllAccounts() : [];
    const activeId = (window.AccountManager && AccountManager.getActiveAccount) ? (AccountManager.getActiveAccount() || {}).id : '';
    const opts = allAccts.map(function(a) {
      return '<option value="' + _esc(a.id) + '">' + _esc(a.username || a.id) +
             (a.id === activeId ? ' (active)' : '') + '</option>';
    }).join('');

    const roster = (window.NetworkManager && typeof NetworkManager.getPeerRoster === 'function')
      ? NetworkManager.getPeerRoster() : [];
    const rosterHtml = roster.length ? roster.map(function(p) {
      const slotTarget = 'slot:' + p.slot;
      return [
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;',
          'background:rgba(40,180,80,0.05);border:1px solid rgba(40,180,80,0.15);border-radius:8px;margin-bottom:5px;">',
          '<div>',
            '<div style="font-size:0.77rem;color:#77ee99;font-weight:600;">' + _esc(p.username || 'Unknown') +
              ' <span style="color:rgba(119,238,153,0.45);font-weight:400;">(Slot ' + p.slot + ')</span></div>',
            '<div style="font-size:0.63rem;color:rgba(119,238,153,0.35);">acct: ' + _esc(p.accountId || '—') + '</div>',
          '</div>',
          '<div style="display:flex;gap:5px;">',
            '<button onclick="_adminPanelKickTarget(\'' + _esc(slotTarget) + '\')" style="' + _btnStyle('#ff6666', true) + '">Kick</button>',
            '<button onclick="_adminPanelBanTarget(\'' + _esc(slotTarget) + '\',false)" style="' + _btnStyle('#ff3333', true) + '">Ban</button>',
          '</div>',
        '</div>',
      ].join('');
    }).join('')
    : '<div style="font-size:0.72rem;color:rgba(255,255,255,0.2);">No connected peers.</div>';

    return [
      '<div style="display:flex;flex-direction:column;gap:13px;">',

      // Online peers
      '<div style="' + _sectionStyle() + '">',
        _secTitle('🟢 Online Peers (this session)'),
        rosterHtml,
      '</div>',

      // Local account selector
      '<div style="' + _sectionStyle() + '">',
        _secTitle('👤 Local Account Actions'),

        '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">',
          '<span style="font-size:0.74rem;color:#7788aa;white-space:nowrap;">Account:</span>',
          '<select id="alpPlayerSel" style="flex:1;' + _inputStyle() + '">' + opts + '</select>',
          '<button onclick="AdminDash.viewSnapshot()" style="' + _btnStyle('#88aaff', true) + '">👁 Snapshot</button>',
        '</div>',

        // Coins
        '<div style="margin-bottom:10px;">',
          '<div style="font-size:0.68rem;color:rgba(255,220,60,0.45);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Coins ⬡</div>',
          '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">',
            '<button onclick="AdminDash.grantCoins(100)" style="' + _btnStyle('#ffdd44') + '">+100</button>',
            '<button onclick="AdminDash.grantCoins(500)" style="' + _btnStyle('#ffdd44') + '">+500</button>',
            '<button onclick="AdminDash.grantCoins(1000)" style="' + _btnStyle('#ffdd44') + '">+1000</button>',
            '<input id="alpCoinAmt" type="number" value="500" style="width:80px;' + _inputStyle() + '">',
            '<button onclick="AdminDash.grantCoinsCustom()" style="' + _btnStyle('#ffdd44') + '">Grant</button>',
            '<button onclick="AdminDash.removeCoinsCustom()" style="' + _btnStyle('#ff7733') + '">Remove</button>',
          '</div>',
        '</div>',

        // Story
        '<div style="margin-bottom:10px;">',
          '<div style="font-size:0.68rem;color:rgba(100,180,255,0.45);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Story Progress</div>',
          '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">',
            '<input id="alpChapter" type="number" min="0" value="0" style="width:72px;' + _inputStyle() + '">',
            '<button onclick="AdminDash.setChapter()" style="' + _btnStyle('#5566ff') + '">Set Chapter</button>',
            '<button onclick="AdminDash.advanceChapter()" style="' + _btnStyle('#6677ff') + '">+1 Chapter</button>',
            '<button onclick="AdminDash.resetStory()" style="' + _btnStyle('#ff4455') + '">Reset Story</button>',
          '</div>',
        '</div>',

        // Unlocks
        '<div style="margin-bottom:10px;">',
          '<div style="font-size:0.68rem;color:rgba(130,255,130,0.45);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Unlocks</div>',
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">',
            '<button onclick="AdminDash.unlockAll()" style="' + _btnStyle('#44ff88') + '">Unlock All</button>',
            '<button onclick="AdminDash.unlockSovereign()" style="' + _btnStyle('#ff8844') + '">Sovereign Fight</button>',
            '<button onclick="AdminDash.unlockTrueForm()" style="' + _btnStyle('#ff44aa') + '">True Form</button>',
            '<button onclick="AdminDash.unlockMultiverse()" style="' + _btnStyle('#aa44ff') + '">Multiverse Arc</button>',
            '<button onclick="AdminDash.grantParadox()" style="' + _btnStyle('#44aaff') + '">Paradox Companion</button>',
          '</div>',
        '</div>',

        // Cosmetics
        '<div style="margin-bottom:10px;">',
          '<div style="font-size:0.68rem;color:rgba(200,150,255,0.45);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Cosmetics</div>',
          '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">',
            '<input id="alpCosmeticId" placeholder="skin_void / wskin_fire / skin_neon..." style="flex:1;min-width:160px;' + _inputStyle() + '">',
            '<button onclick="AdminDash.grantCosmetic()" style="' + _btnStyle('#aa77ff') + '">Grant</button>',
            '<button onclick="AdminDash.removeCosmetic()" style="' + _btnStyle('#ff5555') + '">Remove</button>',
          '</div>',
        '</div>',

        // Danger zone
        '<div style="border-top:1px solid rgba(255,60,60,0.12);padding-top:10px;margin-top:4px;">',
          '<div style="font-size:0.68rem;color:rgba(255,90,90,0.38);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">⚠ Danger Zone</div>',
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">',
            '<button onclick="AdminDash.resetAccount()" style="' + _btnStyle('#ff3333') + '">Reset Account Save</button>',
            '<button onclick="AdminDash.forceLogout()" style="' + _btnStyle('#ff6633') + '">Force Logout / Kick</button>',
          '</div>',
        '</div>',

      '</div>',

      // Save snapshot viewer
      '<div id="alpSnapshotBox" style="display:none;' + _sectionStyle() + '">',
        _secTitle('🗄️ Save Snapshot'),
        '<pre id="alpSnapshotContent" style="font-size:0.68rem;color:#aabbd8;line-height:1.65;',
          'max-height:220px;overflow-y:auto;margin:0;white-space:pre-wrap;word-break:break-all;"></pre>',
      '</div>',

      '</div>',
    ].join('');
  }

  // ── Match Controls ───────────────────────────────────────────────────────────
  function _renderMatch() {
    return [
      '<div style="display:flex;flex-direction:column;gap:13px;">',

      '<div style="' + _sectionStyle() + '">',
        _secTitle('🔁 Matchmaking'),
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">',
          '<button onclick="AdminDash.setMatchmaking(true)"  style="' + _btnStyle('#44ff88') + '">✅ Enable Matchmaking</button>',
          '<button onclick="AdminDash.setMatchmaking(false)" style="' + _btnStyle('#ff4444') + '">🚫 Disable Matchmaking</button>',
          '<button onclick="AdminDash.setPvpLock(false)" style="' + _btnStyle('#44aaff') + '">🔓 Unlock PvP</button>',
          '<button onclick="AdminDash.setPvpLock(true)"  style="' + _btnStyle('#ff6633') + '">🔒 Lock PvP</button>',
        '</div>',
      '</div>',

      '<div style="' + _sectionStyle() + '">',
        _secTitle('⛔ Match Management'),
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">',
          '<button onclick="AdminDash.endAllMatches()" style="' + _btnStyle('#ff5533') + '">🔚 End All Matches</button>',
          '<button onclick="AdminDash.restartMatchmaking()" style="' + _btnStyle('#5566ff') + '">🔄 Restart Matchmaking</button>',
        '</div>',
        '<div style="font-size:0.68rem;color:rgba(255,255,255,0.22);">',
          'End All Matches broadcasts a force-disconnect event to all relay rooms.',
        '</div>',
      '</div>',

      '<div style="' + _sectionStyle() + '">',
        _secTitle('🚪 Join Any Lobby (admin bypass)'),
        '<div style="display:flex;gap:8px;">',
          '<input id="alpLobbyCode" placeholder="Lobby code..." maxlength="20"',
            ' style="flex:1;' + _inputStyle() + ';text-transform:uppercase;">',
          '<button onclick="AdminDash.joinLobby()" style="' + _btnStyle('#5566ff') + '">Join</button>',
        '</div>',
      '</div>',

      '</div>',
    ].join('');
  }

  // ── Patch Controls ───────────────────────────────────────────────────────────
  function _renderPatch() {
    const cfg = (_serverState && _serverState.liveConfig) ||
                (typeof LiveOps !== 'undefined' ? LiveOps.config : {});
    return [
      '<div style="display:flex;flex-direction:column;gap:13px;">',

      '<div style="' + _sectionStyle() + '">',
        _secTitle('🏷️ Version Control'),
        '<div style="display:flex;flex-direction:column;gap:7px;">',
          '<div style="display:flex;gap:8px;align-items:center;">',
            '<span style="font-size:0.74rem;color:#7788aa;min-width:130px;">Latest Version:</span>',
            '<input id="alpVerLatest" value="' + _esc(cfg.latestVersion || '') + '"',
              ' style="flex:1;' + _inputStyle() + '">',
          '</div>',
          '<div style="display:flex;gap:8px;align-items:center;">',
            '<span style="font-size:0.74rem;color:#7788aa;min-width:130px;">Min Supported:</span>',
            '<input id="alpVerMin" value="' + _esc(cfg.minSupportedVersion || '') + '"',
              ' style="flex:1;' + _inputStyle() + '">',
          '</div>',
          '<button onclick="AdminDash.setVersions()" style="' + _btnStyle('#5566ff') + ';width:fit-content;">Update Versions</button>',
        '</div>',
      '</div>',

      '<div style="' + _sectionStyle() + '">',
        _secTitle('🔔 Patch Notification'),
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">',
          '<button onclick="AdminDash.notifyUpdate(false)" style="' + _btnStyle('#ffaa44') + '">📢 Notify Update Available</button>',
          '<button onclick="AdminDash.notifyUpdate(true)"  style="' + _btnStyle('#ff3333') + '">🔴 Force Reload Required</button>',
        '</div>',
      '</div>',

      '<div style="' + _sectionStyle() + '">',
        _secTitle('📣 Push Popup Announcement'),
        '<div style="display:flex;flex-direction:column;gap:8px;">',
          '<input id="alpPopupMsg" placeholder="Announcement text shown to all players..."',
            ' style="' + _inputStyle() + '">',
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">',
            '<button onclick="AdminDash.sendPopup()" style="' + _btnStyle('#ffaa44') + '">Send Popup</button>',
            '<button onclick="AdminDash.sendTournamentSignup()" style="' + _btnStyle('#44aaff') + '">🏆 Tournament Signup Open</button>',
            '<button onclick="AdminDash.sendDoubleCoinsSale()"  style="' + _btnStyle('#ffdd44') + '">⧡ Start Double Coins</button>',
          '</div>',
        '</div>',
      '</div>',

      '</div>',
    ].join('');
  }

  // ── Logs ─────────────────────────────────────────────────────────────────────
  function _renderLogs() {
    return [
      '<div style="display:flex;flex-direction:column;gap:10px;">',
        '<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;">',
          '<button onclick="AdminDash.refreshLogs()" style="' + _btnStyle('#5566ff', true) + '">🔄 Refresh</button>',
          '<button onclick="AdminDash.exportLogs()" style="' + _btnStyle('#44aaff', true) + '">⬇ Export</button>',
          '<label style="display:flex;align-items:center;gap:5px;font-size:0.72rem;color:#7788aa;cursor:pointer;">',
            '<input type="checkbox" id="alpLogAuto" checked style="accent-color:#5588ff;">',
            'Auto',
          '</label>',
          '<div style="display:flex;gap:5px;flex-wrap:wrap;">',
            '<button onclick="AdminDash.filterLogs(\'\')" style="' + _btnStyle('#7788aa', true) + '">All</button>',
            '<button onclick="AdminDash.filterLogs(\'ADMIN\')" style="' + _btnStyle('#ffcc44', true) + '">Admin</button>',
            '<button onclick="AdminDash.filterLogs(\'LIVEOPS\')" style="' + _btnStyle('#88bbff', true) + '">LiveOps</button>',
            '<button onclick="AdminDash.filterLogs(\'ANNOUNCE\')" style="' + _btnStyle('#ff8844', true) + '">Announce</button>',
            '<button onclick="AdminDash.filterLogs(\'BAN\')" style="' + _btnStyle('#ff4444', true) + '">Bans</button>',
            '<button onclick="AdminDash.filterLogs(\'SECURITY\')" style="' + _btnStyle('#ff2222', true) + '">Security</button>',
          '</div>',
        '</div>',
        '<div id="alpLogBox" style="height:360px;overflow-y:auto;background:#050510;',
          'border:1px solid rgba(80,140,255,0.1);border-radius:8px;',
          'padding:10px;font-family:monospace;font-size:0.69rem;line-height:1.75;',
          'color:#aabbd8;">',
          '<div style="color:rgba(255,255,255,0.2);">Loading logs...</div>',
        '</div>',
      '</div>',
    ].join('');
  }

  function _refreshLogBox() {
    const box = _el('alpLogBox');
    if (!box) return;

    const LEVEL_COLORS = {
      ADMIN: '#ffcc44', LIVEOPS: '#88bbff', ANNOUNCE: '#ff9944',
      BAN: '#ff5555', SECURITY: '#ff2222', CONNECT: '#44ff88',
      DISCONNECT: '#ff6666', JOIN: '#55dd88', warn: '#ffdd88', error: '#ff5555',
    };

    const combined = _serverLogs.concat(_localLogs).sort(function(a, b) { return a.ts - b.ts; });
    const filtered = _logFilter
      ? combined.filter(function(e) {
          return (e.level || '').toUpperCase().includes(_logFilter.toUpperCase()) ||
                 (e.msg  || '').toLowerCase().includes(_logFilter.toLowerCase());
        })
      : combined;

    if (!filtered.length) {
      box.innerHTML = '<div style="color:rgba(255,255,255,0.2);">No log entries.</div>';
      return;
    }

    box.innerHTML = filtered.slice(-300).map(function(e) {
      const time  = new Date(e.ts).toLocaleTimeString();
      const lvl   = (e.level || 'log').toUpperCase();
      const color = LEVEL_COLORS[lvl] || LEVEL_COLORS[e.level] || '#aabbd8';
      return [
        '<div>',
          '<span style="color:rgba(255,255,255,0.22);">' + time + '</span> ',
          '<span style="color:' + color + ';min-width:80px;display:inline-block;">[' + lvl + ']</span> ',
          '<span>' + _esc(e.msg || '') + '</span>',
        '</div>',
      ].join('');
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL OPEN / CLOSE / RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  function _open() {
    if (!_adminPanelIsAllowed()) {
      _pushLocalLog('SECURITY', 'Unauthorized AdminDash.open() attempt');
      return;
    }
    const panel = _getOrCreatePanel();
    _panelOpen = true;
    panel.style.display = 'flex';
    _render();
    _fetchServerState();
    _startPolling();

    // Update header version/online immediately
    const cfg = (typeof LiveOps !== 'undefined') ? LiveOps.config : {};
    const vv = _el('alpVersion'); if (vv) vv.textContent = 'v' + (cfg.latestVersion || '?');
  }

  function _close() {
    const panel = _el('adminLivePanel');
    if (panel) panel.style.display = 'none';
    _panelOpen = false;
    _stopPolling();
  }

  function _toggle() {
    if (_panelOpen) _close(); else _open();
  }

  function _render() {
    const body = _el('alpBody');
    if (!body) return;
    switch (_activeTab) {
      case 'dashboard': body.innerHTML = _renderDashboard(); break;
      case 'liveops':   body.innerHTML = _renderLiveOps();   break;
      case 'players':   body.innerHTML = _renderPlayers();   break;
      case 'match':     body.innerHTML = _renderMatch();     break;
      case 'patch':     body.innerHTML = _renderPatch();     break;
      case 'logs':
        body.innerHTML = _renderLogs();
        _refreshLogBox();
        _fetchServerLogs();
        break;
    }
  }

  function _switchTab(name) {
    if (!TABS.includes(name)) return;
    _activeTab = name;
    _setTabActive(name);
    _render();
  }

  function _startPolling() {
    _stopPolling();
    _pollTimer = setInterval(function() {
      if (!_panelOpen) return;
      _fetchServerState();
      if (_activeTab === 'logs') {
        const autoEl = _el('alpLogAuto');
        if (!autoEl || autoEl.checked) _fetchServerLogs();
      }
    }, 5000);
  }

  function _stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════════════════════════════════════════

  function _toast(msg, isError) {
    if (typeof _adminToast === 'function') { _adminToast(msg, isError); return; }
    console.log('[AdminDash]', msg);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN COMMAND ROUTER  (/command → dispatched from the command bar or console)
  // ═══════════════════════════════════════════════════════════════════════════

  function _findAccountByName(name) {
    if (!window.AccountManager) return null;
    const all = AccountManager.getAllAccounts ? AccountManager.getAllAccounts() : [];
    return all.find(function(a) { return (a.username || '').toLowerCase() === name.toLowerCase(); }) || null;
  }

  function _cmdExec(raw) {
    if (!raw) return false;
    raw = raw.trim();
    if (!raw.startsWith('/')) return false;

    const parts = raw.slice(1).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    function arg(n) { return args[n] || ''; }
    function argN(n, def) { const v = parseFloat(args[n]); return isFinite(v) ? v : (def !== undefined ? def : 0); }
    function rest(from) { return args.slice(from).join(' '); }

    // /admin and /helpadmin are always accessible
    if (cmd === 'admin')     { _toggle(); return true; }
    if (cmd === 'helpadmin') { console.log('[Admin Help]\n' + _HELP_TEXT); return true; }

    if (!_adminPanelIsAllowed()) {
      _pushLocalLog('SECURITY', 'Unauthorized command attempt: ' + raw);
      return false;
    }

    switch (cmd) {

      // ── Moderation ──────────────────────────────────────────────────────────
      case 'ban': {
        const t = arg(0); if (!t) return true;
        if (typeof adminBanTarget === 'function') adminBanTarget(t, null, rest(1) || 'Banned by admin.', {});
        _pushLocalLog('ADMIN', 'Banned: ' + t);
        return true;
      }
      case 'unban': {
        const t = arg(0); if (!t) return true;
        if (typeof adminUnbanTarget === 'function') adminUnbanTarget(t);
        _pushLocalLog('ADMIN', 'Unbanned: ' + t);
        return true;
      }
      case 'kick': {
        const t = arg(0); if (!t) return true;
        const acct = _findAccountByName(t);
        if (typeof adminKickPlayer === 'function') adminKickPlayer(acct ? acct.id : t);
        _pushLocalLog('ADMIN', 'Kicked: ' + t);
        return true;
      }
      case 'mute':   { _pushLocalLog('ADMIN', 'Muted (local): ' + arg(0)); _toast('Muted: ' + arg(0)); return true; }
      case 'unmute': { _pushLocalLog('ADMIN', 'Unmuted: ' + arg(0)); _toast('Unmuted: ' + arg(0)); return true; }

      // ── Coins / XP ──────────────────────────────────────────────────────────
      case 'givecoins': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _grantCoins(acct.id, argN(1));
        return true;
      }
      case 'removecoins': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _grantCoins(acct.id, -Math.abs(argN(1)));
        return true;
      }
      case 'givexp': {
        // No separate XP system — convert to coins at 10:1
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _grantCoins(acct.id, Math.floor(argN(1) / 10));
        _toast('XP grant applied as coins (÷10)');
        return true;
      }

      // ── Cosmetics ───────────────────────────────────────────────────────────
      case 'giveskin': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _grantCosmetic(acct.id, arg(1));
        return true;
      }
      case 'removeskin': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _removeCosmetic(acct.id, arg(1));
        return true;
      }

      // ── Story ───────────────────────────────────────────────────────────────
      case 'resetstory': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        if (typeof resetAccount === 'function') resetAccount(acct.id);
        _pushLocalLog('ADMIN', 'Story reset: ' + arg(0));
        return true;
      }
      case 'setchapter': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        if (typeof setPlayerChapter === 'function') setPlayerChapter(acct.id, argN(1));
        _pushLocalLog('ADMIN', 'Chapter ' + argN(1) + ' → ' + arg(0));
        return true;
      }

      // ── LiveOps toggles ─────────────────────────────────────────────────────
      case 'event': {
        const on = arg(1).toLowerCase() === 'on';
        const delta = { events: {} }; delta.events[arg(0)] = on;
        _postLiveConfig(delta);
        _pushLocalLog('LIVEOPS', 'Event ' + arg(0) + ' → ' + (on ? 'ON' : 'OFF'));
        return true;
      }
      case 'motd': {
        const text = rest(0);
        _postLiveConfig({ motd: text });
        _pushLocalLog('LIVEOPS', 'MOTD → ' + text);
        return true;
      }
      case 'announce': {
        _postBroadcast(rest(0), '#ffcc66', 7000);
        return true;
      }
      case 'coinmult': {
        _postLiveConfig({ coinMultiplier: argN(0, 1) });
        _pushLocalLog('LIVEOPS', 'Coin mult → ' + argN(0, 1));
        return true;
      }
      case 'xpmult': {
        _postLiveConfig({ xpMultiplier: argN(0, 1) });
        _pushLocalLog('LIVEOPS', 'XP mult → ' + argN(0, 1));
        return true;
      }
      case 'dmgmult': {
        _postLiveConfig({ balance: { playerDamageMult: argN(0, 1) } });
        _pushLocalLog('LIVEOPS', 'Damage mult → ' + argN(0, 1));
        return true;
      }
      case 'enemyhpmult': {
        _postLiveConfig({ balance: { enemyHpMult: argN(0, 1) } });
        _pushLocalLog('LIVEOPS', 'Enemy HP mult → ' + argN(0, 1));
        return true;
      }
      case 'maintenance': {
        const on = arg(0).toLowerCase() === 'on';
        _postLiveConfig({ maintenance: on });
        _pushLocalLog('LIVEOPS', 'Maintenance → ' + (on ? 'ON' : 'OFF'));
        return true;
      }
      case 'reloadrequired': {
        const on = arg(0).toLowerCase() === 'on';
        _postLiveConfig({ reloadRequired: on });
        if (on) _postBroadcast('🔴 Mandatory update required — please reload the page.', '#ff4444', 0);
        _pushLocalLog('LIVEOPS', 'Reload required → ' + (on ? 'ON' : 'OFF'));
        return true;
      }
      case 'minversion': {
        _postLiveConfig({ minSupportedVersion: arg(0) });
        _pushLocalLog('LIVEOPS', 'Min version → ' + arg(0));
        return true;
      }
      case 'shop': {
        // /shop add ITEM  |  /shop remove ITEM
        // Simple: re-read current and push update
        const action = arg(0); const item = arg(1);
        const current = (typeof LiveOps !== 'undefined') ? LiveOps.getShopRot() : [];
        let updated;
        if (action === 'add')    updated = current.includes(item) ? current : current.concat([item]);
        if (action === 'remove') updated = current.filter(function(i) { return i !== item; });
        if (updated) {
          _postLiveConfig({ shopRotation: updated });
          _pushLocalLog('LIVEOPS', 'Shop ' + action + ': ' + item);
        }
        return true;
      }

      // ── Match ───────────────────────────────────────────────────────────────
      case 'endmatches':
        AdminDash.endAllMatches();
        return true;

      // ── Persistence ─────────────────────────────────────────────────────────
      case 'saveall':
        if (typeof saveGame === 'function') saveGame();
        _pushLocalLog('ADMIN', 'Manual save triggered');
        return true;

      // ── Meta ────────────────────────────────────────────────────────────────
      case 'logs':
        _switchTab('logs'); _open();
        return true;

      // ── SMB-specific ────────────────────────────────────────────────────────
      case 'unlocksovereign': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _unlockSovereign(acct.id); return true;
      }
      case 'unlocktrueform': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _unlockTrueForm(acct.id); return true;
      }
      case 'unlockmultiverse': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _unlockMultiverse(acct.id); return true;
      }
      case 'giveparadox': {
        const acct = _findAccountByName(arg(0));
        if (!acct) { console.log('[Admin] User not found: ' + arg(0)); return true; }
        _grantParadox(acct.id); return true;
      }
      case 'spawnboss': {
        _postBroadcast('👿 An event boss has appeared! Get ready!', '#ff4444', 8000);
        _pushLocalLog('ADMIN', 'Boss spawn broadcast: ' + arg(0));
        return true;
      }
      case 'sale': {
        if (arg(0) === 'rareskins') {
          const on = arg(1) === 'on';
          _postLiveConfig({ events: { rareSkinSale: on } });
          _pushLocalLog('LIVEOPS', 'Rare skin sale → ' + (on ? 'ON' : 'OFF'));
        }
        return true;
      }
      case 'tournament': {
        if (arg(0) === 'signup' && arg(1) === 'open') {
          _postBroadcast('🏆 Tournament Signup is now OPEN! Join the Discord to register.', '#ffdd44', 10000);
          _pushLocalLog('ANNOUNCE', 'Tournament signup opened');
        }
        return true;
      }

      default: return false; // Not an admin command
    }
  }

  const _HELP_TEXT = [
    'MODERATION',
    '  /ban USER [reason]      Ban permanently',
    '  /unban USER             Remove ban',
    '  /kick USER              Kick player',
    '  /mute USER              Mute (local session)',
    '  /unmute USER            Unmute',
    '',
    'REWARDS',
    '  /givecoins USER AMT     Grant ⬡ coins',
    '  /removecoins USER AMT   Remove ⬡ coins',
    '  /givexp USER AMT        Grant XP (÷10 → coins)',
    '  /giveskin USER ID       Unlock cosmetic',
    '  /removeskin USER ID     Remove cosmetic',
    '',
    'STORY',
    '  /resetstory USER        Reset story progress',
    '  /setchapter USER #      Set chapter number',
    '',
    'LIVE OPS',
    '  /event NAME on|off      Toggle live event',
    '  /motd MESSAGE           Set MOTD',
    '  /announce MESSAGE       Broadcast to all players',
    '  /coinmult N             Coin multiplier',
    '  /xpmult N               XP multiplier',
    '  /dmgmult N              Damage multiplier',
    '  /enemyhpmult N          Enemy HP multiplier',
    '  /maintenance on|off     Maintenance mode',
    '  /reloadrequired on|off  Force page reload',
    '  /minversion X.Y.Z       Min supported version',
    '  /shop add|remove ID     Shop rotation',
    '',
    'MATCH',
    '  /endmatches             End all active matches',
    '',
    'SMB-SPECIFIC',
    '  /unlocksovereign USER   Sovereign fight',
    '  /unlocktrueform USER    True Form',
    '  /unlockmultiverse USER  Multiverse Arc',
    '  /giveparadox USER       Paradox Companion',
    '  /spawnboss NAME         Event boss broadcast',
    '  /sale rareskins on|off  Rare skin sale',
    '  /tournament signup open Open tournament',
    '',
    'META',
    '  /saveall                Force save',
    '  /logs                   Open log tab',
    '  /helpadmin              This help text',
  ].join('\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API  (window.AdminDash)
  // ═══════════════════════════════════════════════════════════════════════════

  window.AdminDash = {
    toggle: _toggle,
    open:   _open,
    close:  _close,
    tab:    _switchTab,

    runCmd: function() {
      const input = _el('alpCmdInput');
      if (!input) return;
      const raw = input.value.trim();
      if (!raw) return;
      input.value = '';
      // Ensure it starts with / so the router fires
      const cmd = raw.startsWith('/') ? raw : '/' + raw;
      const handled = _cmdExec(cmd);
      if (!handled) {
        // Fall through to game console if open
        if (typeof _consoleExec === 'function') _consoleExec(cmd);
        else console.log('[Admin] Unknown command:', cmd);
      }
    },

    // Logs
    refreshLogs:  function() { _fetchServerLogs(); },
    filterLogs:   function(f) { _logFilter = f; _refreshLogBox(); },
    exportLogs:   function() {
      const all = _serverLogs.concat(_localLogs).sort(function(a, b) { return a.ts - b.ts; });
      const txt = all.map(function(e) {
        return '[' + new Date(e.ts).toISOString() + '] [' + (e.level || '').padEnd(8) + '] ' + (e.msg || '');
      }).join('\n');
      const blob = new Blob([txt], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'smb-admin-' + Date.now() + '.log';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    // LiveOps
    setEvent: async function(key, val) {
      const d = { events: {} }; d.events[key] = !!val;
      await _postLiveConfig(d);
      _pushLocalLog('LIVEOPS', 'Event ' + key + ' → ' + val);
    },
    setMaintenance: async function(on) {
      await _postLiveConfig({ maintenance: !!on });
      _pushLocalLog('LIVEOPS', 'Maintenance → ' + (on ? 'ON' : 'OFF'));
    },
    setMatchmaking: async function(allowed) {
      await _postLiveConfig({ matchmakingLocked: !allowed });
      _pushLocalLog('LIVEOPS', 'Matchmaking → ' + (allowed ? 'enabled' : 'locked'));
    },
    setPvpLock: async function(locked) {
      await _postLiveConfig({ pvpLocked: !!locked });
      _pushLocalLog('LIVEOPS', 'PvP locked → ' + locked);
    },
    setMultiplier: function(type, val) {
      val = parseFloat(val) || 1;
      _postLiveConfig(type === 'coin' ? { coinMultiplier: val } : { xpMultiplier: val });
    },
    setBalance: function(key, val) {
      val = parseFloat(val) || 1;
      _postLiveConfig({ balance: { [key]: val } });
    },
    setMotd: async function() {
      const text = _val('alpMotd').trim();
      await _postLiveConfig({ motd: text });
      _pushLocalLog('LIVEOPS', 'MOTD → ' + (text || '(cleared)'));
    },
    setShop: async function() {
      const items = _val('alpShop').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      await _postLiveConfig({ shopRotation: items });
      _pushLocalLog('LIVEOPS', 'Shop rotation → ' + items.join(', '));
    },
    broadcast: async function() {
      const msg = _val('alpAnnounce').trim();
      if (!msg) { _toast('Enter a message first', true); return; }
      await _postBroadcast(msg, '#ffcc66', 7000);
      const el = _el('alpAnnounce'); if (el) el.value = '';
    },
    applyPreset: async function(name) {
      const PRESETS = {
        doubleCoinsWeekend: { events: { doubleCoins: true }, coinMultiplier: 2 },
        bloodMoon:          { events: { bloodMoon: true } },
        bossRush:           { events: { bossRush: true } },
        tournament:         { events: { doubleCoins: true, xpWeekend: true } },
        resetAll: {
          events: { doubleCoins: false, bloodMoon: false, xpWeekend: false,
                    bossRush: false, rareSkinSale: false },
          coinMultiplier: 1, xpMultiplier: 1,
          maintenance: false, pvpLocked: false, matchmakingLocked: false,
        },
      };
      const cfg = PRESETS[name];
      if (!cfg) return;
      if (name === 'resetAll' && !confirm('Reset all live events and multipliers to defaults?')) return;
      await _postLiveConfig(cfg);
      _pushLocalLog('LIVEOPS', 'Preset applied: ' + name);
      if (_activeTab === 'liveops') _render();
    },

    // Versions
    setVersions: async function() {
      const latest = _val('alpVerLatest');
      const min    = _val('alpVerMin');
      await _postLiveConfig({ latestVersion: latest, minSupportedVersion: min });
      _pushLocalLog('LIVEOPS', 'Versions → latest=' + latest + ' min=' + min);
    },
    notifyUpdate: async function(force) {
      if (force) {
        if (!confirm('Force all players to reload now?')) return;
        await _postLiveConfig({ reloadRequired: true });
        await _postBroadcast('🔴 Mandatory update — reloading in 10 seconds.', '#ff4444', 10000);
        _pushLocalLog('LIVEOPS', 'Force reload triggered');
      } else {
        await _postBroadcast('⬆ Update available — reload anytime for latest fixes!', '#88ccff', 8000);
        _pushLocalLog('LIVEOPS', 'Soft update notification sent');
      }
    },
    sendPopup: async function() {
      const msg = _val('alpPopupMsg').trim();
      if (!msg) { _toast('Enter announcement text', true); return; }
      await _postBroadcast(msg, '#ffaa44', 8000);
      _pushLocalLog('ANNOUNCE', msg);
    },
    sendTournamentSignup: async function() {
      await _postBroadcast('🏆 Tournament Signup is OPEN! Join Discord to register.', '#ffdd44', 10000);
      _pushLocalLog('ANNOUNCE', 'Tournament signup opened');
    },
    sendDoubleCoinsSale: async function() {
      await _postLiveConfig({ events: { doubleCoins: true }, coinMultiplier: 2 });
      await _postBroadcast('⧡ Double Coins is LIVE! Earn 2× in every match!', '#ffdd44', 8000);
      _pushLocalLog('LIVEOPS', 'Double Coins Weekend started');
    },

    // Match controls
    endAllMatches: function() {
      if (!confirm('End all active matches? All rooms will be disconnected.')) return;
      _apiFetch('POST', '/admin/command', { command: 'endAllMatches' }).then(function(r) {
        _pushLocalLog('ADMIN', 'End all matches — rooms affected: ' + (r && r.roomsAffected != null ? r.roomsAffected : '?'));
        _toast('End all matches sent');
      });
    },
    restartMatchmaking: function() {
      _postLiveConfig({ matchmakingLocked: false });
      _pushLocalLog('ADMIN', 'Matchmaking re-enabled');
      _toast('Matchmaking re-enabled');
    },
    joinLobby: function() {
      const code = _val('alpLobbyCode').trim().toUpperCase();
      if (!code) { _toast('Enter a lobby code', true); return; }
      if (typeof adminJoinAnyLobby === 'function') adminJoinAnyLobby(code);
      _pushLocalLog('ADMIN', 'Joined lobby: ' + code);
      _toast('Joining: ' + code);
    },

    // Player actions
    grantCoins: function(amount) {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _grantCoins(id, amount);
    },
    grantCoinsCustom: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _grantCoins(id, parseInt(_val('alpCoinAmt'), 10) || 0);
    },
    removeCoinsCustom: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _grantCoins(id, -(parseInt(_val('alpCoinAmt'), 10) || 0));
    },
    setChapter: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      const ch = parseInt(_val('alpChapter'), 10) || 0;
      if (typeof setPlayerChapter === 'function') setPlayerChapter(id, ch);
      _pushLocalLog('ADMIN', 'Set chapter ' + ch + ' → ' + id);
      _toast('Chapter set to ' + ch);
    },
    advanceChapter: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      const snap = _getSaveSnapshot(id);
      const cur  = (snap && snap.story) ? (snap.story.chapter || 0) : 0;
      if (typeof setPlayerChapter === 'function') setPlayerChapter(id, cur + 1);
      _pushLocalLog('ADMIN', 'Advanced chapter → ' + id);
      _toast('Advanced to chapter ' + (cur + 1));
    },
    resetStory: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      const acct = _adminGetAcct(id);
      if (!confirm('Reset story progress for "' + (acct ? acct.username : id) + '"?')) return;
      if (typeof resetAccount === 'function') resetAccount(id);
      _pushLocalLog('ADMIN', 'Story reset: ' + (acct ? acct.username : id));
      _toast('Story reset');
    },
    resetAccount: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      const acct = _adminGetAcct(id);
      if (!confirm('PERMANENTLY RESET ALL SAVE DATA for "' + (acct ? acct.username : id) + '"?')) return;
      if (typeof resetAccount === 'function') resetAccount(id);
      _pushLocalLog('ADMIN', 'Account RESET: ' + (acct ? acct.username : id));
      _toast('Account reset');
    },
    forceLogout: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      if (typeof adminKickPlayer === 'function') adminKickPlayer(id);
      _pushLocalLog('ADMIN', 'Force logout: ' + id);
      _toast('Logout signal sent');
    },
    unlockAll: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      if (typeof unlockAllItems === 'function') unlockAllItems(id);
      _pushLocalLog('ADMIN', 'All items unlocked: ' + id);
      _toast('All items unlocked');
    },
    unlockSovereign: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _unlockSovereign(id);
    },
    unlockTrueForm: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _unlockTrueForm(id);
    },
    unlockMultiverse: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _unlockMultiverse(id);
    },
    grantParadox: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _grantParadox(id);
    },
    grantCosmetic: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _grantCosmetic(id, _val('alpCosmeticId'));
    },
    removeCosmetic: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      _removeCosmetic(id, _val('alpCosmeticId'));
    },
    viewSnapshot: function() {
      const id = _val('alpPlayerSel'); if (!id) { _toast('Select account', true); return; }
      const snap = _getSaveSnapshot(id);
      const box  = _el('alpSnapshotBox');
      const pre  = _el('alpSnapshotContent');
      if (!box || !pre) return;
      const acct = _adminGetAcct(id);
      if (!snap) {
        pre.textContent = '(no save data found)';
      } else {
        const lines = [
          'Username:       ' + (acct ? acct.username : id),
          'Account ID:     ' + id,
          'Coins:          ' + (snap.coins || 0),
          'Chapter:        ' + ((snap.story && snap.story.chapter) || 0),
          'Boss Beaten:    ' + !!(snap.unlocks && snap.unlocks.bossBeaten),
          'True Form:      ' + !!(snap.unlocks && snap.unlocks.trueform),
          'Sovereign:      ' + !!(snap.unlocks && snap.unlocks.sovereignBeaten),
          'Paradox:        ' + !!(snap.unlocks && snap.unlocks.paradoxCompanion),
          'Multiverse:     ' + !!(snap.unlocks && snap.unlocks.interTravel),
          'Cosmetics:      ' + (Array.isArray(snap.cosmetics) ? snap.cosmetics.join(', ') || '(none)' : '(none)'),
          '',
          '── Full save ──',
          JSON.stringify(snap, null, 2),
        ];
        pre.textContent = lines.join('\n');
      }
      box.style.display = 'block';
    },
  };

  // Expose command exec for other modules
  window._adminDashExec = _cmdExec;

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLE HOOK  — intercepts /command in the game dev console
  // ═══════════════════════════════════════════════════════════════════════════

  window.addEventListener('load', function() {
    // _consoleExec is a top-level function declaration in smb-debug-console.js,
    // so it is available on window after that file executes.
    if (typeof window._consoleExec === 'function') {
      const _origExec = window._consoleExec;
      window._consoleExec = function(raw) {
        if (raw && raw.startsWith('/') && _cmdExec(raw)) return;
        _origExec(raw);
      };
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCKET LISTENERS — react to server-pushed events in real time
  // ═══════════════════════════════════════════════════════════════════════════

  window.addEventListener('load', function() {
    setTimeout(function() {
      // Try to attach to the socket.io client through NetworkManager
      const socket = (window.NetworkManager && NetworkManager._socket) ? NetworkManager._socket : null;
      if (!socket) return;

      socket.on('adminPlayerAction', function(action) {
        const acct = (window.AccountManager && AccountManager.getActiveAccount) ? AccountManager.getActiveAccount() : null;
        if (!acct) return;
        if (action.targetAccountId && action.targetAccountId !== acct.id) return;
        switch (action.type) {
          case 'giveCoins':
            if (typeof addCoins === 'function') { addCoins(action.value || 0); if (typeof saveGame === 'function') saveGame(); }
            if (typeof LiveOps !== 'undefined') LiveOps.notify('⬡ Admin granted you ' + action.value + ' coins!', '#ffdd44', 5000);
            break;
          case 'giveCosmetic':
            _grantCosmetic(acct.id, action.value);
            break;
        }
      });

      socket.on('adminAnnouncement', function(data) {
        if (typeof LiveOps !== 'undefined') LiveOps.notify(data.message, data.color, data.duration);
      });

      socket.on('liveConfigUpdated', function(cfg) {
        if (typeof LiveOps !== 'undefined') LiveOps.apply(cfg);
        if (_panelOpen && _activeTab === 'dashboard') _refreshDashStats();
      });

      socket.on('adminLog', function(entry) {
        _serverLogs.push(entry);
        if (_serverLogs.length > 500) _serverLogs.shift();
        if (_panelOpen && _activeTab === 'logs') _refreshLogBox();
      });

      socket.on('adminForceDisconnect', function() {
        if (typeof LobbyManager !== 'undefined' && typeof LobbyManager.leaveLobby === 'function')
          LobbyManager.leaveLobby();
        else if (window.NetworkManager && typeof NetworkManager.disconnect === 'function')
          NetworkManager.disconnect();
      });
    }, 1200);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // KEY + SECURITY LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  document.addEventListener('keydown', function(e) {
    // F10 = open/close admin dashboard
    if (e.key === 'F10') { e.preventDefault(); _toggle(); }
    if (e.key === 'Escape' && e.shiftKey && window.AdminSession) AdminSession.logout();
  });

  // Log unauthorized F10 presses for non-admins
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F10' && !_adminPanelIsAllowed()) {
      const acct = (window.AccountManager && AccountManager.getActiveAccount) ? AccountManager.getActiveAccount() : null;
      _pushLocalLog('SECURITY', 'Unauthorized F10 attempt by: ' + (acct ? acct.username : 'unknown'));
    }
  });

})();
