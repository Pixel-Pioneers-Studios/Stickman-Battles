'use strict';
// smb-liveops.js — Live configuration, soft updates, and version gating
// Load order: after smb-globals.js (needs GAME_VERSION, SERVER_CONFIG)
//
// Exposes window.LiveOps with:
//   LiveOps.config           — current live config object (read-only)
//   LiveOps.refresh()        — manual fetch
//   LiveOps.apply(cfg)       — apply a config object directly
//   LiveOps.notify(msg,clr)  — show a toast notification
//   LiveOps.startPolling()   — begin 60-second auto-fetch
//   LiveOps.getCoinMult()    — coinMultiplier (≥1, default 1)
//   LiveOps.getXPMult()      — xpMultiplier  (≥1, default 1)
//   LiveOps.getBalance(key)  — balance.key   (default 1)
//   LiveOps.getEvent(key)    — events.key    (bool)
//   LiveOps.getShopRot()     — shopRotation  (array)

(function () {
  // ── Constants ───────────────────────────────────────────────────────────────
  const POLL_INTERVAL_MS = 60000;

  // Config URL: prefer the running server's /api/live-config, fall back to
  // a static file at the same origin (live-config.json).
  function _configUrl() {
    if (typeof SERVER_CONFIG !== 'undefined' && SERVER_CONFIG.url) {
      return SERVER_CONFIG.url + '/api/live-config';
    }
    return '/live-config.json';
  }

  const DEFAULT_CONFIG = {
    latestVersion:      (typeof GAME_VERSION !== 'undefined') ? GAME_VERSION : '1.0.0',
    minSupportedVersion: '0.0.0',
    motd:               '',
    coinMultiplier:     1,
    xpMultiplier:       1,
    shopRotation:       [],
    events:             {},
    balance:            {},
  };

  // ── State ───────────────────────────────────────────────────────────────────
  let _config     = Object.assign({}, DEFAULT_CONFIG);
  let _prevConfig = null;   // config before last fetch (for delta detection)
  let _pollTimer  = null;
  let _pendingToasts = [];  // queued while a fight is active

  // ── Semver comparison ───────────────────────────────────────────────────────
  function _semver(v) {
    const p = String(v || '0.0.0').split('.').map(Number);
    return (p[0] || 0) * 1e6 + (p[1] || 0) * 1e3 + (p[2] || 0);
  }
  function _versionGt(a, b) { return _semver(a) > _semver(b); }

  // ── Fight detection ─────────────────────────────────────────────────────────
  function _isInFight() {
    return (typeof gameRunning !== 'undefined' && gameRunning) &&
           !(typeof activeCinematic !== 'undefined' && activeCinematic);
  }

  // ── Logging ─────────────────────────────────────────────────────────────────
  function _log(msg) { console.log('[LIVEOPS]', msg); }

  // ── Toast notifications ─────────────────────────────────────────────────────
  function _showToast(msg, color, duration) {
    if (_isInFight()) {
      _pendingToasts.push({ msg: msg, color: color, duration: duration });
      return;
    }
    _renderToast(msg, color, duration);
  }

  function _renderToast(msg, color, duration) {
    if (!document.body) return;
    color    = color    || '#88ccff';
    duration = duration || 4500;

    // Stack toasts vertically if several appear at once
    const existing = document.querySelectorAll('.liveops-toast');
    const offset   = existing.length * 54;

    const el = document.createElement('div');
    el.className = 'liveops-toast';
    el.style.cssText = [
      'position:fixed',
      'top:' + (16 + offset) + 'px',
      'right:16px',
      'z-index:99999',
      'background:rgba(8,8,24,0.94)',
      'border:1px solid ' + color,
      'border-radius:9px',
      'padding:9px 16px',
      'color:' + color,
      "font-family:'Segoe UI',Arial,sans-serif",
      'font-size:0.80rem',
      'max-width:280px',
      'line-height:1.4',
      'box-shadow:0 0 18px ' + color + '55',
      'opacity:1',
      'transition:opacity 0.4s',
      'pointer-events:none',
      'white-space:pre-line',
    ].join(';');
    el.textContent = msg;
    document.body.appendChild(el);

    setTimeout(function () {
      el.style.opacity = '0';
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 440);
    }, duration);
  }

  // Drain queued toasts — called each poll cycle when not in a fight
  function _drainPendingToasts() {
    if (_isInFight()) return;
    const q = _pendingToasts.splice(0);
    q.forEach(function (t) { _renderToast(t.msg, t.color, t.duration); });
  }

  // ── Force-update modal ──────────────────────────────────────────────────────
  let _forceUpdateShown = false;

  function _showForceUpdateModal(optional) {
    if (_forceUpdateShown && !optional) return;
    _forceUpdateShown = true;

    let modal = document.getElementById('liveopsUpdateModal');
    if (modal) { modal.style.display = 'flex'; return; }

    modal = document.createElement('div');
    modal.id = 'liveopsUpdateModal';
    modal.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:999999',
      'background:rgba(0,0,0,0.88)',
      'display:flex', 'align-items:center', 'justify-content:center',
      "font-family:'Segoe UI',Arial,sans-serif",
    ].join(';');

    const box = document.createElement('div');
    box.style.cssText = [
      'background:#0b0b1e',
      'border:1px solid rgba(100,180,255,0.40)',
      'border-radius:14px',
      'padding:38px 36px 30px',
      'max-width:360px', 'width:88vw',
      'color:#dde4ff', 'text-align:center',
      'box-shadow:0 0 48px rgba(0,100,255,0.22)',
    ].join(';');

    const title = document.createElement('h2');
    title.style.cssText = 'margin:0 0 10px;font-size:1.15rem;color:#88ccff;letter-spacing:.02em;';
    title.textContent = '⚡ Update Required';

    const body = document.createElement('p');
    body.style.cssText = 'font-size:0.84rem;opacity:0.78;margin:0 0 26px;line-height:1.65;';
    body.textContent = optional
      ? 'A new version of Stickman Battles is available. Reload to get the latest features and fixes.'
      : 'A mandatory update is required. Gameplay is disabled until you reload.';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;justify-content:center;';

    const reload = document.createElement('button');
    reload.style.cssText = [
      'background:rgba(100,200,255,0.14)', 'border:1px solid rgba(100,200,255,0.52)',
      'border-radius:8px', 'color:#88ccff', 'padding:10px 28px',
      'cursor:pointer', 'font-size:0.9rem', 'font-family:inherit',
    ].join(';');
    reload.textContent = 'Reload Now';
    reload.onclick = function () { window.location.reload(true); };
    row.appendChild(reload);

    if (optional) {
      const later = document.createElement('button');
      later.style.cssText = [
        'background:rgba(255,255,255,0.05)', 'border:1px solid rgba(255,255,255,0.18)',
        'border-radius:8px', 'color:#888', 'padding:10px 28px',
        'cursor:pointer', 'font-size:0.9rem', 'font-family:inherit',
      ].join(';');
      later.textContent = 'Later';
      later.onclick = function () { modal.style.display = 'none'; };
      row.appendChild(later);
    }

    // Mandatory: disable game launch by intercepting startGame
    if (!optional && typeof window !== 'undefined') {
      window._liveopsGameBlocked = true;
    }

    box.appendChild(title);
    box.appendChild(body);
    box.appendChild(row);
    modal.appendChild(box);

    if (document.body) document.body.appendChild(modal);
    else document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(modal); });
  }

  // ── MOTD banner ─────────────────────────────────────────────────────────────
  function _setMOTD(text) {
    if (!text) { _removeMOTD(); return; }
    let banner = document.getElementById('liveops-motd');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'liveops-motd';
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9100',
        'background:linear-gradient(90deg,rgba(255,175,0,0.16),rgba(255,80,0,0.09))',
        'border-bottom:1px solid rgba(255,175,0,0.32)',
        'color:#ffcc66',
        "font-family:'Segoe UI',Arial,sans-serif",
        'font-size:0.76rem', 'text-align:center',
        'padding:4px 12px', 'letter-spacing:0.04em',
        'pointer-events:none',
      ].join(';');
      if (document.body) document.body.appendChild(banner);
    }
    banner.textContent = '📢 ' + text;
  }

  function _removeMOTD() {
    const b = document.getElementById('liveops-motd');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  // ── Version check ───────────────────────────────────────────────────────────
  function _checkVersions(cfg) {
    const current = (typeof GAME_VERSION !== 'undefined') ? GAME_VERSION : '0.0.0';

    if (_versionGt(cfg.minSupportedVersion, current)) {
      _log('force update required (min=' + cfg.minSupportedVersion + ', cur=' + current + ')');
      _showForceUpdateModal(false);
      return;
    }

    if (_versionGt(cfg.latestVersion, current)) {
      _log('update available (latest=' + cfg.latestVersion + ', cur=' + current + ')');
      _showToast('⬆ Update available (v' + cfg.latestVersion + ') — reload anytime', '#aaccff', 8000);
    }
  }

  // ── Apply config ─────────────────────────────────────────────────────────────
  function _apply(cfg) {
    const prev = Object.assign({}, _config);
    _config    = Object.assign({}, DEFAULT_CONFIG, cfg);

    // MOTD — hide during fights, show in menus
    if (!_isInFight()) _setMOTD(_config.motd);

    // Event toasts — only announce newly-enabled events
    const prevEvts = prev.events || {};
    const curEvts  = _config.events || {};
    const EVENT_LABELS = {
      doubleCoins: '⧡ Double Coins event is live!',
      bloodMoon:   '🌑 Blood Moon has begun!',
      xpWeekend:   '✨ XP Weekend is active!',
      bossRush:    '💀 Boss Rush mode enabled!',
    };
    Object.keys(curEvts).forEach(function (k) {
      if (curEvts[k] && !prevEvts[k] && EVENT_LABELS[k]) {
        _showToast(EVENT_LABELS[k], '#ffcc66', 6000);
      }
    });

    // Multiplier toasts — only when value actually changed and > 1
    if (_prevConfig !== null) {
      if (_config.coinMultiplier !== prev.coinMultiplier && _config.coinMultiplier > 1) {
        _showToast('⧡ ' + _config.coinMultiplier + 'x Coins active!', '#ffdd44', 6000);
      }
      if (_config.xpMultiplier !== prev.xpMultiplier && _config.xpMultiplier > 1) {
        _showToast('✨ ' + _config.xpMultiplier + 'x XP active!', '#88ff99', 6000);
      }
    }

    _log('config updated');
  }

  // ── Fetch ────────────────────────────────────────────────────────────────────
  function _fetch() {
    _drainPendingToasts();

    fetch(_configUrl(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (cfg) {
        const firstLoad = (_prevConfig === null);
        _prevConfig = cfg;
        _apply(cfg);
        _checkVersions(cfg);

        // First-load: announce MOTD as a toast as well
        if (firstLoad && cfg.motd) {
          _showToast('📢 ' + cfg.motd, '#ffcc88', 7000);
        }
      })
      .catch(function (err) {
        _log('fetch failed — ' + err.message + ' (keeping previous config)');
      });
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  window.LiveOps = {
    get config() { return _config; },

    refresh: _fetch,

    apply: _apply,

    notify: function (msg, color, duration) { _showToast(msg, color, duration); },

    startPolling: function () {
      _fetch();
      if (_pollTimer) clearInterval(_pollTimer);
      _pollTimer = setInterval(_fetch, POLL_INTERVAL_MS);
    },

    stopPolling: function () {
      if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    },

    // ── Runtime helpers ───────────────────────────────────────────────────────
    getCoinMult: function () {
      const v = _config.coinMultiplier;
      return (typeof v === 'number' && v > 0) ? v : 1;
    },

    getXPMult: function () {
      const v = _config.xpMultiplier;
      return (typeof v === 'number' && v > 0) ? v : 1;
    },

    getBalance: function (key, fallback) {
      if (_config.balance && typeof _config.balance[key] === 'number') return _config.balance[key];
      return (fallback !== undefined) ? fallback : 1;
    },

    getEvent: function (key) {
      return !!(_config.events && _config.events[key]);
    },

    getShopRot: function () {
      return Array.isArray(_config.shopRotation) ? _config.shopRotation : [];
    },
  };

  // Start polling as soon as DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.LiveOps.startPolling(); });
  } else {
    window.LiveOps.startPolling();
  }
})();
