'use strict';
// smb-friends.js: friends list (presence and lobby invites).
// social.js stores nothing. The list lives in the account save; the server only relays
// presence and invites between players who have both added each other.
// Identity is a random secret in the save. The friend code is a one-way hash of it (same as social.js).
// Load after smb-public-hub.js (server URL and Socket.io loader).
// Reads at call time: AccountManager, setAccountFlag, WeeklyChallenge, PubHub.

const FriendsManager = (() => {
  const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const CODE_LEN = 10;
  const LS_KEY = 'smb_social';

  let _data = null;            // { secret, friends: [{ code, name }], pending: [code] }
  let _acctId = null;          // account the data was loaded for
  let _code = null;
  let _sock = null;
  let _connecting = false;
  let _live = {};              // code -> { online, name, lobby, weekly } from the server
  let _requests = [];          // incoming, this session: [{ code, name }]
  let _lobby = null;           // { code, label } while in a Public Server lobby
  let _inviteQueue = [];       // codes to invite once the private lobby exists
  let _modal = null, _banner = null, _bannerTimer = 0;

  function _toast(msg, ms) { if (typeof showToast === 'function') showToast(msg, ms || 2600); }
  function _esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function _pretty(code) { return code ? code.slice(0, 5) + '-' + code.slice(5) : ''; }
  function _clean(code) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return code.length === CODE_LEN ? code : null;
  }

  function _acct() {
    try { return (window.AccountManager && AccountManager.getActiveAccount) ? AccountManager.getActiveAccount() : null; } catch (e) { return null; }
  }

  function _newSecret() {
    const b = new Uint8Array(24);
    (window.crypto || window.msCrypto).getRandomValues(b);
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  }

  function _load() {
    const a = _acct();
    _acctId = a ? (a.id || a.username || 'acct') : null;
    let d = a && a.data && a.data.social;
    if (!d) { try { d = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { d = null; } }
    if (!d || typeof d.secret !== 'string' || d.secret.length < 16) d = { secret: _newSecret(), friends: [], pending: [] };
    d.friends = Array.isArray(d.friends) ? d.friends.filter(f => f && _clean(f.code)) : [];
    d.pending = Array.isArray(d.pending) ? d.pending.filter(_clean) : [];
    _data = d;
    _code = d.code || null;
    _save();
    _deriveCode();
  }

  function _save() {
    if (!_data) return;
    const a = _acct();
    try {
      if (a && a.data && typeof setAccountFlag === 'function') setAccountFlag(['social'], _data, a);
      else localStorage.setItem(LS_KEY, JSON.stringify(_data));
    } catch (e) {}
  }

  // Same hash as the server, so the code is known before connecting.
  function _deriveCode() {
    if (_code || !window.crypto || !crypto.subtle || !window.TextEncoder) return;
    const secret = _data.secret;
    crypto.subtle.digest('SHA-256', new TextEncoder().encode('smb-friend:' + secret)).then(buf => {
      if (!_data || _data.secret !== secret) return;
      const h = new Uint8Array(buf);
      let out = '';
      for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[h[i] % CODE_ALPHABET.length];
      _setCode(out);
    }).catch(() => {});
  }

  function _setCode(c) {
    if (!c || _code === c) return;
    _code = c;
    _data.code = c;
    _save();
    if (window.PubHub && PubHub.active) PubHub.setFriendCode(c);
    _render();
  }

  function _ensure() {
    const a = _acct();
    const id = a ? (a.id || a.username || 'acct') : null;
    if (!_data || id !== _acctId) {
      // A different account signed in: its own identity and its own friends.
      if (_sock) { try { _sock.removeAllListeners(); _sock.disconnect(); } catch (e) {} _sock = null; }
      _live = {}; _requests = [];
      _load();
    }
  }

  function _name() {
    const a = _acct();
    return (a && a.username) ? String(a.username) : 'Player';
  }

  function _weekly() {
    try { return (window.WeeklyChallenge && WeeklyChallenge.best) ? WeeklyChallenge.best() : null; } catch (e) { return null; }
  }

  function _friend(code) { return _data.friends.find(f => f.code === code); }

  function connect() {
    _ensure();
    if (_sock || _connecting) return;
    if (!window.PubHub || !PubHub.loadIO) return;
    _connecting = true;
    const url = PubHub.serverUrl();
    PubHub.loadIO(url).then(() => {
      _connecting = false;
      if (_sock) return;
      _sock = window.io(url, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000, reconnectionDelayMax: 15000 });
      _sock.on('connect', () => {
        _sock.emit('soc:hello', {
          secret: _data.secret, name: _name(),
          friends: _data.friends.map(f => f.code), pending: _data.pending, weekly: _weekly(),
        });
        if (_lobby) _sock.emit('soc:status', { lobby: { label: _lobby.label } });
      });
      _sock.on('disconnect', () => { _live = {}; _render(); });
      _sock.on('soc:me', m => { if (m && m.code) _setCode(m.code); });
      _sock.on('soc:friends', list => {
        _live = {};
        for (const f of (list || [])) _onCard(f, true);
        _render();
      });
      _sock.on('soc:presence', f => { _onCard(f); _render(); });
      _sock.on('soc:request', r => {
        if (!r || !_clean(r.code) || _friend(r.code)) return;
        if (!_requests.some(x => x.code === r.code)) _requests.push({ code: r.code, name: String(r.name || 'Player') });
        _toast(r.name + ' sent you a friend request', 3600);
        _render();
      });
      _sock.on('soc:accepted', f => {
        if (!f || !_clean(f.code)) return;
        _data.pending = _data.pending.filter(c => c !== f.code);
        _requests = _requests.filter(r => r.code !== f.code);
        if (!_friend(f.code)) _data.friends.push({ code: f.code, name: f.name || 'Player' });
        _save();
        _onCard(f);
        _toast('You and ' + (f.name || 'Player') + ' are now friends', 3200);
        _render();
      });
      _sock.on('soc:requested', m => {
        _toast(m && m.delivered ? 'Friend request sent' : 'Request saved — they will see it next time they are online', 3600);
      });
      _sock.on('soc:invited', () => _toast('Invite sent'));
      _sock.on('soc:invite', _onInvite);
      _sock.on('soc:error', e => {
        const why = e && e.reason;
        _toast(why === 'friendsFull' ? 'Your friends list is full' : why === 'pendingFull' ? 'Too many requests waiting — cancel one first' : 'That request is no longer there');
      });
    }).catch(() => { _connecting = false; });
  }

  function _onCard(f, quiet) {
    if (!f || !_clean(f.code)) return;
    const was = _live[f.code] && _live[f.code].online;
    _live[f.code] = f;
    const rec = _friend(f.code);
    if (rec && f.online && f.name && rec.name !== f.name) { rec.name = f.name; _save(); }
    if (!quiet && f.online && !was && rec) _toast(rec.name + ' is online', 2200);
  }

  function add(raw) {
    _ensure();
    const code = _clean(raw);
    if (!code) { _toast('A friend code is 10 letters and numbers'); return false; }
    if (code === _code) { _toast('That is your own code'); return false; }
    if (_friend(code)) { _toast('Already on your friends list'); return false; }
    // They asked first: adding them back is the same as accepting.
    if (_requests.some(r => r.code === code)) { accept(code); return true; }
    if (!_data.pending.includes(code)) { _data.pending.push(code); _save(); }
    connect();
    _whenConnected(() => _sock.emit('soc:request', code));
    _render();
    return true;
  }

  function accept(code) {
    const r = _requests.find(x => x.code === code);
    if (!r || !_sock) return;
    _sock.emit('soc:accept', code);
  }

  function decline(code) {
    _requests = _requests.filter(r => r.code !== code);
    _render();
  }

  function remove(code) {
    _data.friends = _data.friends.filter(f => f.code !== code);
    _data.pending = _data.pending.filter(c => c !== code);
    delete _live[code];
    _save();
    if (_sock && _sock.connected) _sock.emit('soc:remove', code);
    _render();
  }

  function _whenConnected(fn) {
    if (_sock && _sock.connected) { fn(); return; }
    let tries = 0;
    const t = setInterval(() => {
      if (_sock && _sock.connected) { clearInterval(t); fn(); }
      else if (++tries > 80) clearInterval(t);
    }, 250);
  }

  // Invite a friend to our lobby. With no lobby yet, open a private one and send once it exists.
  function invite(code) {
    const live = _live[code];
    if (!live || !live.online) { _toast('They are not online right now'); return; }
    if (_lobby && _lobby.code) {
      _sock.emit('soc:invite', { to: code, lobby: _lobby.code });
      return;
    }
    if (!window.PubHub) return;
    if (!_inviteQueue.includes(code)) _inviteQueue.push(code);
    close();
    _leaveMatchThen(() => PubHub.createPrivate());
  }

  // Called by PubHub on joining ({ code, label }) and leaving (null).
  function setLobby(lobby) {
    _lobby = lobby && lobby.code ? { code: lobby.code, label: lobby.label || 'a lobby' } : null;
    if (_lobby) connect();
    if (_sock && _sock.connected) _sock.emit('soc:status', { lobby: _lobby ? { label: _lobby.label } : null });
    if (_lobby && _inviteQueue.length) {
      const q = _inviteQueue; _inviteQueue = [];
      _whenConnected(() => { for (const c of q) _sock.emit('soc:invite', { to: c, lobby: _lobby.code }); });
    }
    if (!_lobby) _inviteQueue = [];
    _render();
  }

  // Called by the Weekly Challenge when a new best time is set.
  function setWeekly(w) {
    if (_sock && _sock.connected) _sock.emit('soc:status', { weekly: w || null });
  }

  // A match that is not a lobby must end before the lobby starts its own.
  function _leaveMatchThen(fn) {
    const inMatch = typeof gameRunning !== 'undefined' && gameRunning && !(window.PubHub && PubHub.active);
    if (inMatch && typeof backToMenu === 'function') { backToMenu(); setTimeout(fn, 350); }
    else fn();
  }

  function _onInvite(m) {
    if (!m || !_friend(m.code) || !m.lobby) return;
    if (window.PubHub && PubHub.active && PubHub.code === m.lobby) return;
    _css();
    if (!_banner) {
      _banner = document.createElement('div');
      _banner.id = 'frInvite';
      document.body.appendChild(_banner);
    }
    const name = _friend(m.code).name || m.name || 'A friend';
    _banner.innerHTML = '<span><b>' + _esc(name) + '</b> invited you to their lobby</span>' +
      '<button type="button" class="fr-go">Join</button><button type="button" class="fr-no">Not now</button>';
    _banner.style.display = 'flex';
    _banner.querySelector('.fr-go').onclick = () => {
      _hideBanner();
      close();
      _leaveMatchThen(() => { if (window.PubHub) PubHub.join({ code: m.lobby }); });
    };
    _banner.querySelector('.fr-no').onclick = _hideBanner;
    clearTimeout(_bannerTimer);
    _bannerTimer = setTimeout(_hideBanner, 25000);
  }

  function _hideBanner() {
    clearTimeout(_bannerTimer);
    if (_banner) _banner.style.display = 'none';
  }

  let _cssDone = false;
  function _css() {
    if (_cssDone) return;
    _cssDone = true;
    const css = document.createElement('style');
    css.textContent = `
      #frModal{position:fixed;inset:0;z-index:9400;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.62)}
      #frModal .fr-card{width:min(440px,100%);max-height:min(640px,92vh);overflow:auto;background:var(--ui-surface,#141926);
        border:1px solid var(--ui-line-strong,rgba(150,170,210,.26));border-radius:12px;padding:18px 18px 14px;color:var(--ui-text,#E6EBF5);
        font:500 14px Rajdhani,'Segoe UI',sans-serif;text-align:left}
      #frModal h3{margin:0;font:800 1.25rem Rajdhani,sans-serif;letter-spacing:.5px}
      #frModal .fr-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
      #frModal .fr-x{background:none;border:0;color:var(--ui-muted,#8B97AD);font-size:20px;cursor:pointer;padding:2px 6px}
      #frModal .fr-note{color:var(--ui-muted,#8B97AD);font-size:.8rem;line-height:1.4;margin:0 0 12px}
      #frModal .fr-sec{font-size:.66rem;letter-spacing:1.4px;text-transform:uppercase;color:var(--ui-faint,#5D6880);margin:14px 0 6px}
      #frModal .fr-me{display:flex;align-items:center;gap:10px;background:var(--ui-surface-2,#1B2131);border:1px solid var(--ui-line,rgba(150,170,210,.14));
        border-radius:9px;padding:9px 12px}
      #frModal .fr-code{flex:1;font:800 1.15rem Rajdhani,monospace;letter-spacing:2.5px;color:var(--ember,#F2762B)}
      #frModal .fr-add{display:flex;gap:8px;margin-top:8px}
      #frModal input{flex:1;min-width:0;background:var(--ui-surface-2,#1B2131);border:1px solid var(--ui-line-strong,rgba(150,170,210,.26));border-radius:8px;
        color:var(--ui-text,#E6EBF5);padding:8px 10px;font:700 14px Rajdhani,monospace;letter-spacing:1.5px;text-transform:uppercase}
      #frModal button.fr-b{background:var(--ui-surface-2,#1B2131);border:1px solid var(--ui-line-strong,rgba(150,170,210,.26));color:var(--ui-text,#E6EBF5);
        border-radius:8px;padding:6px 12px;font:700 13px Rajdhani,sans-serif;cursor:pointer;white-space:nowrap}
      #frModal button.fr-b:hover{border-color:var(--ember-line,rgba(242,118,43,.42))}
      #frModal button.fr-p{background:var(--ember,#F2762B);border-color:var(--ember,#F2762B);color:var(--ember-ink,#160A02)}
      #frModal button.fr-b:disabled{opacity:.4;cursor:default}
      #frModal .fr-row{display:flex;align-items:center;gap:9px;padding:7px 4px;border-bottom:1px solid var(--ui-line,rgba(150,170,210,.14))}
      #frModal .fr-row:last-child{border-bottom:0}
      #frModal .fr-dot{width:9px;height:9px;border-radius:50%;background:#4a5263;flex:none}
      #frModal .fr-dot.on{background:#4fd67a;box-shadow:0 0 6px rgba(79,214,122,.7)}
      #frModal .fr-who{flex:1;min-width:0}
      #frModal .fr-who b{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #frModal .fr-who small{color:var(--ui-muted,#8B97AD);font-size:.76rem}
      #frModal .fr-rm{background:none;border:0;color:var(--ui-faint,#5D6880);cursor:pointer;font-size:15px;padding:2px 5px}
      #frModal .fr-rm:hover{color:#ff8080}
      #frModal .fr-empty{color:var(--ui-muted,#8B97AD);font-size:.84rem;padding:8px 4px}
      #frInvite{position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:9600;display:none;align-items:center;gap:10px;flex-wrap:wrap;justify-content:center;
        max-width:94vw;background:rgba(10,13,28,.96);border:1px solid var(--ember-line,rgba(242,118,43,.6));border-radius:11px;padding:9px 12px 9px 16px;
        color:#E6EBF5;font:600 14px Rajdhani,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5)}
      #frInvite button{border-radius:8px;padding:6px 14px;font:700 13px Rajdhani,sans-serif;cursor:pointer;border:1px solid rgba(150,170,210,.3);background:transparent;color:#E6EBF5}
      #frInvite .fr-go{background:var(--ember,#F2762B);border-color:var(--ember,#F2762B);color:var(--ember-ink,#160A02)}
      .hub-friends{font:700 .76rem Rajdhani,sans-serif;color:var(--ui-text,#E6EBF5);border:1px solid var(--ui-line-strong,rgba(150,170,210,.26));
        background:var(--ui-raised,rgba(255,255,255,.04));border-radius:var(--ui-radius,8px);padding:5px 11px;cursor:pointer;margin-left:auto;margin-right:10px}
      .hub-friends:hover{border-color:var(--ember-line,rgba(242,118,43,.42))}
      .hub-friends i{font-style:normal;color:#4fd67a;margin-left:5px}
      .hub-friends u{text-decoration:none;color:var(--ember,#F2762B);margin-left:5px}
    `;
    document.head.appendChild(css);
  }

  function open() {
    _ensure();
    _css();
    connect();
    if (!_modal) {
      _modal = document.createElement('div');
      _modal.id = 'frModal';
      _modal.setAttribute('role', 'dialog');
      _modal.setAttribute('aria-modal', 'true');
      _modal.addEventListener('mousedown', e => { if (e.target === _modal) close(); });
      // Typing a friend code must not move the fighter or trigger hotkeys.
      _modal.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); });
      document.body.appendChild(_modal);
    }
    _modal.style.display = 'flex';
    _render();
  }

  function close() { if (_modal) _modal.style.display = 'none'; }

  function _weekTime(w) {
    if (!w || !window.WeeklyChallenge || w.wk !== WeeklyChallenge.week()) return '';
    return ' · Weekly ' + WeeklyChallenge.fmt(w.ms);
  }

  function _render() {
    _renderChip();
    if (!_modal || _modal.style.display === 'none' || !_data) return;
    const typed = (_modal.querySelector('#frAddInput') || {}).value || '';
    const hadFocus = document.activeElement && document.activeElement.id === 'frAddInput';

    const reqs = _requests.map(r =>
      '<div class="fr-row"><span class="fr-dot on"></span><div class="fr-who"><b>' + _esc(r.name) + '</b><small>wants to be friends</small></div>' +
      '<button type="button" class="fr-b fr-p" data-act="accept" data-c="' + r.code + '">Accept</button>' +
      '<button type="button" class="fr-b" data-act="decline" data-c="' + r.code + '">Decline</button></div>').join('');

    const rows = _data.friends.map(f => {
      const l = _live[f.code] || {};
      return { f, on: !!l.online, l };
    }).sort((a, b) => (b.on - a.on) || a.f.name.localeCompare(b.f.name)).map(({ f, on, l }) =>
      '<div class="fr-row"><span class="fr-dot' + (on ? ' on' : '') + '"></span><div class="fr-who"><b>' + _esc(f.name) + '</b><small>' +
      (on ? (l.lobby ? 'In ' + _esc(l.lobby.label) : 'Online') : 'Offline') + _esc(_weekTime(l.weekly)) + '</small></div>' +
      '<button type="button" class="fr-b fr-p" data-act="invite" data-c="' + f.code + '"' + (on ? '' : ' disabled') + '>Invite</button>' +
      '<button type="button" class="fr-rm" title="Remove friend" data-act="remove" data-c="' + f.code + '">&#10005;</button></div>').join('');

    const waiting = _data.pending.map(c =>
      '<div class="fr-row"><span class="fr-dot"></span><div class="fr-who"><b>' + _pretty(c) + '</b><small>request sent — waiting for them</small></div>' +
      '<button type="button" class="fr-b" data-act="remove" data-c="' + c + '">Cancel</button></div>').join('');

    // People in the lobby right now who are not friends yet.
    let mates = '';
    if (window.PubHub && PubHub.active) {
      mates = PubHub.roster.filter(r => !r.me && r.fc && !_friend(r.fc)).map(r =>
        '<div class="fr-row"><span class="fr-dot on"></span><div class="fr-who"><b>' + _esc(r.name) + '</b><small>in this lobby</small></div>' +
        (_data.pending.includes(r.fc)
          ? '<button type="button" class="fr-b" disabled>Request sent</button>'
          : '<button type="button" class="fr-b" data-act="add" data-c="' + r.fc + '">Add friend</button>') + '</div>').join('');
    }

    _modal.innerHTML = '<div class="fr-card">' +
      '<div class="fr-top"><h3>Friends</h3><button type="button" class="fr-x" data-act="close" aria-label="Close">&#10005;</button></div>' +
      '<p class="fr-note">Swap friend codes, then invite each other into a lobby. Friends can not message you — chat only exists inside a game.</p>' +
      '<div class="fr-me"><span class="fr-code">' + (_code ? _pretty(_code) : '…') + '</span><button type="button" class="fr-b" data-act="copy">Copy my code</button></div>' +
      '<div class="fr-add"><input id="frAddInput" maxlength="12" placeholder="FRIEND CODE" autocomplete="off" spellcheck="false">' +
      '<button type="button" class="fr-b fr-p" data-act="addtyped">Add</button></div>' +
      (reqs ? '<div class="fr-sec">Requests</div>' + reqs : '') +
      (mates ? '<div class="fr-sec">In your lobby</div>' + mates : '') +
      '<div class="fr-sec">Friends' + (_data.friends.length ? ' · ' + _onlineCount() + ' online' : '') + '</div>' +
      (rows || '<div class="fr-empty">No friends yet. Send your code to a friend, or add people you meet in a lobby.</div>') +
      (waiting ? '<div class="fr-sec">Sent</div>' + waiting : '') +
      '</div>';

    const inp = _modal.querySelector('#frAddInput');
    if (inp) {
      inp.value = typed;
      if (hadFocus) inp.focus();
      inp.onkeydown = e => { if (e.key === 'Enter') { if (add(inp.value)) inp.value = ''; } };
    }
    _modal.querySelectorAll('[data-act]').forEach(b => {
      b.onclick = () => {
        const act = b.dataset.act, c = b.dataset.c;
        if (act === 'close') close();
        else if (act === 'copy') _copyCode();
        else if (act === 'addtyped') { const i = _modal.querySelector('#frAddInput'); if (i && add(i.value)) { i.value = ''; _render(); } }
        else if (act === 'add') add(c);
        else if (act === 'accept') accept(c);
        else if (act === 'decline') decline(c);
        else if (act === 'invite') invite(c);
        else if (act === 'remove') remove(c);
      };
    });
  }

  function _copyCode() {
    if (!_code) return;
    const shown = () => _toast('Your friend code: ' + _pretty(_code), 5000);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(_pretty(_code)).then(() => _toast('Friend code copied'), shown);
    else shown();
  }

  function _onlineCount() {
    return _data ? _data.friends.filter(f => _live[f.code] && _live[f.code].online).length : 0;
  }

  // The Friends button on the home screen's identity bar.
  function _renderChip() {
    const el = document.getElementById('hubFriends');
    if (!el) return;
    const on = _onlineCount();
    el.innerHTML = 'Friends' + (on ? '<i>' + on + ' online</i>' : '') + (_requests.length ? '<u>' + _requests.length + ' new</u>' : '');
  }

  function _boot() {
    _css();
    _ensure();
    _renderChip();
    // Only players who already use friends hold a connection from the menu.
    if (_data.friends.length || _data.pending.length) connect();
  }
  if (document.readyState === 'complete') setTimeout(_boot, 600);
  else window.addEventListener('load', () => setTimeout(_boot, 600));

  return {
    open, close, connect, add, accept, decline, remove, invite, setLobby, setWeekly,
    refresh() { _ensure(); _render(); },
    get code() { return _code; },
    get friends() { return _data ? _data.friends.map(f => Object.assign({}, f, _live[f.code] || { online: false })) : []; },
    get requests() { return _requests.slice(); },
    get pending() { return _data ? _data.pending.slice() : []; },
  };
})();

window.FriendsManager = FriendsManager;
