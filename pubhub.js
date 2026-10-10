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
const RESULTS_SECONDS = 9;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

// Modes offered in the vote. `ready: false` modes are shown but not votable yet.
//   team    — the server splits the lobby into two teams for the round
//   seconds — round length (default ROUND_MAX_SECONDS)
//   target  — score that ends the round early (KOs, or seconds on the hill)
const MODES = {
  hub:        { label: 'Keep fighting',    ready: true,  minPlayers: 1 },
  soccer:     { label: 'Soccer',           ready: true,  minPlayers: 2, team: true },
  basketball: { label: 'Basketball',       ready: true,  minPlayers: 2, team: true },
  scramble:   { label: 'Loadout Scramble', ready: true,  minPlayers: 2, seconds: 240, target: 10 },
  tag:        { label: 'Infection',        ready: true,  minPlayers: 2, seconds: 120 },
  koth:       { label: 'King of the Hill', ready: true,  minPlayers: 2, seconds: 240, target: 30 },
  horde:      { label: 'Horde Defense',    ready: true,  minPlayers: 1, seconds: 300 },
  battleroyale: { label: 'Battle Royale',  ready: false, minPlayers: 1 },
  chaos:      { label: 'Chaos',            ready: false, minPlayers: 1 },
};
const HORDE_WAVES = 5;
const EMPTY_PRIVATE_MS = 60000;

function attachPublicHub(io, opts) {
  opts = opts || {};
  const log = typeof opts.log === 'function' ? opts.log : () => {};
  const shards = new Map();          // id -> shard
  const socketShard = new Map();     // socket.id -> { shard, slot }
  let nextShardNum = 1;

  function _now() { return Date.now(); }

  function _newCode() {
    for (;;) {
      let c = '';
      for (let i = 0; i < 6; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      if (![...shards.values()].some(s => s.code === c)) return c;
    }
  }

  // Every shard has a join code. A private shard is only reachable by its
  // code (a shared link or a friend invite); public ones also fill from the
  // "Public Server" button.
  function _newShard(isPrivate) {
    const id = 'PUB' + (nextShardNum++);
    const shard = {
      id,
      code: _newCode(),
      private: !!isPrivate,
      label: isPrivate ? 'Private Lobby' : 'Public Server ' + ([...shards.values()].filter(s => !s.private).length + 1),
      slots: new Array(MAX_PLAYERS).fill(null),
      authority: -1,
      host: -1,                      // private lobbies: the slot that starts rounds
      phase: 'hub',
      mode: 'hub',
      phaseEndsAt: _now() + HUB_SECONDS * 1000,
      votes: new Map(),              // slot -> mode key
      teams: null,                   // slot -> 0|1 during team rounds
      roundResult: null,
      scores: {},                    // slot -> round score (KOs, hill seconds, infections)
      kills: {}, deaths: {},         // slot -> count, this round
      infected: null,                // Infection: slot -> true
      lives: 0, wave: 0,             // Horde: shared lives, current wave
    };
    shards.set(id, shard);
    return shard;
  }

  function _room(shard) { return 'pubhub:' + shard.id; }
  function _count(shard) { return shard.slots.filter(Boolean).length; }

  function _roster(shard) {
    return shard.slots.map((s, i) => s ? { slot: i, name: s.name, color: s.color, fc: s.fc } : null).filter(Boolean);
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
      round: _roundState(shard),
    };
  }

  function _roundState(shard) {
    const m = MODES[shard.mode] || {};
    return {
      scores: shard.scores, target: m.target || 0,
      infected: shard.infected ? Object.keys(shard.infected).map(Number) : null,
      lives: shard.lives, wave: shard.wave, waves: HORDE_WAVES,
    };
  }

  function _broadcastRound(shard) {
    io.to(_room(shard)).emit('pub:round', _roundState(shard));
  }

  // Ranked scoreboard for the results card. Built at the moment the round
  // ends, so a player who leaves during the results still appears on it.
  function _board(shard) {
    return shard.slots.map((s, i) => s ? {
      slot: i, name: s.name,
      score: shard.scores[i] || 0, kills: shard.kills[i] || 0, deaths: shard.deaths[i] || 0,
      infected: shard.infected ? !!shard.infected[i] : undefined,
    } : null).filter(Boolean).sort((a, b) => (b.score - a.score) || (b.kills - a.kills) || (a.deaths - b.deaths));
  }

  function _finish(shard, result) {
    if (shard.phase !== 'round') return;
    shard.roundResult = Object.assign({ board: _board(shard) }, result);
    _setPhase(shard, 'results', shard.mode, RESULTS_SECONDS);
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
    io.to(_room(shard)).emit('pub:roster', {
      roster: _roster(shard), authority: shard.authority, host: shard.host, count: _count(shard), max: MAX_PLAYERS,
      // Which games are playable depends on the head count, so it travels with the roster.
      options: _voteOptions(shard),
    });
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
    if (phase === 'vote' || phase === 'hub') shard.votes.clear();
    if (phase !== 'round' && phase !== 'results') { shard.teams = null; shard.infected = null; }
    if (phase === 'round') {
      shard.roundResult = null;
      shard.scores = {}; shard.kills = {}; shard.deaths = {};
      shard.infected = null; shard.wave = 0; shard.lives = 0;
      if (mode === 'tag') { shard.infected = {}; _infectRandom(shard); }
      if (mode === 'horde') shard.lives = 3 + 2 * _count(shard);
    }
    _broadcastPhase(shard);
  }

  function _infectRandom(shard) {
    const free = shard.slots.map((s, i) => (s && !shard.infected[i]) ? i : -1).filter(i => i >= 0);
    if (!free.length) return -1;
    const pick = free[Math.floor(Math.random() * free.length)];
    shard.infected[pick] = true;
    return pick;
  }

  function _infect(shard, slot, by) {
    if (!shard.infected || shard.infected[slot] || !shard.slots[slot]) return;
    shard.infected[slot] = true;
    if (Number.isInteger(by)) shard.scores[by] = (shard.scores[by] || 0) + 1;
    io.to(_room(shard)).emit('pub:event', { type: 'infected', slot, by: Number.isInteger(by) ? by : null });
    _broadcastRound(shard);
    if (shard.slots.every((s, i) => !s || shard.infected[i])) _finish(shard, { reason: 'win', winner: 'infected' });
  }

  function _assignTeams(shard) {
    const teams = {};
    let i = 0;
    shard.slots.forEach((s, slot) => { if (s) teams[slot] = (i++) % 2; });
    shard.teams = teams;
  }

  // `prefer` breaks a tie (private lobbies: the game the host is standing on).
  function _resolveVote(shard, prefer) {
    const opts = _voteOptions(shard).filter(o => o.enabled && !(shard.private && o.key === 'hub'));
    const tally = _tally(shard);
    let best = [], bestN = -1;
    for (const o of opts) {
      const n = tally[o.key] || 0;
      if (n > bestN) { best = [o.key]; bestN = n; } else if (n === bestN) best.push(o.key);
    }
    // Nobody voted: stay in the hub rather than yank people into a mode.
    if (bestN <= 0) return 'hub';
    if (prefer && best.includes(prefer)) return prefer;
    return best[Math.floor(Math.random() * best.length)];
  }

  function _tick() {
    const now = _now();
    for (const shard of shards.values()) {
      if (_count(shard) === 0) {
        if (!shard.emptySince || now - shard.emptySince > EMPTY_PRIVATE_MS) shards.delete(shard.id);
        continue;
      }
      if (shard.shortSince) {
        if (shard.phase !== 'round' || _count(shard) >= _minFor(shard)) {
          shard.shortSince = 0;
        } else if (now - shard.shortSince > SHORT_GRACE_MS) {
          shard.shortSince = 0;
          _finish(shard, { reason: 'players' });
          continue;
        }
      }
      // A private lobby waits in its room until the host starts a round.
      if (shard.private && shard.phase === 'hub') continue;
      if (now < shard.phaseEndsAt) continue;
      if (shard.phase === 'hub') {
        _setPhase(shard, 'vote', 'hub', VOTE_SECONDS);
      } else if (shard.phase === 'vote') {
        const winner = _resolveVote(shard);
        if (winner === 'hub') {
          _setPhase(shard, 'hub', 'hub', HUB_SECONDS);
        } else {
          if (MODES[winner].team) _assignTeams(shard); else shard.teams = null;
          _setPhase(shard, 'round', winner, MODES[winner].seconds || ROUND_MAX_SECONDS);
        }
      } else if (shard.phase === 'round') {
        // Out of time. Infection: whoever is still clean has won. Horde: the
        // waves were not cleared. Score modes: the leader takes it.
        if (shard.mode === 'tag') {
          for (let i = 0; i < shard.slots.length; i++) if (shard.slots[i] && !shard.infected[i]) shard.scores[i] = (shard.scores[i] || 0) + 3;
          _finish(shard, { reason: 'win', winner: 'survivors' });
        } else if (shard.mode === 'horde') {
          _finish(shard, { reason: 'lose' });
        } else if (shard.mode === 'scramble' || shard.mode === 'koth') {
          const b = _board(shard);
          _finish(shard, (b[0] && b[0].score > 0) ? { reason: 'win', winner: b[0].slot } : { reason: 'time' });
        } else {
          _finish(shard, { reason: 'time' });
        }
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
    // Infection: the round needs at least one carrier and one clean player.
    if (shard.phase === 'round' && shard.infected) {
      delete shard.infected[slot];
      const left = shard.slots.map((s, i) => s ? i : -1).filter(i => i >= 0);
      if (left.length > 1 && !left.some(i => shard.infected[i])) { _infectRandom(shard); _broadcastRound(shard); }
      else if (left.length > 1 && left.every(i => shard.infected[i])) _finish(shard, { reason: 'win', winner: 'infected' });
    }
    socket.leave(_room(shard));
    io.to(_room(shard)).emit('pub:left', { slot });
    log('PUBHUB', `${shard.id} slot ${slot} left (${_count(shard)}/${MAX_PLAYERS})`);
    if (_count(shard) === 0) {
      // A private lobby outlives its last player for a minute: its code is in
      // links people are still opening, and a lone player's dropped connection
      // should come back to the same lobby.
      if (shard.private) { shard.emptySince = _now(); shard.host = -1; } else shards.delete(shard.id);
      return;
    }
    _electAuthority(shard);
    // The host left: the lobby passes to someone still in it, at random.
    if (shard.private && shard.host === slot) {
      const left = shard.slots.map((s, i) => s ? i : -1).filter(i => i >= 0);
      shard.host = left[Math.floor(Math.random() * left.length)];
    }
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
      // { create: 'private' } opens a new private lobby; { code } joins the
      // lobby with that code (a shared link, or a friend's invite); neither
      // drops the player into any public lobby with room.
      let shard;
      if (hello.create === 'private') {
        shard = _newShard(true);
      } else if (typeof hello.code === 'string' && hello.code) {
        const code = hello.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
        shard = [...shards.values()].find(s => s.code === code);
        if (!shard) { socket.emit('pub:joinFail', { reason: 'notfound' }); return; }
        if (_count(shard) >= MAX_PLAYERS) { socket.emit('pub:joinFail', { reason: 'full' }); return; }
      } else {
        shard = [...shards.values()].find(s => !s.private && _count(s) < MAX_PLAYERS);
        if (!shard) shard = _newShard(false);
      }
      if (_count(shard) === 0 && shard.emptySince) {
        shard.emptySince = 0;
        shard.authority = -1;
        _setPhase(shard, 'hub', 'hub', HUB_SECONDS);
      }
      const slot = shard.slots.findIndex(s => !s);
      shard.slots[slot] = {
        socketId: socket.id,
        name: String(hello.name || ('Player ' + (slot + 1))).replace(/[<>]/g, '').slice(0, 20),
        color: /^#[0-9a-f]{3,8}$/i.test(hello.color || '') ? hello.color : null,
        // Friend code (social.js): lets lobby-mates send each other a friend request.
        fc: /^[A-Z0-9]{10}$/.test(hello.fc || '') ? hello.fc : null,
        joinedAt: _now(),
      };
      // Whoever opens a private lobby (or is first back into an empty one) hosts it.
      if (shard.private && (shard.host < 0 || !shard.slots[shard.host])) shard.host = slot;
      // Arriving mid-Infection as a clean player would be a free win.
      if (shard.phase === 'round' && shard.infected) shard.infected[slot] = true;
      socketShard.set(socket.id, { shard, slot });
      socket.join(_room(shard));
      const cur = shard.slots[shard.authority];
      if (!cur || cur.away) _electAuthority(shard);
      socket.emit('pub:welcome', {
        slot, shardId: shard.id, label: shard.label, max: MAX_PLAYERS,
        code: shard.code, private: shard.private, host: shard.host,
        roster: _roster(shard), authority: shard.authority,
        phase: _phasePayload(shard),
      });
      socket.to(_room(shard)).emit('pub:joined', { slot, name: shard.slots[slot].name, color: shard.slots[slot].color });
      _broadcastRoster(shard);
      if (shard.phase === 'round' && shard.infected) _broadcastRound(shard);
      log('PUBHUB', `${shard.id} slot ${slot} joined (${_count(shard)}/${MAX_PLAYERS})`);
    });

    // Fighter state, 20 Hz. Volatile: a dropped packet is replaced by the next.
    socket.on('pub:state', (state) => {
      const at = socketShard.get(socket.id);
      if (!at || !state || typeof state !== 'object') return;
      socket.volatile.to(_room(at.shard)).emit('pub:state', { slot: at.slot, s: state });
    });

    // Projectile snapshots (client NetProj): relayed as-is, capped, volatile.
    socket.on('pub:proj', (list) => {
      const at = socketShard.get(socket.id);
      if (!at || !Array.isArray(list) || list.length > 16) return;
      socket.volatile.to(_room(at.shard)).emit('pub:proj', { slot: at.slot, p: list });
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
        // Infection spreads by touch: a carrier's hit on a clean player.
        if (t && h.target !== slot && shard.phase === 'round' && shard.infected
            && attacker === slot && shard.infected[slot] && !shard.infected[h.target]) {
          _infect(shard, h.target, slot);
        }
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
        const m = MODES[shard.mode] || {};
        // Only rounds the authority referees end this way; the rest are scored here.
        if (m.team) {
          if (ev.winner !== 0 && ev.winner !== 1) return;
          const score = Array.isArray(ev.score) ? ev.score.slice(0, 2).map(n => _clampNum(n, 0, 99) || 0) : null;
          _finish(shard, { reason: 'win', winner: ev.winner, score });
        } else if (shard.mode === 'horde') {
          _finish(shard, { reason: 'win', winner: 'team' });
        }
        return;
      }
      // A KO, reported by whoever owns the victim: the player themself, or the
      // authority for one of its bots ({ bot: 'b3' }).
      if (ev.type === 'kill') {
        const isBot = typeof ev.bot === 'string' && /^b\d{1,3}$/.test(ev.bot);
        if (isBot && slot !== shard.authority) return;
        const rec = shard.slots[slot];
        const now = _now();
        if (!isBot) {
          if (rec._lastDeath && now - rec._lastDeath < 1000) return;
          rec._lastDeath = now;
        }
        const by = (Number.isInteger(ev.by) && shard.slots[ev.by] && (isBot || ev.by !== slot)) ? ev.by
          : (typeof ev.by === 'string' && /^b\d{1,3}$/.test(ev.by) ? ev.by : null);
        io.to(_room(shard)).emit('pub:event', { type: 'kill', slot: isBot ? null : slot, bot: isBot ? ev.bot : null, by });
        if (shard.phase !== 'round') return;
        if (!isBot) shard.deaths[slot] = (shard.deaths[slot] || 0) + 1;
        if (Number.isInteger(by)) shard.kills[by] = (shard.kills[by] || 0) + 1;
        if (shard.mode === 'scramble' && Number.isInteger(by)) {
          shard.scores[by] = (shard.scores[by] || 0) + 1;
          _broadcastRound(shard);
          if (shard.scores[by] >= MODES.scramble.target) _finish(shard, { reason: 'win', winner: by });
        } else if (shard.mode === 'horde') {
          if (isBot) { if (Number.isInteger(by)) shard.scores[by] = (shard.scores[by] || 0) + 1; }
          else shard.lives = Math.max(0, shard.lives - 1);
          _broadcastRound(shard);
          if (!isBot && shard.lives <= 0) _finish(shard, { reason: 'lose' });
        } else if (shard.mode === 'tag' && !isBot && shard.infected && !shard.infected[slot]) {
          // A clean player who dies (a fall, a carrier's finishing hit) turns.
          _infect(shard, slot, Number.isInteger(by) && shard.infected[by] ? by : null);
        }
        return;
      }
      // King of the Hill: once a second the authority names whoever holds the
      // hill alone. The score lives here so it survives a change of authority.
      if (ev.type === 'kothTick') {
        if (slot !== shard.authority || shard.phase !== 'round' || shard.mode !== 'koth') return;
        const now = _now();
        if (shard._kothAt && now - shard._kothAt < 800) return;
        shard._kothAt = now;
        if (!Number.isInteger(ev.holder) || !shard.slots[ev.holder]) return;
        shard.scores[ev.holder] = (shard.scores[ev.holder] || 0) + 1;
        _broadcastRound(shard);
        if (shard.scores[ev.holder] >= MODES.koth.target) _finish(shard, { reason: 'win', winner: ev.holder });
        return;
      }
      if (ev.type === 'wave') {
        if (slot !== shard.authority || shard.phase !== 'round' || shard.mode !== 'horde') return;
        const n = _clampNum(ev.n, 1, HORDE_WAVES);
        if (n === null || n <= shard.wave) return;
        shard.wave = n;
        _broadcastRound(shard);
        return;
      }
      if (ev.type === 'ballTouch') {
        const a = shard.slots[shard.authority];
        if (a && shard.authority !== slot) io.to(a.socketId).emit('pub:event', Object.assign({}, ev, { slot }));
        return;
      }
      if (ev.type === 'goal') {
        if (slot !== shard.authority) return;
        socket.to(_room(shard)).emit('pub:event', Object.assign({}, ev, { slot }));
      }
    });

    // A friend code that was not ready when the player joined.
    socket.on('pub:fc', (fc) => {
      const at = socketShard.get(socket.id);
      const rec = at && at.shard.slots[at.slot];
      if (!rec || rec.fc || !/^[A-Z0-9]{10}$/.test(fc || '')) return;
      rec.fc = fc;
      _broadcastRoster(at.shard);
    });

    // Quick emotes: a fixed set of reactions, so there is nothing to moderate.
    socket.on('pub:emote', (id) => {
      const at = socketShard.get(socket.id);
      if (!at || !Number.isInteger(id) || id < 0 || id > 15) return;
      const rec = at.shard.slots[at.slot];
      const now = _now();
      if (!rec || (rec._lastEmote && now - rec._lastEmote < 700)) return;
      rec._lastEmote = now;
      io.to(_room(at.shard)).emit('pub:emote', { slot: at.slot, id });
    });

    // Private lobbies have no vote clock. Players pick a game by standing on
    // its pad in the waiting room (a vote that follows them as they move, and
    // clears when they step off), and the round begins when the HOST starts it:
    // the pad with the most players wins, the host's own pad breaking a tie.
    socket.on('pub:start', () => {
      const at = socketShard.get(socket.id);
      if (!at || !at.shard.private || at.shard.phase !== 'hub' || at.slot !== at.shard.host) return;
      const shard = at.shard;
      const winner = _resolveVote(shard, shard.votes.get(at.slot));
      if (winner === 'hub') { socket.emit('pub:startFail', { reason: 'nopick' }); return; }
      if (MODES[winner].team) _assignTeams(shard); else shard.teams = null;
      _setPhase(shard, 'round', winner, MODES[winner].seconds || ROUND_MAX_SECONDS);
    });

    socket.on('pub:vote', (key) => {
      const at = socketShard.get(socket.id);
      if (!at) return;
      const shard = at.shard;
      const room = shard.private && shard.phase === 'hub';
      if (shard.phase !== 'vote' && !room) return;
      if (room && !key) {
        if (!shard.votes.delete(at.slot)) return;
      } else {
        const opt = _voteOptions(shard).find(o => o.key === key && o.enabled && !(room && o.key === 'hub'));
        if (!opt) return;
        shard.votes.set(at.slot, key);
      }
      io.to(_room(shard)).emit('pub:votes', _tally(shard));
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
      return [...shards.values()].map(s => ({ id: s.id, private: s.private, players: _count(s), phase: s.phase, mode: s.mode }));
    },
  };
}

module.exports = { attachPublicHub, MAX_PLAYERS, MODES };
