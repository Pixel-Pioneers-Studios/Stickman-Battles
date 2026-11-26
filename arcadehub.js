'use strict';
// arcadehub.js — public lobbies for the Pixel Pioneers Arcade games, on the same Socket.io relay.
//
// Like pubhub.js, but generic: the server only knows who is in which lobby. Each arcade game
// runs its own simulation in the browser. One connected client per lobby, the "authority",
// simulates the shared world (bots, a boss, shared pickups) and streams it; everyone else
// streams their own player. When the authority leaves, the server hands the job to the
// longest-connected player still there, so no departure ends a lobby.
//
// Lobbies are per game and fill up to that game's cap; a full one opens another. A lobby
// remembers when it opened (`age` in the welcome), so timed events such as a boss every few
// minutes stay on one schedule however often the authority changes hands.
//
// Events (client -> server):
//   arc:join  { game, name, color }   join the fullest public lobby of that game with room
//   arc:state <object>                this player's state (volatile, relayed to the lobby)
//   arc:world <object>                authority only: the shared world (volatile)
//   arc:ev    { type, data, to }      a reliable event; to = slot number, 'auth', or omitted (all)
//   arc:leave
//   arc:count { game }                answered with arc:count { game, n }: players in that game's lobbies
// Events (server -> client):
//   arc:welcome { slot, lobby, max, roster, authority, age }
//   arc:joined { slot, name, color }  arc:left { slot }  arc:authority { slot }
//   arc:state { slot, s }  arc:world <object>  arc:ev { from, type, data }
//   arc:fail { reason }

const GAMES = {
  tankfield: { max: 10 },
  'getaway-city': { max: 8 },
  'zap-arena': { max: 8 },
};
const MAX_EVENT_BYTES = 8000, MAX_STATE_BYTES = 2000, MAX_WORLD_BYTES = 24000;

function attachArcadeHub(io, opts) {
  opts = opts || {};
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  const lobbies = new Map();       // id -> lobby
  const where = new Map();         // socket.id -> { lobby, slot }
  let nextId = 1;

  const count = l => l.slots.filter(Boolean).length;
  const room = l => 'arc:' + l.id;
  const roster = l => l.slots.map((s, i) => s ? { slot: i, name: s.name, color: s.color } : null).filter(Boolean);
  const size = v => { try { return JSON.stringify(v).length; } catch (e) { return Infinity; } };

  function newLobby(game) {
    const n = [...lobbies.values()].filter(l => l.game === game).length + 1;
    const l = { id: game + '-' + (nextId++), game, label: 'Public lobby ' + n, slots: new Array(GAMES[game].max).fill(null), authority: -1, born: Date.now() };
    lobbies.set(l.id, l);
    return l;
  }

  function elect(l) {
    let best = -1;
    l.slots.forEach((s, i) => { if (s && (best < 0 || s.at < l.slots[best].at)) best = i; });
    if (best !== l.authority) {
      l.authority = best;
      if (best >= 0) io.to(room(l)).emit('arc:authority', { slot: best });
    }
  }

  function leave(socket) {
    const at = where.get(socket.id);
    if (!at) return;
    where.delete(socket.id);
    const { lobby: l, slot } = at;
    l.slots[slot] = null;
    socket.leave(room(l));
    io.to(room(l)).emit('arc:left', { slot });
    log('ARCADE', `${l.id} slot ${slot} left (${count(l)}/${l.slots.length})`);
    if (!count(l)) { lobbies.delete(l.id); return; }
    if (l.authority === slot) elect(l);
  }

  io.on('connection', socket => {
    socket.on('arc:join', hello => {
      if (where.has(socket.id) || !hello || typeof hello !== 'object') return;
      const game = String(hello.game || '');
      if (!GAMES[game]) { socket.emit('arc:fail', { reason: 'unknown game' }); return; }
      // The fullest lobby with room, so players end up together rather than spread thin.
      let l = null;
      for (const x of lobbies.values()) if (x.game === game && count(x) < x.slots.length && (!l || count(x) > count(l))) l = x;
      if (!l) l = newLobby(game);
      const slot = l.slots.findIndex(s => !s);
      l.slots[slot] = {
        socketId: socket.id,
        name: String(hello.name || 'Player ' + (slot + 1)).replace(/[<>]/g, '').slice(0, 24),
        color: /^#[0-9a-f]{3,8}$/i.test(hello.color || '') ? hello.color : null,
        at: Date.now(),
      };
      where.set(socket.id, { lobby: l, slot });
      socket.join(room(l));
      if (l.authority < 0 || !l.slots[l.authority]) elect(l);
      socket.emit('arc:welcome', { slot, lobby: l.label, max: l.slots.length, roster: roster(l), authority: l.authority, age: Date.now() - l.born });
      socket.to(room(l)).emit('arc:joined', { slot, name: l.slots[slot].name, color: l.slots[slot].color });
      log('ARCADE', `${l.id} slot ${slot} joined (${count(l)}/${l.slots.length})`);
    });

    socket.on('arc:state', s => {
      const at = where.get(socket.id);
      if (!at || !s || typeof s !== 'object' || size(s) > MAX_STATE_BYTES) return;
      socket.volatile.to(room(at.lobby)).emit('arc:state', { slot: at.slot, s });
    });

    socket.on('arc:world', w => {
      const at = where.get(socket.id);
      if (!at || at.slot !== at.lobby.authority || !w || typeof w !== 'object' || size(w) > MAX_WORLD_BYTES) return;
      socket.volatile.to(room(at.lobby)).emit('arc:world', w);
    });

    socket.on('arc:ev', ev => {
      const at = where.get(socket.id);
      if (!at || !ev || typeof ev !== 'object' || typeof ev.type !== 'string' || ev.type.length > 24) return;
      if (size(ev.data) > MAX_EVENT_BYTES) return;
      const out = { from: at.slot, type: ev.type, data: ev.data };
      const l = at.lobby;
      const to = ev.to === 'auth' ? l.authority : ev.to;
      if (Number.isInteger(to)) {
        const t = l.slots[to];
        if (t && to !== at.slot) io.to(t.socketId).emit('arc:ev', out);
      } else socket.to(room(l)).emit('arc:ev', out);
    });

    socket.on('arc:count', q => {
      const game = String(q && q.game || '');
      let n = 0;
      for (const l of lobbies.values()) if (l.game === game) n += count(l);
      socket.emit('arc:count', { game, n });
    });

    socket.on('arc:leave', () => leave(socket));
    socket.on('disconnect', () => leave(socket));
  });

  return {
    stats() { return [...lobbies.values()].map(l => ({ id: l.id, game: l.game, players: count(l) })); },
  };
}

module.exports = { attachArcadeHub, GAMES };
