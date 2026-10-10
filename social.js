'use strict';
// social.js — friends: presence and game invites on the Socket.io relay.
//
// Friends cannot message each other. The only things this module carries are
// "is my friend online", "my friend's weekly-challenge time" and "come and
// join my lobby". There is no free text anywhere in the protocol except the
// display name, which is sanitised the same way the lobby sanitises it.
//
// Identity without accounts: the browser keeps a random secret and sends it
// in soc:hello. The player's public FRIEND CODE is derived from it with a
// one-way hash, so knowing someone's code does not let you sign in as them,
// and the code is the same after every server restart.
//
// Nothing is stored here. Each browser keeps its own friend list and sends it
// on connect; two players count as friends only while BOTH lists name the
// other, so removing someone is immediate and cannot be undone from their side.
// A request to someone who is offline waits in the sender's own list and is
// delivered the next time both are connected.

const crypto = require('crypto');

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 10;
const MAX_FRIENDS = 100;
const MAX_PENDING = 30;

function codeFromSecret(secret) {
  const h = crypto.createHash('sha256').update('smb-friend:' + secret).digest();
  let out = '';
  for (let i = 0; i < CODE_LEN; i++) out += CODE_ALPHABET[h[i] % CODE_ALPHABET.length];
  return out;
}

function _cleanCode(c) {
  c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === CODE_LEN ? c : null;
}

function _cleanList(list, max) {
  const out = new Set();
  if (!Array.isArray(list)) return out;
  for (const c of list) {
    const k = _cleanCode(c);
    if (k) out.add(k);
    if (out.size >= max) break;
  }
  return out;
}

function _cleanName(n) {
  return String(n || 'Player').replace(/[<>]/g, '').slice(0, 20).trim() || 'Player';
}

function attachSocial(io, opts) {
  opts = opts || {};
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  const users = new Map();        // friend code -> user
  const bySocket = new Map();     // socket.id -> friend code

  function _mutual(a, b) { return !!(a && b && a.friends.has(b.code) && b.friends.has(a.code)); }

  function _emit(user, ev, data) {
    for (const id of user.sockets) io.to(id).emit(ev, data);
  }

  // What a friend is allowed to see about `u`.
  function _card(u) {
    return { code: u.code, name: u.name, online: true, lobby: u.lobby ? { label: u.lobby.label } : null, weekly: u.weekly };
  }

  function _friendList(me) {
    const out = [];
    for (const code of me.friends) {
      const f = users.get(code);
      out.push(_mutual(me, f) ? _card(f) : { code, online: false });
    }
    return out;
  }

  function _tellFriends(me, online) {
    for (const code of me.friends) {
      const f = users.get(code);
      if (_mutual(me, f)) _emit(f, 'soc:presence', online ? _card(me) : { code: me.code, online: false });
    }
  }

  // `from` asked `to` to be friends. Both sides already wanting each other
  // makes it a friendship; otherwise `to` gets the question.
  function _deliverRequest(from, to) {
    if (to.pending.has(from.code) || to.friends.has(from.code)) {
      _befriend(from, to);
    } else {
      _emit(to, 'soc:request', { code: from.code, name: from.name });
    }
  }

  function _befriend(a, b) {
    for (const [x, y] of [[a, b], [b, a]]) {
      x.pending.delete(y.code);
      if (x.friends.size < MAX_FRIENDS) x.friends.add(y.code);
    }
    if (!_mutual(a, b)) return;
    _emit(a, 'soc:accepted', _card(b));
    _emit(b, 'soc:accepted', _card(a));
  }

  function _weekly(w) {
    if (!w || typeof w !== 'object') return null;
    const wk = Number(w.wk), ms = Number(w.ms);
    if (!Number.isInteger(wk) || wk < 0 || wk > 1e6) return null;
    if (!Number.isFinite(ms) || ms <= 0 || ms > 3600000) return null;
    return { wk, ms: Math.round(ms) };
  }

  io.on('connection', (socket) => {
    function me() { return users.get(bySocket.get(socket.id)); }

    socket.on('soc:hello', (h) => {
      if (bySocket.has(socket.id)) return;
      if (!h || typeof h !== 'object' || typeof h.secret !== 'string' || h.secret.length < 16 || h.secret.length > 128) return;
      const code = codeFromSecret(h.secret);
      let u = users.get(code);
      if (!u) {
        u = { code, sockets: new Set(), name: 'Player', friends: new Set(), pending: new Set(), lobby: null, weekly: null };
        users.set(code, u);
      }
      const wasOnline = u.sockets.size > 0;
      u.sockets.add(socket.id);
      bySocket.set(socket.id, code);
      u.name = _cleanName(h.name);
      u.friends = _cleanList(h.friends, MAX_FRIENDS);
      u.friends.delete(code);
      u.pending = _cleanList(h.pending, MAX_PENDING);
      u.pending.delete(code);
      u.weekly = _weekly(h.weekly);
      socket.emit('soc:me', { code });

      // Requests this player sent earlier, to people who are here now…
      for (const p of [...u.pending]) {
        const t = users.get(p);
        if (t && t.sockets.size) _deliverRequest(u, t);
      }
      // …and requests that were waiting for this player to turn up.
      for (const other of users.values()) {
        if (other !== u && other.sockets.size && other.pending.has(code)) _deliverRequest(other, u);
      }
      socket.emit('soc:friends', _friendList(u));
      if (!wasOnline) _tellFriends(u, true);
    });

    socket.on('soc:request', (c) => {
      const u = me(), code = _cleanCode(c);
      if (!u || !code || code === u.code) return;
      if (u.friends.has(code) && _mutual(u, users.get(code))) return;
      if (u.pending.size >= MAX_PENDING && !u.pending.has(code)) { socket.emit('soc:error', { reason: 'pendingFull' }); return; }
      u.pending.add(code);
      const t = users.get(code);
      if (t && t.sockets.size) _deliverRequest(u, t);
      socket.emit('soc:requested', { code, delivered: !!(t && t.sockets.size) });
    });

    socket.on('soc:accept', (c) => {
      const u = me(), code = _cleanCode(c);
      if (!u || !code || code === u.code) return;
      if (u.friends.size >= MAX_FRIENDS) { socket.emit('soc:error', { reason: 'friendsFull' }); return; }
      const t = users.get(code);
      // Only a real, still-standing request can be accepted.
      if (!t || !(t.pending.has(u.code) || t.friends.has(u.code))) { socket.emit('soc:error', { reason: 'gone' }); return; }
      _befriend(u, t);
    });

    socket.on('soc:remove', (c) => {
      const u = me(), code = _cleanCode(c);
      if (!u || !code) return;
      const t = users.get(code);
      const were = _mutual(u, t);
      u.friends.delete(code);
      u.pending.delete(code);
      // The other side simply sees this player go offline.
      if (were) _emit(t, 'soc:presence', { code: u.code, online: false });
    });

    // The one thing friends can send each other: "join my lobby".
    socket.on('soc:invite', (m) => {
      const u = me();
      if (!u || !m || typeof m !== 'object') return;
      const code = _cleanCode(m.to);
      const lobby = String(m.lobby || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      const t = users.get(code);
      if (!code || !lobby || !_mutual(u, t) || !t.sockets.size) return;
      const now = Date.now();
      u._invAt = u._invAt || {};
      if (u._invAt[code] && now - u._invAt[code] < 4000) return;
      u._invAt[code] = now;
      _emit(t, 'soc:invite', { code: u.code, name: u.name, lobby });
      socket.emit('soc:invited', { code });
    });

    socket.on('soc:status', (m) => {
      const u = me();
      if (!u || !m || typeof m !== 'object') return;
      if (m.name !== undefined) u.name = _cleanName(m.name);
      if (m.lobby !== undefined) {
        u.lobby = m.lobby ? { label: String(m.lobby.label || 'a lobby').replace(/[<>]/g, '').slice(0, 30) } : null;
      }
      if (m.weekly !== undefined) u.weekly = _weekly(m.weekly);
      _tellFriends(u, true);
    });

    socket.on('disconnect', () => {
      const code = bySocket.get(socket.id);
      if (!code) return;
      bySocket.delete(socket.id);
      const u = users.get(code);
      if (!u) return;
      u.sockets.delete(socket.id);
      if (u.sockets.size) return;
      _tellFriends(u, false);
      users.delete(code);
    });
  });

  log('SOCIAL', 'friends service attached');
  return { stats() { return { online: users.size }; } };
}

module.exports = { attachSocial, codeFromSecret };
