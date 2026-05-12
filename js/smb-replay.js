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

  // Modes that are not worth recording
  const SKIP_MODES = new Set(['battleroyale', 'training', 'exploration']);

  // ── Recording state ─────────────────────────────────────────────────────────
  let _recording  = false;
  let _frames     = [];        // array indexed by recorded-frame number
  let _platFrames = {};        // { recordedFrameIdx: [platformSnapshot] }
  let _meta       = null;
  let _startFC    = 0;         // value of frameCount when recording began

  // ── Database handle ─────────────────────────────────────────────────────────
  let _db = null;

  // ── Playback state ──────────────────────────────────────────────────────────
  let _pbData    = null;
  let _pbFrame   = 0;          // float; supports sub-frame interpolation in tick
  let _pbPlaying = false;
  let _pbRaf     = 0;
  let _pbLastTs  = 0;

  // ── Arena background palette (approximations) ───────────────────────────────
  const ARENA_BG = {
    grass:      '#0e2612', forest:     '#0a1a0d', cave:       '#13101a',
    desert:     '#241606', snow:       '#141e29', city:       '#141420',
    volcano:    '#200600', space:      '#060610', underwater: '#06182a',
    mirror:     '#141426', cloud:      '#182034', cyberpunk:  '#080616',
    damnation:  '#160606', code:       '#060e06', god_domain: '#140820',
    training:   '#0f1520', soccer:     '#0b2209', void:       '#040410',
    crystal:    '#0a1428', circuit:    '#0c1010', castle:     '#12100a',
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
    }));
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
    if (typeof onlineMode !== 'undefined' && onlineMode) return;
    if (typeof gameMode  !== 'undefined' && SKIP_MODES.has(gameMode)) return;

    _recording  = true;
    _frames     = [];
    _platFrames = {};
    _startFC    = typeof frameCount !== 'undefined' ? frameCount : 0;
    _meta = {
      version:  GAME_VERSION,
      mode:     typeof gameMode       !== 'undefined' ? gameMode       : 'unknown',
      arenaKey: typeof currentArenaKey !== 'undefined' ? currentArenaKey : 'grass',
      date:     Date.now(),
    };
    _platFrames[0] = _snapPlatforms();
  }

  function recordFrame() {
    if (!_recording) return;
    const fc  = (typeof frameCount !== 'undefined' ? frameCount : 0) - _startFC;
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

    _persist({
      smb_replay: true,
      version:    GAME_VERSION,
      meta:       _meta,
      frames:     _frames,
      platFrames: _platFrames,
    });
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
        _renderFrame(Math.floor(_pbFrame));
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

  function _renderFrame(frameIdx) {
    const c = document.getElementById('replayCanvas');
    if (!c) return;
    const rctx = c.getContext('2d');
    const W = c.width, H = c.height;

    const snaps  = (_pbData && _pbData.frames[frameIdx]) || [];
    const plats  = _platsAt(frameIdx);
    const aKey   = (_pbData && _pbData.meta && _pbData.meta.arenaKey) || 'grass';

    rctx.clearRect(0, 0, W, H);
    rctx.fillStyle = ARENA_BG[aKey] || '#111';
    rctx.fillRect(0, 0, W, H);

    // Camera: centroid of all active players, clamped to game world
    let cx = GAME_W / 2, cy = GAME_H / 2;
    if (snaps.length) {
      const alive = snaps.filter(p => p.hp > 0);
      const src   = alive.length ? alive : snaps;
      cx = src.reduce((s, p) => s + p.x, 0) / src.length;
      cy = src.reduce((s, p) => s + p.y, 0) / src.length;
    }

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
    const headR   = 11 * sc;
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

    _renderFrame(Math.floor(_pbFrame));
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
    _renderFrame(Math.floor(_pbFrame));
    _syncUI();
  }

  function stepBack() {
    if (!_pbData) return;
    _pbPlaying = false;
    cancelAnimationFrame(_pbRaf);
    _pbFrame = Math.max(Math.floor(_pbFrame) - PLAYBACK_FPS * 5, 0);
    _renderFrame(Math.floor(_pbFrame));
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
    togglePlay,
    stepForward,
    stepBack,
    closeViewer,
  };

})();
