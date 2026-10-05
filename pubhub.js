'use strict';
// pubhub.js — the Public Server: hostless shared lobbies on the Socket.io relay.
//
// The server owns the RULES of a public lobby: who is in it, the phase clock
// (hub -> vote -> round -> hub), the vote tally and the teams. It never runs
// game physics — the engine only exists in the browser. Shared world objects
// (roaming bots, the soccer ball) are simulated by ONE connected client, the
// "authority", and relayed through here. If that client leaves, the server
// hands the job to the next player immediately, so no player is ever a host
// whose departure ends the lobby.
//
// Lobbies ("shards") hold MAX_PLAYERS each; a full one causes a new one to open.

const MAX_PLAYERS = 10;
// PUBHUB_HUB_SECONDS / PUBHUB_VOTE_SECONDS shorten the clock for local testing.
const HUB_SECONDS   = +process.env.PUBHUB_HUB_SECONDS  || 300;   // free roam before each vote
const VOTE_SECONDS  = +process.env.PUBHUB_VOTE_SECONDS || 20;
const ROUND_MAX_SECONDS = 360; // hard cap so a stalled round can never trap a lobby
const RESULTS_SECONDS = 6;

// Modes offered in the vote. `ready: false` modes are shown but not votable yet.
const MODES = {
  hub:        { label: 'Keep fighting', ready: true,  minPlayers: 1 },
  soccer:     { label: 'Soccer',        ready: true,  minPlayers: 2 },
  basketball: { label: 'Basketball',    ready: false, minPlayers: 2 },
  battleroyale: { label: 'Battle Royale', ready: false, minPlayers: 1 },
  chaos:      { label: 'Chaos',         ready: false, minPlayers: 1 },
};

function attachPublicHub(io, opts) {
  opts = opts || {};
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  const shards = new Map();          // id -> shard
  const socketShard = new Map();     // socket.id -> { shard, slot }
  let nextShardNum = 1;

  function _now() { return Date.now(); }

  function _newShard() {
    const id = 'PUB' + (nextShardNum++);
    const shard = {
      id,
      label: 'Public Server ' + (shards.size + 1),
      slots: new Array(MAX_PLAYERS).fill(null),
      authority: -1,
      phase: 'hub',
      mode: 'hub',
      phaseEndsAt: _now() + HUB_SECONDS * 1000,
      votes: new Map(),              // slot -> mode key
      teams: null,                   // slot -> 0|1 during team rounds
      roundResult: null,
    };
    shards.set(id, shard);
    return shard;
  }

  function _room(shard) { return 'pubhub:' + shard.id; }
  function _count(shard) { return shard.slots.filter(Boolean).length; }

  function _roster(shard) {
    return shard.slots.map((s, i) => s ? { slot: i, name: s.name, color: s.color } : null).filter(Boolean);
  }

  function _phasePayload(shard) {
    return {
      phase: shard.phase,
      mode: shard.mode,
      endsAt: shard.phaseEndsAt,
      serverNow: _now(),
      teams: shard.teams,
      votes: _tally(shard),
      options: _voteOptions(shard),
      result: shard.roundResult,
    };
  }

  function _voteOptions(shard) {
    const n = _count(shard);
    return Object.keys(MODES).map(k => ({
      key: k, label: MODES[k].label,
      enabled: MODES[k].ready && n >= MODES[k].minPlayers,
      reason: !MODES[k].ready ? 'Coming soon' : (n < MODES[k].minPlayers ? 'Needs ' + MODES[k].minPlayers + ' players' : ''),
    }));
  }

  function _tally(shard) {
    const t = {};
    for (const k of shard.votes.values()) t[k] = (t[k] || 0) + 1;
    return t;
  }

  function _broadcastRoster(shard) {
    io.to(_room(shard)).emit('pub:roster', { roster: _roster(shard), authority: shard.authority, count: _count(shard), max: MAX_PLAYERS });
  }

  function _broadcastPhase(shard) {
    io.to(_room(shard)).emit('pub:phase', _phasePayload(shard));
  }

  // The authority is the lowest occupied slot. Deterministic, so every client
  // can sanity-check it, and a newcomer never steals the job from an incumbent
  // (newcomers take the lowest FREE slot, which is never below an occupied one
  // that already holds the job... unless the incumbent left, which is exactly
  // when the job should move).
  // A browser tab in the background stops running the game loop, so a player
  // who is away cannot simulate the bots/ball: prefer anyone who is present.
  function _electAuthority(shard) {
    const prev = shard.authority;
    const present = shard.slots.findIndex(s => s && !s.away);
    shard.authority = present >= 0 ? present : shard.slots.findIndex(Boolean);
    if (shard.authority !== prev) {
      io.to(_room(shard)).emit('pub:authority', { slot: shard.authority });
    }
  }

  function _setPhase(shard, phase, mode, seconds) {
    shard.phase = phase;
    shard.mode = mode;
    shard.phaseEndsAt = _now() + seconds * 1000;
    if (phase === 'vote') shard.votes.clear();
    if (phase !== 'round' && phase !== 'results') shard.teams = null;
    if (phase === 'round') shard.roundResult = null;
    _broadcastPhase(shard);
  }

  function _assignTeams(shard) {
    const teams = {};
    let i = 0;
    shard.slots.forEach((s, slot) => { if (s) teams[slot] = (i++) % 2; });
    shard.teams = teams;
  }

  function _resolveVote(shard) {
    const opts = _voteOptions(shard).filter(o => o.enabled);
    const tally = _tally(shard);
    let best = [], bestN = -1;
    for (const o of opts) {
      const n = tally[o.key] || 0;
      if (n > bestN) { best = [o.key]; bestN = n; } else if (n === bestN) best.push(o.key);
    }
    // Nobody voted: stay in the hub rather than yank people into a mode.
    if (bestN <= 0) return 'hub';
    return best[Math.floor(Math.random() * best.length)];
  }

  function _tick() {
    const now = _now();
    for (const shard of shards.values()) {
      if (_count(shard) === 0) continue;
      if (shard.shortSince) {
        if (shard.phase !== 'round' || _count(shard) >= _minFor(shard)) {
          shard.shortSince = 0;
        } else if (now - shard.shortSince > SHORT_GRACE_MS) {
          shard.shortSince = 0;
          shard.roundResult = { reason: 'players' };
          _setPhase(shard, 'results', shard.mode, RESULTS_SECONDS);
          continue;
        }
      }
      if (now < shard.phaseEndsAt) continue;
      if (shard.phase === 'hub') {
        _setPhase(shard, 'vote', 'hub', VOTE_SECONDS);
      } else if (shard.phase === 'vote') {
        const winner = _resolveVote(shard);
        if (winner === 'hub') {
          _setPhase(shard, 'hub', 'hub', HUB_SECONDS);
        } else {
          _assignTeams(shard);
          _setPhase(shard, 'round', winner, ROUND_MAX_SECONDS);
        }
      } else if (shard.phase === 'round') {
        shard.roundResult = { reason: 'time' };
        _setPhase(shard, 'results', shard.mode, RESULTS_SECONDS);
      } else if (shard.phase === 'results') {
        _setPhase(shard, 'hub', 'hub', HUB_SECONDS);
      }
    }
  }
  const _timer = setInterval(_tick, 500);
  if (_timer.unref) _timer.unref();

  function _leave(socket) {
    const at = socketShard.get(socket.id);
    if (!at) return;
    socketShard.delete(socket.id);
    const { shard, slot } = at;
    shard.slots[slot] = null;
    shard.votes.delete(slot);
    if (shard.teams) delete shard.teams[slot];
    socket.leave(_room(shard));
    io.to(_room(shard)).emit('pub:left', { slot });
    log('PUBHUB', `${shard.id} slot ${slot} left (${_count(shard)}/${MAX_PLAYERS})`);
    if (_count(shard) === 0) {
      shards.delete(shard.id);
      return;
    }
    _electAuthority(shard);
    _broadcastRoster(shard);
    // A team round that drops below its minimum cannot continue — but a
    // dropped connection usually rejoins within a second or two, so _tick only
    // ends the round if the lobby stays short for SHORT_GRACE_MS.
    if (shard.phase === 'round' && _count(shard) < _minFor(shard) && !shard.shortSince) shard.shortSince = _now();
  }

  const SHORT_GRACE_MS = 10000;
  function _minFor(shard) { return MODES[shard.mode] ? MODES[shard.mode].minPlayers : 1; }

  function _clampNum(v, lo, hi) {
    v = Number(v);
    if (!Number.isFinite(v)) return null;
    return Math.max(lo, Math.min(hi, v));
  }

  io.on('connection', (socket) => {
    socket.on('pub:join', (hello) => {
      if (socketShard.has(socket.id)) return;
      hello = (hello && typeof hello === 'object') ? hello : {};
      let shard = [...shards.values()].find(s => _count(s) < MAX_PLAYERS);
      if (!shard) shard = _newShard();
      const slot = shard.slots.findIndex(s => !s);
      shard.slots[slot] = {
        socketId: socket.id,
        name: String(hello.name || ('Player ' + (slot + 1))).replace(/[<>]/g, '').slice(0, 20),
        color: /^#[0-9a-f]{3,8}$/i.test(hello.color || '') ? hello.color : null,
        joinedAt: _now(),
      };
      socketShard.set(socket.id, { shard, slot });
      socket.join(_room(shard));
      const cur = shard.slots[shard.authority];
      if (!cur || cur.away) _electAuthority(shard);
      socket.emit('pub:welcome', {
        slot, shardId: shard.id, label: shard.label, max: MAX_PLAYERS,
        roster: _roster(shard), authority: shard.authority,
        phase: _phasePayload(shard),
      });
      socket.to(_room(shard)).emit('pub:joined', { slot, name: shard.slots[slot].name, color: shard.slots[slot].color });
      _broadcastRoster(shard);
      log('PUBHUB', `${shard.id} slot ${slot} joined (${_count(shard)}/${MAX_PLAYERS})`);
    });

    // Fighter state, 20 Hz. Volatile: a dropped packet is replaced by the next.
    socket.on('pub:state', (state) => {
      const at = socketShard.get(socket.id);
      if (!at || !state || typeof state !== 'object') return;
      socket.volatile.to(_room(at.shard)).emit('pub:state', { slot: at.slot, s: state });
    });

    // Shared-world snapshot (bots, ball). Only the authority may author it.
    socket.on('pub:world', (world) => {
      const at = socketShard.get(socket.id);
      if (!at || at.slot !== at.shard.authority || !world || typeof world !== 'object') return;
      socket.volatile.to(_room(at.shard)).emit('pub:world', world);
    });

    // A hit decided on the attacker's machine. Human targets receive it
    // directly; bot targets go to the authority, which owns the bots.
    socket.on('pub:hit', (h) => {
      const at = socketShard.get(socket.id);
      if (!at || !h || typeof h !== 'object') return;
      const { shard, slot } = at;
      const dmg = _clampNum(h.dmg, 0, 80), kb = _clampNum(h.kb, 0, 26);
      if (dmg === null || kb === null) return;
      // Only the authority may speak for a bot attacker.
      let attacker = slot;
      if (typeof h.attacker === 'string' && /^b\d{1,3}$/.test(h.attacker)) {
        if (slot !== shard.authority) return;
        attacker = h.attacker;
      }
      const out = { attacker, target: h.target, dmg, kb };
      if (Number.isInteger(h.target)) {
        const t = shard.slots[h.target];
        if (t && h.target !== slot) io.to(t.socketId).emit('pub:hit', out);
      } else if (typeof h.target === 'string' && /^b\d{1,3}$/.test(h.target)) {
        const a = shard.slots[shard.authority];
        if (a && shard.authority !== slot) io.to(a.socketId).emit('pub:hit', out);
      }
    });

    // Generic in-round events (goal scored, round over, ball touch). Round
    // events that change shared state are only accepted from the authority.
    socket.on('pub:event', (ev) => {
      const at = socketShard.get(socket.id);
      if (!at || !ev || typeof ev !== 'object' || typeof ev.type !== 'string') return;
      const { shard, slot } = at;
      if (ev.type === 'roundOver') {
        if (slot !== shard.authority || shard.phase !== 'round') return;
        shard.roundResult = { reason: 'win', winner: ev.winner, score: ev.score };
        _setPhase(shard, 'results', shard.mode, RESULTS_SECONDS);
        return;
      }
      if (ev.type === 'ballTouch') {
        const a = shard.slots[shard.authority];
        if (a && shard.authority !== slot) io.to(a.socketId).emit('pub:event', Object.assign({}, ev, { slot }));
        return;
      }
      if (ev.type === 'goal' || ev.type === 'kill') {
        if (ev.type === 'goal' && slot !== shard.authority) return;
        socket.to(_room(shard)).emit('pub:event', Object.assign({}, ev, { slot }));
      }
    });

    socket.on('pub:vote', (key) => {
      const at = socketShard.get(socket.id);
      if (!at || at.shard.phase !== 'vote') return;
      const opt = _voteOptions(at.shard).find(o => o.key === key && o.enabled);
      if (!opt) return;
      at.shard.votes.set(at.slot, key);
      io.to(_room(at.shard)).emit('pub:votes', _tally(at.shard));
    });

    // Tab hidden / visible again.
    socket.on('pub:away', (away) => {
      const at = socketShard.get(socket.id);
      if (!at) return;
      const rec = at.shard.slots[at.slot];
      if (!rec) return;
      rec.away = !!away;
      const cur = at.shard.slots[at.shard.authority];
      // Move the job off an away authority; never steal it from a present one.
      if (!cur || cur.away) _electAuthority(at.shard);
    });

    socket.on('pub:chat', (text) => {
      const at = socketShard.get(socket.id);
      if (!at || typeof text !== 'string') return;
      const clean = text.replace(/[<>]/g, '').slice(0, 140).trim();
      if (!clean) return;
      io.to(_room(at.shard)).emit('pub:chat', { slot: at.slot, name: at.shard.slots[at.slot].name, text: clean });
    });

    socket.on('pub:leave', () => _leave(socket));
    socket.on('disconnect', (reason) => {
      if (socketShard.has(socket.id)) console.log('[pubhub] ' + socket.id + ' disconnected: ' + reason);
      _leave(socket);
    });
  });

  return {
    stats() {
      return [...shards.values()].map(s => ({ id: s.id, players: _count(s), phase: s.phase, mode: s.mode }));
    },
  };
}

module.exports = { attachPublicHub, MAX_PLAYERS, MODES };
