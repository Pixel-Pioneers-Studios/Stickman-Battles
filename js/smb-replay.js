'use strict';
// smb-replay.js — Match replay recording, storage, download, and viewer.
// Depends on: smb-globals.js (GAME_W, GAME_H, CHANGELOG, players, currentArena,
//             currentArenaKey, gameMode, frameCount, onlineMode)
// Loaded last; does not expose globals other than ReplaySystem.

const ReplaySystem = (() => {

  // ── Constants ───────────────────────────────────────────────────────────────
  // Embed the running game version into every replay file so mismatched
  // versions are detected at load time and refused instead of desyncing.
  const GAME_VERSION = (() => {
    try { return CHANGELOG[0].version; } catch (e) { return '?'; }
  })();

  const RECORD_EVERY_N = 3;    // sample every 3 game frames → ~20 fps at 62 fps cap
  const MAX_STORED     = 3;    // keep up to 3 replays in IndexedDB
  const PLAT_SNAP_EVERY = 30;  // re-snapshot platforms every N recorded frames (~1.5 s)
  const PLAYBACK_FPS   = 20;   // frames per second of recorded data during playback
  const DB_NAME        = 'smb_replays_v1';

  // No modes are skipped — record everything (training, minigames, exploration, etc.)
  const SKIP_MODES = new Set();

  // ── Recording state ─────────────────────────────────────────────────────────
  let _recording  = false;
  let _frames     = [];        // array indexed by recorded-frame number
  let _platFrames = {};        // { recordedFrameIdx: [platformSnapshot] }
  let _meta       = null;
  let _startFC    = 0;         // value of frameCount when recording began
  let _lastReplay = null;      // most recent completed replay object

  // ── Database handle ─────────────────────────────────────────────────────────
  let _db = null;

  // ── Playback state ──────────────────────────────────────────────────────────
  let _pbData    = null;
  let _pbFrame   = 0;          // float; supports sub-frame interpolation in tick
  let _pbPlaying = false;
  let _pbRaf     = 0;
  let _pbLastTs  = 0;
  // Eased camera position, persisted across rendered frames (null = needs snap).
  let _pbCam     = { x: null, y: null };

  // ── Arena background palette (approximations) ───────────────────────────────
  const ARENA_BG = {
    grass:      '#0e2612', forest:     '#0a1a0d', cave:       '#13101a',
    desert:     '#241606', snow:       '#141e29', city:       '#141420',
    volcano:    '#200600', space:      '#060610', underwater: '#06182a',
    mirror:     '#141426', cloud:      '#182034', cyberpunk:  '#080616',
    damnation:  '#160606', code:       '#060e06', god_domain: '#140820',
    training:   '#0f1520', soccer:     '#0b2209', void:       '#040410',
    crystal:    '#0a1428', circuit:    '#0c1010', castle:     '#12100a',
    sovereign:  '#0d0008', ruins:      '#1a1408', ice:        '#101c26',
  };

  // ════════════════════════════════════════════════════════════════════════════
  // IndexedDB helpers
  // ════════════════════════════════════════════════════════════════════════════

  function _openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('replays')) {
          db.createObjectStore('replays', { autoIncrement: true });
        }
      };
      req.onsuccess = e => resolve(e.target.result);
      req.onerror   = e => reject(e.target.error);
    });
  }

  function _ensureDB() {
    if (_db) return Promise.resolve(_db);
    return _openDB().then(db => { _db = db; return db; });
  }

  function _dbGetAll(db) {
    return new Promise((resolve, reject) => {
      const tx    = db.transaction('replays', 'readonly');
      const store = tx.objectStore('replays');
      const keys  = [];
      const vals  = [];
      store.openCursor().onsuccess = e => {
        const cur = e.target.result;
        if (!cur) { resolve({ keys, vals }); return; }
        keys.push(cur.key);
        vals.push(cur.value);
        cur.continue();
      };
      tx.onerror = e => reject(e.target.error);
    });
  }

  function _dbAdd(db, value) {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('replays', 'readwrite');
      tx.objectStore('replays').add(value).onsuccess = e => resolve(e.target.result);
      tx.onerror = e => reject(e.target.error);
    });
  }

  function _dbDelete(db, key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('replays', 'readwrite');
      tx.objectStore('replays').delete(key).onsuccess = () => resolve();
      tx.onerror = e => reject(e.target.error);
    });
  }

  async function _persist(replayObj) {
    try {
      const db = await _ensureDB();
      const { keys } = await _dbGetAll(db);
      if (keys.length >= MAX_STORED) await _dbDelete(db, keys[0]);
      await _dbAdd(db, replayObj);
    } catch (e) {
      console.warn('[Replay] IndexedDB save failed:', e);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Snapshotting
  // ════════════════════════════════════════════════════════════════════════════

  function _snapPlayers() {
    if (typeof players === 'undefined' || !Array.isArray(players)) return [];
    return players.filter(Boolean).map(p => ({
      x:     Math.round(p.x  * 10) / 10,
      y:     Math.round(p.y  * 10) / 10,
      vx:    Math.round((p.vx || 0) * 100) / 100,
      vy:    Math.round((p.vy || 0) * 100) / 100,
      hp:    Math.round(p.health   || 0),
      mhp:   Math.round(p.maxHealth || 100),
      f:     p.facing || 1,
      atk:   (p.attackTimer || 0) > 0 ? 1 : 0,
      sh:    p.shielding  ? 1 : 0,
      lives: p.lives || 0,
      col:   p.color  || '#fff',
      name:  p.name   || 'P',
      wk:    p.weaponKey || 'sword',
      ai:    p.isAI   ? 1 : 0,
      boss:  p.isBoss ? 1 : 0,
      // ── Added fields ──────────────────────────────────────────────────────
      // Without these a reader cannot tell a death-freeze from a real pose, an
      // i-frame whiff from a miss, or a hitstun lock from a deliberate stand.
      // Analysing a match without them means inferring state from hp/lives
      // deltas, which misreads the ~14-frame death freeze as a real position.
      g:     p.onGround ? 1 : 0,
      inv:   Math.round(p.invincible   || 0),
      stn:   Math.round(p.stunTimer    || 0),
      rag:   Math.round(p.ragdollTimer || 0),
      el:    Math.round(p.attackEndlag || 0),
      sm:    Math.round(p.superMeter   || 0),
      cls:   p.charClass || 'none',
    }));
  }

  // ── Event log ───────────────────────────────────────────────────────────────
  // Detected every game frame (before the sampling gate) by diffing fighter
  // state, so events carry the frame they actually happened on rather than the
  // frame a 20fps sample happened to catch. Nothing here mutates game state and
  // dealDamage() is untouched — this is pure observation.
  // ── Input track ─────────────────────────────────────────────────────────────
  // What each HUMAN player actually pressed, every frame. Frames are sampled at
  // 20fps and hold state only, so a swing start can be inferred but an ability,
  // a tapped jump or a 1-frame shield cannot. This track makes a replay into
  // training data for tools/ghost-build.js (the human mimic).
  //   held:    L=1 R=2 J=4 SH=8 D=16     pressed this frame: ATK=32 ABI=64 SUP=128
  // Stored run-length: per player, [[frame, mask], ...] appended only on change.
  const IN_L = 1, IN_R = 2, IN_J = 4, IN_SH = 8, IN_D = 16, IN_ATK = 32, IN_ABI = 64, IN_SUP = 128;
  let _inputs     = {};     // playerIdx -> [[fc, mask], ...]
  let _inLast     = {};     // playerIdx -> last mask written
  let _inPressed  = {};     // playerIdx -> edge bits pressed since last recordFrame
  if (typeof document !== 'undefined') {
    // Capture phase, observation only: runs before smb-input.js's handler and
    // never stops or alters the event.
    document.addEventListener('keydown', e => {
      if (!_recording || e.repeat || typeof players === 'undefined') return;
      const k = (typeof _eventKey === 'function') ? _eventKey(e) : e.key;
      players.forEach((p, i) => {
        const c = p && !p.isAI && p.controls;
        if (!c) return;
        let b = 0;
        if (k === c.attack) b |= IN_ATK;
        if (k === c.ability) b |= IN_ABI;
        if (k === c.super) b |= IN_SUP;
        if (b) _inPressed[i] = (_inPressed[i] || 0) | b;
      });
    }, true);
  }

  function _recordInputs(fc) {
    if (typeof players === 'undefined' || typeof keysDown === 'undefined') return;
    players.forEach((p, i) => {
      const c = p && !p.isAI && p.controls;
      if (!c || !c.left) return;
      let m = _inPressed[i] || 0;
      if (keysDown.has(c.left))   m |= IN_L;
      if (keysDown.has(c.right))  m |= IN_R;
      if (keysDown.has(c.jump))   m |= IN_J;
      if (keysDown.has(c.shield)) m |= IN_SH;
      if (c.down && keysDown.has(c.down)) m |= IN_D;
      _inPressed[i] = 0;
      if (m === _inLast[i]) return;
      _inLast[i] = m;
      (_inputs[i] || (_inputs[i] = [])).push([fc, m]);
    });
  }

  let _events   = [];
  let _prevSnap = null;   // [{hp, lives, x, y}] from the previous game frame
  let _bounds   = null;   // { minX, maxX, deathY } — the stage's kill boundary

  function _computeBounds() {
    // Finite fallbacks on purpose: JSON.stringify turns Infinity into null, which
    // would silently make every out-of-bounds test fail on a reloaded replay.
    let minX = -1e6, maxX = 1e6, deathY = GAME_H + 180;
    try {
      if (currentArena) {
        if (typeof currentArena.deathY === 'number') deathY = currentArena.deathY;
        // Union of every live floor segment. `.find()` returned only the first one,
        // which on The Circuit's segmented plate recorded bounds of -60..150 (the
        // left anchor) instead of the real -60..960, so _outOfBounds() treated most
        // of the stage as off-map.
        let lo = Infinity, hi = -Infinity;
        for (const pl of (currentArena.platforms || [])) {
          if (!pl || !pl.isFloor || pl.isFloorDisabled) continue;
          if (pl.x < lo) lo = pl.x;
          if (pl.x + pl.w > hi) hi = pl.x + pl.w;
        }
        if (isFinite(lo) && isFinite(hi)) { minX = lo; maxX = hi; }
      }
    } catch (e) { /* defaults stand */ }
    return { minX, maxX, deathY };
  }

  function _outOfBounds(e) {
    if (!_bounds) return false;
    return e.x < _bounds.minX || e.x > _bounds.maxX || e.y > _bounds.deathY;
  }

  // Attacker attribution is inferred, not authoritative: the nearest OTHER
  // fighter that is mid-swing. Recorded as `byGuess` so a reader never mistakes
  // it for engine-reported credit.
  function _guessAttacker(list, victimIdx) {
    const v = list[victimIdx];
    let best = null, bestD = Infinity;
    for (let i = 0; i < list.length; i++) {
      if (i === victimIdx) continue;
      const o = list[i];
      if (!o || o.hp <= 0) continue;
      const d = Math.hypot(o.x - v.x, o.y - v.y);
      if ((o.attackTimer || 0) > 0 && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function _detectEvents(rawFc) {
    if (typeof players === 'undefined' || !Array.isArray(players)) return;
    const live = players.filter(Boolean);
    const cur  = live.map(p => ({
      hp: Math.round(p.health || 0), lives: p.lives || 0,
      x: p.x, y: p.y, attackTimer: p.attackTimer || 0, name: p.name || 'P',
    }));
    if (_prevSnap && _prevSnap.length === cur.length) {
      for (let i = 0; i < cur.length; i++) {
        const a = _prevSnap[i], b = cur[i];
        const fi = (rawFc / RECORD_EVERY_N);
        // Damage: hp fell while still alive on both sides of the frame.
        if (b.hp < a.hp && b.hp > 0) {
          _events.push({ t: 'dmg', fi: Math.round(fi * 10) / 10, fc: rawFc, p: i,
                         v: a.hp - b.hp, hp: b.hp, byGuess: _guessAttacker(cur, i) });
        }
        // KO: hp crossed to zero. Cause is read from position AT the crossing,
        // before the death freeze and ragdoll move the body somewhere misleading.
        if (a.hp > 0 && b.hp <= 0) {
          _events.push({ t: 'ko', fi: Math.round(fi * 10) / 10, fc: rawFc, p: i,
                         cause: _outOfBounds(b) ? 'ringout' : 'damage',
                         x: Math.round(b.x), y: Math.round(b.y),
                         byGuess: _guessAttacker(cur, i) });
        }
        // Stock lost / respawn are separate from the KO by the freeze duration.
        if (b.lives < a.lives) {
          _events.push({ t: 'stock', fi: Math.round(fi * 10) / 10, fc: rawFc, p: i, lives: b.lives });
        }
        if (b.hp > a.hp && a.hp <= 0) {
          _events.push({ t: 'respawn', fi: Math.round(fi * 10) / 10, fc: rawFc, p: i,
                         x: Math.round(b.x), y: Math.round(b.y) });
        }
      }
    }
    _prevSnap = cur;
  }

  function _snapPlatforms() {
    if (typeof currentArena === 'undefined' || !currentArena ||
        !Array.isArray(currentArena.platforms)) return [];
    return currentArena.platforms.filter(Boolean).map(pl => [
      Math.round(pl.x),
      Math.round(pl.y),
      Math.round(pl.w),
      Math.round(pl.h || 16),
    ]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Recording API
  // ════════════════════════════════════════════════════════════════════════════

  function startRecording() {
    if ((typeof onlineMode !== 'undefined' && onlineMode) || window._pubHubActive) return;
    if (typeof gameMode  !== 'undefined' && SKIP_MODES.has(gameMode)) return;

    _recording  = true;
    _frames     = [];
    _platFrames = {};
    _lastReplay = null;
    _events     = [];
    _prevSnap   = null;
    _bounds     = _computeBounds();
    _inputs     = {};
    _inLast     = {};
    _inPressed  = {};
    _startFC    = typeof frameCount !== 'undefined' ? frameCount : 0;
    _meta = {
      version:  GAME_VERSION,
      mode:     typeof gameMode       !== 'undefined' ? gameMode       : 'unknown',
      arenaKey: typeof currentArenaKey !== 'undefined' ? currentArenaKey : 'grass',
      date:     Date.now(),
      // Stage kill boundary, so a reader never has to guess where "off the map"
      // is. Ring-out vs damage is unrecoverable after the fact without this.
      bounds:   _bounds,
      gameW:    typeof GAME_W !== 'undefined' ? GAME_W : 900,
      gameH:    typeof GAME_H !== 'undefined' ? GAME_H : 520,
      recordEveryN: RECORD_EVERY_N,
    };
    _platFrames[0] = _snapPlatforms();
  }

  function recordFrame() {
    if (!_recording) return;
    const fc  = (typeof frameCount !== 'undefined' ? frameCount : 0) - _startFC;
    // Events are detected at FULL frame rate — above the sampling gate — so a
    // KO lands on the frame it happened rather than the next 3-frame sample.
    _detectEvents(fc);
    _recordInputs(fc);
    if (fc % RECORD_EVERY_N !== 0) return;

    const idx = Math.floor(fc / RECORD_EVERY_N);
    _frames[idx] = _snapPlayers();

    if (idx > 0 && idx % PLAT_SNAP_EVERY === 0) {
      _platFrames[idx] = _snapPlatforms();
    }
  }

  function stopRecording() {
    if (!_recording) return;
    _recording = false;
    if (_frames.length < 10) return; // too short (< 0.5 s), discard

    // Determine winner name from surviving players
    let winnerName = null;
    if (typeof players !== 'undefined' && Array.isArray(players)) {
      const survivor = players.find(p => p && p.lives > 0 && !p.isBoss);
      if (survivor) winnerName = survivor.name;
    }

    const last = _frames[_frames.length - 1] || [];
    _meta.players    = last.map(p => ({ name: p.name, col: p.col, ai: p.ai, boss: p.boss }));
    _meta.winner     = winnerName;
    _meta.frameCount = _frames.length;
    _meta.durationSec = Math.round(_frames.length / PLAYBACK_FPS);

    // Pre-tallied summary so a match can be read without replaying every frame.
    const tally = {};
    for (const ev of _events) {
      const k = ev.p;
      tally[k] = tally[k] || { dmgTaken: 0, hitsTaken: 0, kos: 0, ringouts: 0 };
      if (ev.t === 'dmg') { tally[k].dmgTaken += ev.v; tally[k].hitsTaken++; }
      if (ev.t === 'ko')  { tally[k].kos++; if (ev.cause === 'ringout') tally[k].ringouts++; }
    }
    _meta.tally = tally;

    _lastReplay = {
      smb_replay: true,
      version:    GAME_VERSION,
      meta:       _meta,
      frames:     _frames,
      platFrames: _platFrames,
      events:     _events,
      // Per-frame human inputs (see _recordInputs). Absent in replays recorded
      // before 2026-09-21; readers must treat it as optional.
      inputs:     _inputs,
      inputBits:  { L: IN_L, R: IN_R, J: IN_J, SH: IN_SH, D: IN_D, ATK: IN_ATK, ABI: IN_ABI, SUP: IN_SUP },
    };
    _persist(_lastReplay);
  }

  function getLastReplay() {
    return _lastReplay ? JSON.parse(JSON.stringify(_lastReplay)) : null;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Download
  // ════════════════════════════════════════════════════════════════════════════

  async function _loadReplayByIndex(listIndex) {
    const db = await _ensureDB();
    const { vals } = await _dbGetAll(db);
    const origIdx = vals.length - 1 - listIndex;
    if (origIdx < 0 || origIdx >= vals.length) return null;
    return vals[origIdx];
  }

  async function watchReplay(listIndex) {
    let replay;
    try {
      replay = await _loadReplayByIndex(listIndex);
      if (!replay) return;
    } catch (e) {
      console.warn('[Replay] Watch read failed:', e);
      return;
    }
    if (!replay.smb_replay) { _viewerError('Not a valid Stickman Battles replay.'); return; }
    if (replay.version !== GAME_VERSION) {
      _viewerError(`Version mismatch — replay is v${replay.version}, this game is v${GAME_VERSION}.`);
      return;
    }
    if (!Array.isArray(replay.frames) || replay.frames.length === 0) {
      _viewerError('Replay file contains no frame data.'); return;
    }
    _startPlayback(replay);
  }

  async function downloadReplay(listIndex) {
    let replay;
    try {
      const db = await _ensureDB();
      const { keys, vals } = await _dbGetAll(db);
      // listIndex 0 = oldest; UI lists newest first (reversed index)
      const origIdx = vals.length - 1 - listIndex;
      if (origIdx < 0 || origIdx >= vals.length) return;
      replay = vals[origIdx];
    } catch (e) {
      console.warn('[Replay] Download read failed:', e);
      return;
    }

    const blob = new Blob([JSON.stringify(replay)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const d    = new Date(replay.meta.date);
    const ds   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    a.href     = url;
    a.download = `smb_replay_${replay.meta.arenaKey}_${ds}.smbreplay`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Replay list panel (inside game-over overlay)
  // ════════════════════════════════════════════════════════════════════════════

  function _renderReplayList(el, vals) {
    if (vals.length === 0) {
      el.innerHTML = '<span style="color:#445566;font-size:10px">No saved replays yet — they appear here after each match.</span>';
      return;
    }
    el.innerHTML = vals.slice().reverse().map((r, i) => {
      const d    = new Date(r.meta.date);
      const dStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const dur  = r.meta.durationSec != null
        ? `${Math.floor(r.meta.durationSec / 60)}m${String(r.meta.durationSec % 60).padStart(2, '0')}s`
        : '?';
      const label = `${dStr} · ${r.meta.mode || '?'} · ${r.meta.arenaKey || '?'} · ${dur}`;
      return `<div style="display:flex;align-items:center;gap:6px;margin:3px 0">` +
             `<span style="flex:1;font-size:10px;color:#8899bb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${label}">${label}</span>` +
             `<button onclick="ReplaySystem.watchReplay(${i})" ` +
             `style="flex-shrink:0;background:rgba(60,120,255,0.12);border:1px solid rgba(80,160,255,0.45);border-radius:4px;` +
             `color:#88ccff;padding:2px 8px;cursor:pointer;font-size:10px;letter-spacing:.5px">` +
             `&#9654; Watch</button>` +
             `<button onclick="ReplaySystem.downloadReplay(${i})" ` +
             `style="flex-shrink:0;background:none;border:1px solid rgba(80,160,255,0.25);border-radius:4px;` +
             `color:#5588aa;padding:2px 8px;cursor:pointer;font-size:10px;letter-spacing:.5px">` +
             `&#8681; Save</button>` +
             `</div>`;
    }).join('');
  }

  async function _refreshBrowserList(el) {
    if (!el) return;
    let vals;
    try {
      const db = await _ensureDB();
      ({ vals } = await _dbGetAll(db));
    } catch (e) {
      el.innerHTML = '<span style="color:#556;font-size:10px">Replay storage unavailable.</span>';
      return;
    }
    _renderReplayList(el, vals);
  }

  async function refreshReplayPanel() {
    const el = document.getElementById('replayPanelList');
    if (!el) return;
    await _refreshBrowserList(el);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // File loader (entry point for the viewer)
  // ════════════════════════════════════════════════════════════════════════════

  function openFilePicker() {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.smbreplay,application/json';
    input.onchange = e => {
      const file = e.target.files && e.target.files[0];
      if (file) loadFromFile(file);
    };
    input.click();
  }

  function loadFromFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      let data;
      try { data = JSON.parse(e.target.result); }
      catch (err) { _viewerError('File is not valid JSON.'); return; }

      if (!data.smb_replay) {
        _viewerError('Not a Stickman Battles replay file.');
        return;
      }
      if (data.version !== GAME_VERSION) {
        _viewerError(
          `Version mismatch — replay is v${data.version}, ` +
          `this game is v${GAME_VERSION}. ` +
          `Replays only play back on the exact same version to prevent desyncs.`
        );
        return;
      }
      if (!Array.isArray(data.frames) || data.frames.length === 0) {
        _viewerError('Replay file contains no frame data.');
        return;
      }
      _startPlayback(data);
    };
    reader.readAsText(file);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Viewer
  // ════════════════════════════════════════════════════════════════════════════

  function _viewerError(msg) {
    const el = document.getElementById('replayViewerError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    else     { console.warn('[Replay]', msg); }
  }

  function _startPlayback(data) {
    _pbData    = data;
    _pbFrame   = 0;
    _pbPlaying = false;
    cancelAnimationFrame(_pbRaf);

    const modal = document.getElementById('replayViewerModal');
    if (modal) modal.style.display = 'flex';

    const errEl = document.getElementById('replayViewerError');
    if (errEl) errEl.style.display = 'none';

    // Populate metadata header
    const hdr = document.getElementById('replayViewerMeta');
    if (hdr && data.meta) {
      const d   = new Date(data.meta.date);
      const ds  = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
      const dur = data.meta.durationSec != null
        ? `${Math.floor(data.meta.durationSec / 60)}m ${data.meta.durationSec % 60}s`
        : '?';
      const pnames = (data.meta.players || []).map(p => `<span style="color:${p.col || '#fff'}">${p.name}</span>`).join(' vs ');
      const winner = data.meta.winner ? `<span style="color:#ffcc44"> &bull; Winner: ${data.meta.winner}</span>` : '';
      hdr.innerHTML = `${ds} &bull; ${data.meta.mode || '?'} &bull; ${data.meta.arenaKey || '?'} &bull; ${dur}${winner}<br>${pnames}`;
    }

    const scrubber = document.getElementById('replayScrubber');
    if (scrubber) {
      scrubber.max   = String(data.frames.length - 1);
      scrubber.value = '0';
      scrubber.oninput = () => {
        _pbPlaying = false;
        cancelAnimationFrame(_pbRaf);
        _pbFrame = parseFloat(scrubber.value);
        _renderFrame(_pbFrame);
        _syncUI();
      };
    }

    _renderFrame(0);
    _syncUI();
  }

  // Returns the closest platform snapshot at or before frameIdx
  function _platsAt(frameIdx) {
    if (!_pbData || !_pbData.platFrames) return [];
    const nums = Object.keys(_pbData.platFrames).map(Number).sort((a, b) => a - b);
    let best = nums[0] != null ? nums[0] : 0;
    for (const k of nums) {
      if (k <= frameIdx) best = k;
      else break;
    }
    return _pbData.platFrames[best] || [];
  }

  // ─── Stickman renderer ────────────────────────────────────────────────────

  // Blend two recorded snapshots into an in-between pose. Recording runs at
  // ~20fps; rendering runs at display rate, so without this every frame is held
  // 3x and the result reads as a slideshow. Discrete fields (facing, attacking,
  // name…) always come from the earlier frame — only continuous ones are blended.
  const _TELEPORT_DIST = 150;   // beyond this a "move" is a respawn, not motion
  function _lerpSnaps(a, b, t) {
    if (!a) return b || [];
    if (!b || t <= 0) return a;
    return a.map((pa, i) => {
      const pb = b[i];
      if (!pb) return pa;
      // A respawn or portal jump must not be interpolated into a glide.
      if (Math.hypot(pb.x - pa.x, pb.y - pa.y) > _TELEPORT_DIST) return pa;
      return Object.assign({}, pa, {
        x:  pa.x  + (pb.x  - pa.x)  * t,
        y:  pa.y  + (pb.y  - pa.y)  * t,
        hp: pa.hp + (pb.hp - pa.hp) * t,
      });
    });
  }

  function _renderFrame(frameFloat) {
    const c = document.getElementById('replayCanvas');
    if (!c) return;
    const rctx = c.getContext('2d');
    const W = c.width, H = c.height;

    const frameIdx = Math.floor(frameFloat);
    const frac     = frameFloat - frameIdx;
    const rawA     = (_pbData && _pbData.frames[frameIdx])     || [];
    const rawB     = (_pbData && _pbData.frames[frameIdx + 1]) || null;
    const snaps    = _lerpSnaps(rawA, rawB, frac);
    const plats    = _platsAt(frameIdx);
    const aKey     = (_pbData && _pbData.meta && _pbData.meta.arenaKey) || 'grass';

    rctx.clearRect(0, 0, W, H);
    rctx.fillStyle = ARENA_BG[aKey] || '#111';
    rctx.fillRect(0, 0, W, H);

    // Camera: centroid of all active players, eased rather than snapped. The raw
    // centroid jumps hard whenever a fighter dies or respawns.
    let cx = GAME_W / 2, cy = GAME_H / 2;
    if (snaps.length) {
      const alive = snaps.filter(p => p.hp > 0);
      const src   = alive.length ? alive : snaps;
      cx = src.reduce((s, p) => s + p.x, 0) / src.length;
      cy = src.reduce((s, p) => s + p.y, 0) / src.length;
    }
    if (_pbCam.x === null || Math.hypot(cx - _pbCam.x, cy - _pbCam.y) > 400) {
      _pbCam.x = cx; _pbCam.y = cy;              // first frame or a scrub — snap
    } else {
      _pbCam.x += (cx - _pbCam.x) * 0.18;
      _pbCam.y += (cy - _pbCam.y) * 0.18;
    }
    cx = _pbCam.x; cy = _pbCam.y;

    const scale = Math.min(W / GAME_W, H / GAME_H) * 0.85;
    const offX  = W / 2 - cx * scale;
    const offY  = H / 2 - cy * scale;

    // Platforms
    rctx.fillStyle   = 'rgba(100,115,145,0.65)';
    rctx.strokeStyle = 'rgba(160,175,210,0.35)';
    rctx.lineWidth   = 1;
    for (const pl of plats) {
      const [px, py, pw, ph] = pl;
      rctx.fillRect(px * scale + offX, py * scale + offY, pw * scale, ph * scale);
      rctx.strokeRect(px * scale + offX, py * scale + offY, pw * scale, ph * scale);
    }

    // Stickmen
    for (const p of snaps) _drawStickman(rctx, p, scale, offX, offY);

    // Event popups — damage numbers and KO callouts float for ~1s of replay time
    // after the frame they occurred on, so the viewer can see what landed.
    const evs = (_pbData && _pbData.events) || [];
    for (const ev of evs) {
      const age = frameFloat - ev.fi;
      if (age < 0 || age > 20) continue;
      const src = snaps[ev.p] || rawA[ev.p];
      if (!src) continue;
      let ex = src.x * scale + offX;
      let ey = src.y * scale + offY - 60 * scale - age * 1.6;
      // A ring-out happens by definition off the side of the stage, so the
      // victim is off-canvas and an un-clamped callout draws into the void.
      // Pin it to the edge it left through instead of dropping it.
      if (ev.t === 'ko') {
        const M = 54;
        ex = Math.max(M, Math.min(W - M, ex));
        ey = Math.max(M, Math.min(H - M, ey));
      } else if (ex < 0 || ex > W || ey < 0 || ey > H) {
        continue;   // damage numbers off-screen are just noise
      }
      rctx.save();
      rctx.globalAlpha = Math.max(0, 1 - age / 20);
      rctx.textAlign   = 'center';
      if (ev.t === 'dmg') {
        rctx.fillStyle = '#ffdd55';
        rctx.font      = `bold ${Math.max(10, Math.round(13 * scale))}px sans-serif`;
        rctx.fillText(`-${ev.v}`, ex, ey);
      } else if (ev.t === 'ko') {
        rctx.fillStyle = ev.cause === 'ringout' ? '#66ccff' : '#ff5544';
        rctx.font      = `bold ${Math.max(12, Math.round(17 * scale))}px sans-serif`;
        rctx.fillText(ev.cause === 'ringout' ? 'RING OUT' : 'KO', ex, ey);
      }
      rctx.restore();
    }

    // Timestamp overlay
    const total = Math.round((_pbData ? _pbData.frames.length : 0) / PLAYBACK_FPS);
    const cur   = Math.round(frameIdx / PLAYBACK_FPS);
    const tStr  = `${Math.floor(cur  / 60)}:${String(cur  % 60).padStart(2, '0')} / ${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    rctx.fillStyle = 'rgba(0,0,0,0.5)';
    rctx.fillRect(4, 4, 106, 18);
    rctx.fillStyle = '#99aabb';
    rctx.font      = '11px monospace';
    rctx.fillText(tStr, 8, 17);
  }

  function _drawStickman(rctx, p, scale, offX, offY) {
    const wx   = p.x * scale + offX;
    const wy   = p.y * scale + offY;
    const sc   = scale * (p.boss ? 2.2 : 1.0);
    const dead = p.hp <= 0;
    const col  = p.col || '#ffffff';

    rctx.save();
    rctx.globalAlpha = dead ? 0.25 : 1.0;
    rctx.strokeStyle = col;
    rctx.fillStyle   = col;
    rctx.lineWidth   = Math.max(1, 2 * sc);
    rctx.lineCap     = 'round';

    // Anatomical anchor: feet are at p.y; head rises above
    const headR   = FIG_HEAD_R * sc;
    const neckLen = 5  * sc;
    const bodyLen = 30 * sc;
    const footY   = wy;
    const hipY    = footY - bodyLen - neckLen;
    const headCY  = hipY  - neckLen - headR;

    // Shield glow
    if (p.sh && !dead) {
      rctx.save();
      rctx.strokeStyle = '#66aaff';
      rctx.lineWidth   = 2 * sc;
      rctx.globalAlpha = 0.55;
      rctx.beginPath();
      rctx.arc(wx, headCY, headR * 2.5, 0, Math.PI * 2);
      rctx.stroke();
      rctx.restore();
    }

    // Attack flash arc on the weapon side
    if (p.atk && !dead) {
      rctx.save();
      rctx.fillStyle   = 'rgba(255,230,60,0.2)';
      rctx.globalAlpha = 0.7;
      rctx.beginPath();
      rctx.arc(wx + p.f * 22 * sc, hipY, headR * 1.6, 0, Math.PI * 2);
      rctx.fill();
      rctx.restore();
    }

    // Head
    rctx.beginPath();
    rctx.arc(wx, headCY, headR, 0, Math.PI * 2);
    rctx.fill();

    // Spine
    rctx.beginPath();
    rctx.moveTo(wx, headCY + headR);
    rctx.lineTo(wx, footY);
    rctx.stroke();

    // Arms
    const elbowY = hipY + bodyLen * 0.4;
    rctx.beginPath();
    rctx.moveTo(wx - 14 * sc, elbowY - 12 * sc);
    rctx.lineTo(wx,            elbowY);
    rctx.lineTo(wx + 14 * sc, elbowY - 12 * sc);
    rctx.stroke();

    // Legs
    rctx.beginPath();
    rctx.moveTo(wx, footY - 2 * sc);
    rctx.lineTo(wx - 10 * sc, footY + 22 * sc);
    rctx.moveTo(wx, footY - 2 * sc);
    rctx.lineTo(wx + 10 * sc, footY + 22 * sc);
    rctx.stroke();

    // Name tag
    rctx.font      = `${Math.max(8, Math.round(9 * sc))}px sans-serif`;
    rctx.fillStyle = col;
    rctx.textAlign = 'center';
    rctx.fillText(p.name, wx, headCY - headR - 4 * sc);
    rctx.textAlign = 'left';

    // HP bar
    if (p.mhp > 0) {
      const bw   = 32 * sc, bh = 4 * sc;
      const bx   = wx - bw / 2;
      const barY = headCY - headR - 4 * sc - 10 * sc;
      rctx.fillStyle = 'rgba(0,0,0,0.55)';
      rctx.fillRect(bx, barY, bw, bh);
      const pct = Math.max(0, Math.min(1, p.hp / p.mhp));
      rctx.fillStyle = pct > 0.5 ? '#33ee77' : pct > 0.25 ? '#ffcc33' : '#ff3333';
      rctx.fillRect(bx, barY, bw * pct, bh);
    }

    rctx.restore();
  }

  // ─── Playback controls ───────────────────────────────────────────────────────

  function _syncUI() {
    if (!_pbData) return;
    const fi = Math.floor(_pbFrame);
    const s  = document.getElementById('replayScrubber');
    if (s) s.value = fi;
    const btn = document.getElementById('replayPlayBtn');
    if (btn) btn.textContent = _pbPlaying ? '⏸' : '▶';
  }

  function _pbTick(ts) {
    if (!_pbPlaying || !_pbData) return;
    if (!_pbLastTs) _pbLastTs = ts;
    const dt = ts - _pbLastTs;
    _pbLastTs = ts;
    _pbFrame += (dt / 1000) * PLAYBACK_FPS;

    const maxFrame = _pbData.frames.length - 1;
    if (_pbFrame >= maxFrame) {
      _pbFrame   = maxFrame;
      _pbPlaying = false;
    }

    _renderFrame(_pbFrame);
    _syncUI();

    if (_pbPlaying) _pbRaf = requestAnimationFrame(_pbTick);
  }

  function togglePlay() {
    if (!_pbData) return;
    _pbPlaying = !_pbPlaying;
    if (_pbPlaying) {
      // Restart from beginning if at end
      if (_pbFrame >= (_pbData.frames.length - 1)) _pbFrame = 0;
      _pbLastTs = 0;
      _pbRaf    = requestAnimationFrame(_pbTick);
    } else {
      cancelAnimationFrame(_pbRaf);
    }
    _syncUI();
  }

  function stepForward() {
    if (!_pbData) return;
    _pbPlaying = false;
    cancelAnimationFrame(_pbRaf);
    _pbFrame = Math.min(Math.floor(_pbFrame) + PLAYBACK_FPS * 5, _pbData.frames.length - 1);
    _renderFrame(_pbFrame);
    _syncUI();
  }

  function stepBack() {
    if (!_pbData) return;
    _pbPlaying = false;
    cancelAnimationFrame(_pbRaf);
    _pbFrame = Math.max(Math.floor(_pbFrame) - PLAYBACK_FPS * 5, 0);
    _renderFrame(_pbFrame);
    _syncUI();
  }

  function closeViewer() {
    _pbPlaying = false;
    cancelAnimationFrame(_pbRaf);
    _pbData = null;
    const modal = document.getElementById('replayViewerModal');
    if (modal) modal.style.display = 'none';
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Public API
  // ════════════════════════════════════════════════════════════════════════════

  return {
    startRecording,
    recordFrame,
    stopRecording,
    watchReplay,
    downloadReplay,
    refreshReplayPanel,
    _refreshBrowserList,
    openFilePicker,
    loadFromFile,
    getLastReplay,
    togglePlay,
    stepForward,
    stepBack,
    closeViewer,
  };

})();
