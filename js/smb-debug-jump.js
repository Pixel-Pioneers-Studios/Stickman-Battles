'use strict';
// smb-debug-jump.js — F8 developer jump menu (story/cinematic/arena/boss fast-travel)
// Depends on: smb-globals.js, smb-debug-console.js, smb-story-engine.js, smb-menu-startcore.js
// Must load AFTER smb-debug-console.js

// ============================================================
// F8 DEVELOPER JUMP MENU
// Opens only when debugMode is true (F1/F2/F3 activates it,
// or type "debugmode" to toggle). No effect on normal gameplay.
// ============================================================

// ---- Jump menu helpers ----
function _dbgJumpMenuClose() {
  const p = document.getElementById('_dbgJumpPanel');
  if (p) p.remove();
}

function _dbgJumpMenuOpen() {
  _dbgJumpMenuClose(); // idempotent

  const ov = document.createElement('div');
  ov.id = '_dbgJumpPanel';
  ov.style.cssText = [
    'position:fixed','top:0','right:0','bottom:0','z-index:9995',
    'background:rgba(5,10,25,0.96)','border-left:2px solid #0f0',
    'width:320px','overflow-y:auto','font-family:monospace',
    'color:#0f0','padding:14px 16px','box-sizing:border-box',
  ].join(';');

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-size:1rem;font-weight:bold;letter-spacing:2px;margin-bottom:12px;border-bottom:1px solid #0a0;padding-bottom:8px;display:flex;align-items:center;justify-content:space-between;';
  hdr.innerHTML = '<span>⚡ DEV JUMP MENU</span>';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background:none;border:1px solid #0a0;color:#0f0;cursor:pointer;font-family:monospace;padding:2px 8px;border-radius:4px;font-size:0.9rem;';
  closeBtn.onclick = _dbgJumpMenuClose;
  hdr.appendChild(closeBtn);
  ov.appendChild(hdr);

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:0.72rem;color:#446644;margin-bottom:14px;';
  hint.textContent = 'F8 to toggle  •  dev-only  •  no effect when debugMode is off';
  ov.appendChild(hint);

  // Helper: section heading
  function _sec(label) {
    const d = document.createElement('div');
    d.style.cssText = 'font-size:0.78rem;letter-spacing:1px;color:#44bb66;margin:10px 0 5px;border-top:1px solid #0a0;padding-top:8px;';
    d.textContent = '── ' + label + ' ──';
    ov.appendChild(d);
  }

  // Helper: row with label + input + button
  function _row(label, inputEl, btnLabel, onBtn) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:5px;align-items:center;margin:4px 0;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:0.75rem;color:#88aa88;min-width:60px;';
    lbl.textContent = label;
    const btn = document.createElement('button');
    btn.textContent = btnLabel;
    btn.style.cssText = 'background:rgba(0,180,0,0.18);border:1px solid #0a0;color:#0f0;font-family:monospace;font-size:0.75rem;padding:3px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;';
    btn.onclick = () => { onBtn(inputEl ? inputEl.value : null); };
    if (inputEl) {
      inputEl.style.cssText = 'flex:1;background:rgba(0,30,0,0.9);border:1px solid #0a0;color:#0f0;font-family:monospace;font-size:0.75rem;padding:3px 6px;border-radius:4px;min-width:0;';
      row.appendChild(lbl); row.appendChild(inputEl); row.appendChild(btn);
    } else {
      btn.style.width = '100%';
      row.appendChild(lbl); row.appendChild(btn);
    }
    ov.appendChild(row);
  }

  // Helper: styled select
  function _sel(optMap) {
    const s = document.createElement('select');
    s.style.cssText = 'flex:1;background:rgba(0,30,0,0.9);border:1px solid #0a0;color:#0f0;font-family:monospace;font-size:0.75rem;padding:3px 6px;border-radius:4px;min-width:0;';
    for (const [val, text] of Object.entries(optMap)) {
      const o = document.createElement('option');
      o.value = val; o.textContent = text;
      s.appendChild(o);
    }
    return s;
  }

  // Helper: number input
  function _numIn(dflt, min, max) {
    const i = document.createElement('input');
    i.type = 'number'; i.value = dflt; i.min = min; i.max = max;
    return i;
  }

  // ── Section 1: Story Fight ─────────────────────────────────────────────
  _sec('STORY FIGHT');
  const sfChapSel = _sel({
    0:'Ch 0 — Prologue', 1:'Ch 1 — Act 1', 2:'Ch 2', 3:'Ch 3', 4:'Ch 4',
    5:'Ch 5', 6:'Ch 6', 7:'Ch 7', 8:'Ch 8', 9:'Ch 9',
  });
  _row('Chapter', sfChapSel, '▶ Load', (v) => loadStoryFight(parseInt(v, 10)));

  // ── Cinematic Viewer shortcut ─────────────────────────────────────────
  _sec('CINEMATIC VIEWER');
  const cvBtn = document.createElement('button');
  cvBtn.textContent = 'Open Cinematic Viewer (all cinematics, finishers, domains)';
  cvBtn.style.cssText = 'width:100%;background:rgba(0,200,80,0.18);border:1px solid #0c0;color:#0f0;' +
    'font-family:monospace;font-size:0.74rem;padding:5px 8px;border-radius:4px;cursor:pointer;text-align:left;margin:3px 0;';
  cvBtn.onclick = () => { _dbgJumpMenuClose(); _cinViewerOpen(); };
  ov.appendChild(cvBtn);

  // ── Section 2: Play Cinematic ──────────────────────────────────────────
  _sec('CINEMATIC');
  const cinSel = _sel({
    'boss_intro':  'Boss Intro (Backstory)',
    'boss_phase2': 'Boss → Phase 2',
    'boss_rage':   'Boss → Rage (40%)',
    'boss_desp':   'Boss → Desperate (10%)',
    'tf_entry':    'TrueForm Entry',
    'tf_reality':  'TrueForm Reality (50%)',
    'tf_desp':     'TrueForm Desperate (15%)',
    'multiverse':  'Multiverse Travel',
  });
  _row('Cinematic', cinSel, '▶ Play', (v) => playCinematic(v));

  // ── Section 3: Spawn in Arena ──────────────────────────────────────────
  _sec('SPAWN ARENA');
  const arenaKeys = (typeof ARENAS !== 'undefined')
    ? Object.keys(ARENAS).filter(k => k !== 'creator' && k !== 'void')
    : ['grass','lava','space','city','forest','ice','ruins'];
  const arenaSel = _sel(Object.fromEntries(arenaKeys.map(k => [k, k.charAt(0).toUpperCase() + k.slice(1)])));
  _row('Arena', arenaSel, '▶ Go', (v) => spawnInArena(v));

  // ── Section 4: Force Boss Fight ────────────────────────────────────────
  _sec('BOSS FIGHT');
  const bossSel = _sel({
    'boss':     'Standard Boss',
    'trueform': 'True Form',
  });
  _row('Boss', bossSel, '▶ Start', (v) => forceBossFight(v));

  // ── Status readout ─────────────────────────────────────────────────────
  const statusDiv = document.createElement('div');
  statusDiv.id = '_dbgJumpStatus';
  statusDiv.style.cssText = 'margin-top:14px;border-top:1px solid #0a0;padding-top:8px;font-size:0.72rem;color:#44aa66;min-height:32px;';
  statusDiv.textContent = 'Ready.';
  ov.appendChild(statusDiv);

  document.body.appendChild(ov);
}

function _dbgJumpStatus(msg, isErr) {
  const d = document.getElementById('_dbgJumpStatus');
  if (!d) return;
  d.style.color = isErr ? '#ff5555' : '#44ff88';
  d.textContent = msg;
}

// ---- 4 debug jump functions ----

/**
 * loadStoryFight(chapterId)
 * Navigates to Story Mode and starts the given chapter.
 * Safe guard: does nothing if debugMode is off.
 */
function loadStoryFight(chapterId) {
  if (!debugMode) return;
  const id = parseInt(chapterId, 10);
  if (isNaN(id)) { _dbgJumpStatus('Invalid chapter id: ' + chapterId, true); return; }
  if (typeof startStoryFromMenu !== 'function') {
    _dbgJumpStatus('startStoryFromMenu() not available — is smb-story-config.js loaded?', true);
    return;
  }
  try {
    // If a game is running, return to menu first
    if (typeof gameRunning !== 'undefined' && gameRunning && typeof backToMenu === 'function') {
      backToMenu();
    }
    if (typeof selectMode === 'function') selectMode('story');
    startStoryFromMenu(id);
    _dbgJumpStatus('Started story chapter ' + id + '.', false);
    _dbgJumpMenuClose();
  } catch(e) {
    _dbgJumpStatus('Error: ' + e.message, true);
    console.warn('[DBG] loadStoryFight error:', e);
  }
}

/**
 * playCinematic(cinematicId)
 * Triggers a named cinematic sequence by ID.
 * Boss/TF cinematics require an active boss/TF entity in `players`.
 */
function playCinematic(cinematicId) {
  if (!debugMode) return;
  if (typeof isCinematic !== 'undefined' && isCinematic) {
    _dbgJumpStatus('A cinematic is already playing.', true); return;
  }

  // Locate boss or TF entity if needed
  const boss = (typeof players !== 'undefined') ? players.find(p => p.isBoss && !p.isTrueForm) : null;
  const tf   = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;

  try {
    switch (cinematicId) {
      case 'boss_intro':
        if (typeof startBossBackstoryCinematic === 'function') {
          startBossBackstoryCinematic();
          _dbgJumpStatus('Playing: Boss Backstory intro.'); break;
        }
        _dbgJumpStatus('startBossBackstoryCinematic() not found.', true); break;

      case 'boss_phase2':
        if (!boss) { _dbgJumpStatus('No active Boss entity in players[].', true); break; }
        if (typeof _makeBossPhase2Cinematic === 'function') {
          if (typeof startCinematic === 'function') startCinematic(_makeBossPhase2Cinematic(boss));
          _dbgJumpStatus('Playing: Boss Phase 2 transition.'); break;
        }
        _dbgJumpStatus('_makeBossPhase2Cinematic() not found.', true); break;

      case 'boss_rage':
        if (!boss) { _dbgJumpStatus('No active Boss entity in players[].', true); break; }
        if (typeof _makeBossRage40Cinematic === 'function') {
          if (typeof startCinematic === 'function') startCinematic(_makeBossRage40Cinematic(boss));
          _dbgJumpStatus('Playing: Boss Rage (40%) cinematic.'); break;
        }
        _dbgJumpStatus('_makeBossRage40Cinematic() not found.', true); break;

      case 'boss_desp':
        if (!boss) { _dbgJumpStatus('No active Boss entity in players[].', true); break; }
        if (typeof _makeBossDesp10Cinematic === 'function') {
          if (typeof startCinematic === 'function') startCinematic(_makeBossDesp10Cinematic(boss));
          _dbgJumpStatus('Playing: Boss Desperate (10%) cinematic.'); break;
        }
        _dbgJumpStatus('_makeBossDesp10Cinematic() not found.', true); break;

      case 'tf_entry':
        if (!tf) { _dbgJumpStatus('No active TrueForm entity in players[].', true); break; }
        if (typeof _makeTFEntryCinematic === 'function') {
          if (typeof startCinematic === 'function') startCinematic(_makeTFEntryCinematic(tf));
          _dbgJumpStatus('Playing: TrueForm Entry cinematic.'); break;
        }
        _dbgJumpStatus('_makeTFEntryCinematic() not found.', true); break;

      case 'tf_reality':
        if (!tf) { _dbgJumpStatus('No active TrueForm entity in players[].', true); break; }
        if (typeof _makeTFReality50Cinematic === 'function') {
          if (typeof startCinematic === 'function') startCinematic(_makeTFReality50Cinematic(tf));
          _dbgJumpStatus('Playing: TrueForm Reality (50%) cinematic.'); break;
        }
        _dbgJumpStatus('_makeTFReality50Cinematic() not found.', true); break;

      case 'tf_desp':
        if (!tf) { _dbgJumpStatus('No active TrueForm entity in players[].', true); break; }
        if (typeof _makeTFDesp15Cinematic === 'function') {
          if (typeof startCinematic === 'function') startCinematic(_makeTFDesp15Cinematic(tf));
          _dbgJumpStatus('Playing: TrueForm Desperate (15%) cinematic.'); break;
        }
        _dbgJumpStatus('_makeTFDesp15Cinematic() not found.', true); break;

      case 'multiverse':
        if (typeof startMultiverseTravelCinematic === 'function') {
          startMultiverseTravelCinematic('Test Arc', '#88aaff', null);
          _dbgJumpStatus('Playing: Multiverse Travel cinematic.'); break;
        }
        _dbgJumpStatus('startMultiverseTravelCinematic() not found.', true); break;

      default:
        _dbgJumpStatus('Unknown cinematic id: ' + cinematicId, true);
    }
  } catch(e) {
    _dbgJumpStatus('Cinematic error: ' + e.message, true);
    console.warn('[DBG] playCinematic error:', e);
  }
}

/**
 * spawnInArena(arenaId)
 * If a game is running: hot-swaps the arena (same as SETMAP console cmd).
 * If no game is running: starts a 1v1 vs-bot match in the given arena.
 */
function spawnInArena(arenaId) {
  if (!debugMode) return;
  if (typeof ARENAS === 'undefined' || !ARENAS[arenaId]) {
    _dbgJumpStatus('Unknown arena: ' + arenaId, true); return;
  }
  try {
    if (typeof gameRunning !== 'undefined' && gameRunning) {
      // Hot-swap arena
      currentArenaKey = arenaId;
      currentArena    = ARENAS[arenaId];
      if (typeof randomizeArenaLayout === 'function') randomizeArenaLayout(arenaId);
      if (typeof generateBgElements   === 'function') generateBgElements();
      _dbgJumpStatus('Arena hot-swapped to: ' + arenaId);
      _dbgJumpMenuClose();
    } else {
      // Start a fresh game in that arena
      if (typeof backToMenu === 'function') backToMenu();
      if (typeof selectMode === 'function') selectMode('vs');
      if (typeof selectArena === 'function') selectArena(arenaId);
      if (typeof startGame  === 'function') startGame();
      _dbgJumpStatus('Starting game in arena: ' + arenaId);
      _dbgJumpMenuClose();
    }
  } catch(e) {
    _dbgJumpStatus('Arena error: ' + e.message, true);
    console.warn('[DBG] spawnInArena error:', e);
  }
}

/**
 * forceBossFight(bossId)
 * Immediately starts a boss fight.
 * bossId: 'boss' → standard 3-phase Boss; 'trueform' → True Form fight.
 */
function forceBossFight(bossId) {
  if (!debugMode) return;
  const mode = (bossId === 'trueform') ? 'trueform' : 'boss';
  try {
    if (typeof gameRunning !== 'undefined' && gameRunning && typeof backToMenu === 'function') {
      backToMenu();
    }
    if (typeof selectMode === 'function') selectMode(mode);
    if (typeof startGame  === 'function') startGame();
    _dbgJumpStatus('Starting ' + mode + ' fight…');
    _dbgJumpMenuClose();
  } catch(e) {
    _dbgJumpStatus('Boss start error: ' + e.message, true);
    console.warn('[DBG] forceBossFight error:', e);
  }
}


// ============================================================
// CINEMATIC VIEWER  (dev + admin — always fully unlocked)
// Auto-launches the right game mode when needed so cinematics
// always have a live game world to render over.
// ============================================================

function _cinViewerAllowed() {
  return (typeof debugMode !== 'undefined' && debugMode) ||
         (typeof _adminPanelIsAllowed === 'function' && _adminPanelIsAllowed());
}

function _cinViewerClose() {
  const p = document.getElementById('_cinViewerPanel');
  if (p) p.remove();
}

function _cinViewerStatus(msg, isErr) {
  const d = document.getElementById('_cinViewerStatus');
  if (!d) return;
  d.style.color = isErr ? '#ff5555' : '#44ff88';
  d.textContent = msg;
}

// Start a game in `mode`, then call onReady(). If a game is already running
// it is ended first. Pass onReady=null when the cinematic auto-fires on launch.
function _cinViewerLaunch(mode, onReady, readyDelayMs) {
  _cinViewerClose();
  const delay = readyDelayMs || 800;
  const doStart = () => {
    try {
      if (typeof selectMode === 'function') selectMode(mode);
      if (typeof startGame  === 'function') startGame();
    } catch(e) {
      console.warn('[CinViewer] launch error:', e);
    }
    if (onReady) setTimeout(onReady, delay);
  };
  if (typeof gameRunning !== 'undefined' && gameRunning) {
    if (typeof backToMenu === 'function') backToMenu();
    setTimeout(doStart, 350);
  } else {
    doStart();
  }
}

// Skip whatever cinematic is currently playing (used to dismiss the auto-backstory
// before triggering a specific boss threshold cinematic).
function _cinViewerSkipCurrent() {
  if (typeof endCinematic === 'function') endCinematic();
  if (typeof activeCinematic !== 'undefined') activeCinematic = null;
  if (typeof isCinematic     !== 'undefined') isCinematic     = false;
  if (typeof slowMotion      !== 'undefined') slowMotion      = 1.0;
}

// Force-start any finisher def, bypassing all normal gate checks.
function _devForceFinisher(def, attacker, target) {
  if (!def || !attacker || !target) {
    _cinViewerStatus('Missing def / attacker / target.', true); return false;
  }
  if (typeof activeFinisher !== 'undefined' && activeFinisher) {
    _cinViewerStatus('Another finisher is already active.', true); return false;
  }
  try {
    target.health     = 1;
    target.invincible = 9999;
    target.vx = 0; target.vy = 0;
    attacker.vx = 0; attacker.vy = 0;
    const data = {};
    if (def.setup) def.setup(attacker, target, data);
    activeFinisher = { attacker, target, timer: 0, totalDuration: def.duration || 90, def, data };
    if (typeof _makeFinisherSentinel === 'function') activeCinematic = _makeFinisherSentinel();
    isCinematic = true;
    if (typeof setCombatLock === 'function') setCombatLock('finisher');
    slowMotion = 0;
    _cinViewerStatus('Playing finisher: ' + (def.name || ''));
    return true;
  } catch(e) {
    _cinViewerStatus('Finisher error: ' + e.message, true);
    console.warn('[CinViewer] finisher error:', e);
    return false;
  }
}

// Trigger conviction on players[0] with a temporary class override.
function _devPreviewDomain(classKey) {
  if (!classKey) return;
  const fighter = (typeof players !== 'undefined')
    ? players.find(p => p && p.health > 0 && !p.isBoss && !p.isMinion) : null;
  if (!fighter) {
    _cinViewerStatus('No active player — start a game first, or use Auto-Launch.', true); return;
  }
  if (typeof DomainManager === 'undefined' || typeof DomainManager.triggerExpansion !== 'function') {
    _cinViewerStatus('DomainManager not available.', true); return;
  }
  const savedClass  = fighter.charClass;
  const savedRising = fighter._domainRising;
  fighter.charClass    = classKey;
  fighter._domainRising = false;
  DomainManager.triggerExpansion(fighter);
  // The entry cinematic resolves the def from charClass when it FINISHES (~5 s),
  // so keep the override until the domain is actually active; the active domain
  // carries its own def/defKey, making the restore safe from then on.
  // No fixed timeout: rAF throttling (unfocused tab, low fps) stretches the
  // 300-frame entry arbitrarily, so wait on actual rising/active state instead.
  let _tries = 0;
  const _restoreIv = setInterval(() => {
    const active = DomainManager.domains && DomainManager.domains.some(d => d.owner === fighter);
    const rising = DomainManager.rising  && DomainManager.rising.some(r => r.fighter === fighter);
    if (active || (!rising && !active) || fighter.health <= 0 || ++_tries > 300) {
      clearInterval(_restoreIv);
      fighter.charClass = savedClass;
      fighter._domainRising = savedRising;
    }
  }, 400);
  _cinViewerStatus('Domain triggered: ' + classKey + '  (5 s entry, 25 s domain)');
}

function _cinViewerOpen() {
  if (!_cinViewerAllowed()) return;
  _cinViewerClose();

  const ov = document.createElement('div');
  ov.id = '_cinViewerPanel';
  ov.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'bottom:0', 'z-index:9994',
    'background:rgba(5,10,25,0.97)', 'border-right:2px solid #0f0',
    'width:320px', 'overflow-y:auto', 'font-family:monospace',
    'color:#0f0', 'padding:14px 16px', 'box-sizing:border-box',
  ].join(';');

  // Header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-size:1rem;font-weight:bold;letter-spacing:2px;margin-bottom:6px;' +
    'border-bottom:1px solid #0a0;padding-bottom:8px;display:flex;align-items:center;justify-content:space-between;';
  hdr.innerHTML = '<span>CINEMATIC VIEWER</span>';
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'x';
  closeBtn.style.cssText = 'background:none;border:1px solid #0a0;color:#0f0;cursor:pointer;' +
    'font-family:monospace;padding:2px 8px;border-radius:4px;font-size:0.9rem;';
  closeBtn.onclick = _cinViewerClose;
  hdr.appendChild(closeBtn);
  ov.appendChild(hdr);

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:0.69rem;color:#446644;margin-bottom:10px;line-height:1.55;';
  hint.textContent =
    'dev + admin only  |  F8 menu  |  admin panel (F9)\n' +
    'Auto-launch buttons start the right fight automatically.';
  ov.appendChild(hint);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _sec(label, note) {
    const d = document.createElement('div');
    d.style.cssText = 'font-size:0.75rem;letter-spacing:1px;color:#44bb66;margin:10px 0 3px;' +
      'border-top:1px solid #0a0;padding-top:7px;';
    d.textContent = '-- ' + label + ' --';
    ov.appendChild(d);
    if (note) {
      const n = document.createElement('div');
      n.style.cssText = 'font-size:0.67rem;color:#335533;margin-bottom:3px;';
      n.textContent = note;
      ov.appendChild(n);
    }
  }

  // Row: label on left, one or two buttons on right
  function _btnRow(label, buttons) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:4px;align-items:center;margin:3px 0;flex-wrap:wrap;';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:0.72rem;color:#88aa88;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    lbl.textContent = label;
    row.appendChild(lbl);
    for (const [btnText, onClick, accent] of buttons) {
      const btn = document.createElement('button');
      btn.textContent = btnText;
      btn.style.cssText = 'background:rgba(0,180,0,0.18);border:1px solid ' + (accent || '#0a0') + ';' +
        'color:#0f0;font-family:monospace;font-size:0.71rem;padding:3px 7px;border-radius:4px;cursor:pointer;white-space:nowrap;';
      btn.onclick = onClick;
      row.appendChild(btn);
    }
    ov.appendChild(row);
  }

  function _selRow(opts, btnLabel, onBtn) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:5px;align-items:center;margin:3px 0;';
    const sel = document.createElement('select');
    sel.style.cssText = 'flex:1;background:rgba(0,30,0,0.9);border:1px solid #0a0;color:#0f0;' +
      'font-family:monospace;font-size:0.72rem;padding:3px 5px;border-radius:4px;min-width:0;';
    for (const [val, text] of Object.entries(opts)) {
      const o = document.createElement('option');
      o.value = val; o.textContent = text;
      sel.appendChild(o);
    }
    const btn = document.createElement('button');
    btn.textContent = btnLabel;
    btn.style.cssText = 'background:rgba(0,180,0,0.18);border:1px solid #0a0;color:#0f0;' +
      'font-family:monospace;font-size:0.72rem;padding:3px 8px;border-radius:4px;cursor:pointer;white-space:nowrap;';
    btn.onclick = () => onBtn(sel.value);
    row.appendChild(sel); row.appendChild(btn);
    ov.appendChild(row);
    return sel;
  }

  // Try to trigger a cinematic directly; return false if entity missing.
  function _tryCin(entityFn, builderFn, label) {
    const ent = entityFn();
    if (!ent) return false;
    if (typeof activeCinematic !== 'undefined' && activeCinematic) {
      _cinViewerStatus('A cinematic is already playing.', true); return true;
    }
    try {
      const cin = builderFn(ent);
      if (!cin) { _cinViewerStatus('Builder returned null for: ' + label, true); return true; }
      if (typeof startCinematic === 'function') startCinematic(cin);
      _cinViewerStatus('Playing: ' + label);
    } catch(e) { _cinViewerStatus('Error: ' + e.message, true); }
    return true;
  }

  // ── AUTO-LAUNCH CINEMATICS ────────────────────────────────────────────────
  // These buttons start the right game mode automatically so the cinematic
  // always has a live game world to render over.

  _sec('AUTO-LAUNCH', 'Starts the right fight automatically from any screen.');

  // Boss Backstory — auto-plays from the boss constructor; just launch boss mode.
  _btnRow('Boss Backstory  (auto-plays at fight start)', [
    ['Launch Boss Fight', () => {
      _cinViewerStatus('Launching boss fight — backstory plays automatically...');
      _cinViewerLaunch('boss', null);
    }, '#0c0'],
  ]);

  // ── Boss phase transitions ────────────────────────────────────────────────
  // Boss Phase 2 — launch boss, skip backstory after 1.5 s, trigger Phase 2.
  _btnRow('Boss Phase 2 Transition', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching boss fight...');
      _cinViewerLaunch('boss', () => {
        _cinViewerSkipCurrent();
        setTimeout(() => {
          const boss = (typeof players !== 'undefined') ? players.find(p => p.isBoss && !p.isTrueForm) : null;
          if (!boss) { _cinViewerStatus('Boss not found after launch.', true); return; }
          if (typeof _makeBossPhase2Cinematic === 'function' && typeof startCinematic === 'function') {
            startCinematic(_makeBossPhase2Cinematic(boss));
            _cinViewerStatus('Playing: Boss Phase 2');
          }
        }, 300);
      }, 1500);
    }, '#0c0'],
  ]);

  // Boss Rage (40%) — same pattern.
  _btnRow('Boss Rage (40%)', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching boss fight...');
      _cinViewerLaunch('boss', () => {
        _cinViewerSkipCurrent();
        setTimeout(() => {
          const boss = (typeof players !== 'undefined') ? players.find(p => p.isBoss && !p.isTrueForm) : null;
          if (!boss) { _cinViewerStatus('Boss not found after launch.', true); return; }
          if (typeof _makeBossRage40Cinematic === 'function' && typeof startCinematic === 'function') {
            startCinematic(_makeBossRage40Cinematic(boss));
            _cinViewerStatus('Playing: Boss Rage (40%)');
          }
        }, 300);
      }, 1500);
    }, '#0c0'],
  ]);

  // Boss Desperate (10%).
  _btnRow('Boss Desperate (10%)', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching boss fight...');
      _cinViewerLaunch('boss', () => {
        _cinViewerSkipCurrent();
        setTimeout(() => {
          const boss = (typeof players !== 'undefined') ? players.find(p => p.isBoss && !p.isTrueForm) : null;
          if (!boss) { _cinViewerStatus('Boss not found after launch.', true); return; }
          if (typeof _makeBossDesp10Cinematic === 'function' && typeof startCinematic === 'function') {
            startCinematic(_makeBossDesp10Cinematic(boss));
            _cinViewerStatus('Playing: Boss Desperate (10%)');
          }
        }, 300);
      }, 1500);
    }, '#0c0'],
  ]);

  // Boss Phase 3.
  _btnRow('Boss Phase 3 Transition', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching boss fight...');
      _cinViewerLaunch('boss', () => {
        _cinViewerSkipCurrent();
        setTimeout(() => {
          const boss = (typeof players !== 'undefined') ? players.find(p => p.isBoss && !p.isTrueForm) : null;
          if (!boss) { _cinViewerStatus('Boss not found after launch.', true); return; }
          if (typeof _makeBossPhase3Cinematic === 'function' && typeof startCinematic === 'function') {
            startCinematic(_makeBossPhase3Cinematic(boss));
            _cinViewerStatus('Playing: Boss Phase 3');
          }
        }, 300);
      }, 1500);
    }, '#0c0'],
  ]);

  // Boss Warning (75%).
  _btnRow('Boss Warning (75%)', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching boss fight...');
      _cinViewerLaunch('boss', () => {
        _cinViewerSkipCurrent();
        setTimeout(() => {
          const boss = (typeof players !== 'undefined') ? players.find(p => p.isBoss && !p.isTrueForm) : null;
          if (!boss) { _cinViewerStatus('Boss not found after launch.', true); return; }
          if (typeof _makeBossWarning75Cinematic === 'function' && typeof startCinematic === 'function') {
            startCinematic(_makeBossWarning75Cinematic(boss));
            _cinViewerStatus('Playing: Boss Warning (75%)');
          }
        }, 300);
      }, 1500);
    }, '#0c0'],
  ]);

  // TrueForm cinematics — launch trueform mode, trigger after entity spawns.
  // NOTE: tf_entry (_makeTFEntryCinematic) is intentionally excluded — it is a dead
  // fallback that never fires in gameplay; startTFOpeningFight always takes priority.
  const TF_CIN_MAP = {
    'tf_phase2':        ['TF Phase 2 Transition',  (tf) => typeof _makeTFPhase2Cinematic        === 'function' ? _makeTFPhase2Cinematic(tf)        : null],
    'tf_phase3':        ['TF Phase 3 Transition',  (tf) => typeof _makeTFPhase3Cinematic        === 'function' ? _makeTFPhase3Cinematic(tf)        : null],
    'tf_reality':       ['TF Reality (50%)',        (tf) => typeof _makeTFReality50Cinematic    === 'function' ? _makeTFReality50Cinematic(tf)    : null],
    'tf_desp':          ['TF Desperate (15%)',      (tf) => typeof _makeTFDesp15Cinematic       === 'function' ? _makeTFDesp15Cinematic(tf)       : null],
    'tf_intro':         ['TF Intro (Paradox)',       (tf) => typeof _makeTFIntroCinematic        === 'function' ? _makeTFIntroCinematic(tf)        : null],
    'tf_paradox_entry': ['TF Paradox Entry',        (tf) => typeof _makeTFParadoxEntryCinematic === 'function' ? _makeTFParadoxEntryCinematic(tf) : null],
    'tf_final_paradox': ['TF Final Paradox',        (tf) => typeof _makeTFFinalParadoxCinematic === 'function' ? _makeTFFinalParadoxCinematic(tf) : null],
    'tf_kills_paradox': ['TF Kills Paradox',        (tf) => typeof _makeTFKillsParadoxCinematic === 'function' ? _makeTFKillsParadoxCinematic(tf) : null],
  };

  const tfSelRow = _selRow(Object.fromEntries(Object.entries(TF_CIN_MAP).map(([k, v]) => [k, v[0]])),
    'Launch + Play', (v) => {
      const entry = TF_CIN_MAP[v];
      if (!entry) return;
      _cinViewerStatus('Launching TrueForm fight...');
      _cinViewerLaunch('trueform', () => {
        const tf = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
        if (!tf) { _cinViewerStatus('TrueForm not found after launch.', true); return; }
        if (typeof activeCinematic !== 'undefined' && activeCinematic) _cinViewerSkipCurrent();
        setTimeout(() => {
          const tf2 = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
          if (!tf2) { _cinViewerStatus('TrueForm lost after skip.', true); return; }
          const cin = entry[1](tf2);
          if (!cin) { _cinViewerStatus('Builder returned null: ' + v, true); return; }
          if (typeof startCinematic === 'function') startCinematic(cin);
          _cinViewerStatus('Playing: ' + entry[0]);
        }, 300);
      }, 1200);
    });

  // TF Opening Fight — special case (uses startTFOpeningFight not startCinematic).
  _btnRow('TF Opening Fight', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching TrueForm fight...');
      _cinViewerLaunch('trueform', () => {
        const tf = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
        if (!tf) { _cinViewerStatus('TrueForm not found after launch.', true); return; }
        if (typeof activeCinematic !== 'undefined' && activeCinematic) _cinViewerSkipCurrent();
        setTimeout(() => {
          const tf2 = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
          if (!tf2) return;
          if (typeof startTFOpeningFight === 'function') {
            startTFOpeningFight(tf2);
            _cinViewerStatus('Playing: TF Opening Fight');
          }
        }, 300);
      }, 1200);
    }, '#0c0'],
  ]);

  // TF Paradox Return (~1000 HP) — Paradox bursts back in.
  _btnRow('TF Paradox Return (1000 HP)', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching TrueForm fight...');
      _cinViewerLaunch('trueform', () => {
        const tf = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
        if (!tf) { _cinViewerStatus('TrueForm not found after launch.', true); return; }
        if (typeof activeCinematic !== 'undefined' && activeCinematic) _cinViewerSkipCurrent();
        setTimeout(() => {
          const tf2 = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
          if (!tf2) { _cinViewerStatus('TrueForm lost after skip.', true); return; }
          if (typeof startTFParadoxReturn1000 === 'function') {
            startTFParadoxReturn1000(tf2);
            _cinViewerStatus('Playing: TF Paradox Return (1000 HP)');
          } else { _cinViewerStatus('startTFParadoxReturn1000 not found.', true); }
        }, 300);
      }, 1200);
    }, '#0c0'],
  ]);

  // TF Ending — First Death (isIntro=true): fires after Paradox absorption in gameplay.
  _btnRow('TF Ending — First Death (post-Paradox absorption)', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching TrueForm fight...');
      _cinViewerLaunch('trueform', () => {
        const tf = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
        if (!tf) { _cinViewerStatus('TrueForm not found after launch.', true); return; }
        if (typeof activeCinematic !== 'undefined' && activeCinematic) _cinViewerSkipCurrent();
        setTimeout(() => {
          const tf2 = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
          if (!tf2) { _cinViewerStatus('TrueForm lost after skip.', true); return; }
          if (typeof startTFEnding === 'function') {
            startTFEnding(tf2, true); // isIntro=true — the path that actually fires in gameplay
            _cinViewerStatus('Playing: TF Ending (First Death)');
          } else { _cinViewerStatus('startTFEnding not found.', true); }
        }, 300);
      }, 1200);
    }, '#0c0'],
  ]);

  // TF Ending — Final (isIntro=false): fires at true end after Paradox arc resolves.
  _btnRow('TF Ending — Final (true death)', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching TrueForm fight...');
      _cinViewerLaunch('trueform', () => {
        const tf = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
        if (!tf) { _cinViewerStatus('TrueForm not found after launch.', true); return; }
        if (typeof activeCinematic !== 'undefined' && activeCinematic) _cinViewerSkipCurrent();
        setTimeout(() => {
          const tf2 = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
          if (!tf2) { _cinViewerStatus('TrueForm lost after skip.', true); return; }
          if (typeof startTFEnding === 'function') {
            startTFEnding(tf2, false);
            _cinViewerStatus('Playing: TF Ending (Final)');
          } else { _cinViewerStatus('startTFEnding not found.', true); }
        }, 300);
      }, 1200);
    }, '#0c0'],
  ]);

  // Beast Phase 2 — launch a VS game, spawn a ForestBeast, trigger Phase 2 cinematic.
  _btnRow('Beast Phase 2 Transition', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching VS fight, spawning Beast...');
      _cinViewerLaunch('vs', () => {
        if (typeof ForestBeast === 'undefined') { _cinViewerStatus('ForestBeast class not available.', true); return; }
        const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
        const beast = new ForestBeast(GW / 2, 200);
        if (Array.isArray(minions)) minions.push(beast);
        setTimeout(() => {
          const b = (typeof minions !== 'undefined') ? minions.find(m => m && m.isBeast && m.health > 0) : null;
          if (!b) { _cinViewerStatus('Beast not found after spawn.', true); return; }
          if (typeof _makeBeastPhase2Cinematic === 'function' && typeof startCinematic === 'function') {
            startCinematic(_makeBeastPhase2Cinematic(b));
            _cinViewerStatus('Playing: Beast Phase 2');
          }
        }, 300);
      }, 800);
    }, '#0c0'],
  ]);

  // Yeti Phase 2 — same pattern.
  _btnRow('Yeti Phase 2 Transition', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching VS fight, spawning Yeti...');
      _cinViewerLaunch('vs', () => {
        if (typeof Yeti === 'undefined') { _cinViewerStatus('Yeti class not available.', true); return; }
        const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
        const yeti = new Yeti(GW / 2, 200);
        if (Array.isArray(minions)) minions.push(yeti);
        setTimeout(() => {
          const y = (typeof minions !== 'undefined') ? minions.find(m => m && m.isYeti && m.health > 0) : null;
          if (!y) { _cinViewerStatus('Yeti not found after spawn.', true); return; }
          if (typeof _makeYetiPhase2Cinematic === 'function' && typeof startCinematic === 'function') {
            startCinematic(_makeYetiPhase2Cinematic(y));
            _cinViewerStatus('Playing: Yeti Phase 2');
          }
        }, 300);
      }, 800);
    }, '#0c0'],
  ]);

  // Multiverse Travel — launch any vs game, trigger after 800ms.
  _btnRow('Multiverse Travel', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching game for multiverse cinematic...');
      _cinViewerLaunch('vs', () => {
        if (typeof startMultiverseTravelCinematic !== 'function') {
          _cinViewerStatus('startMultiverseTravelCinematic not found.', true); return;
        }
        startMultiverseTravelCinematic('Preview Arc', '#88aaff', null);
        _cinViewerStatus('Playing: Multiverse Travel');
      }, 800);
    }, '#0c0'],
  ]);

  // God / AA — launch appropriate mode, trigger after entity spawns.
  _btnRow('God Dialogue', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching God fight...');
      _cinViewerLaunch('god', () => {
        const god = (typeof minions !== 'undefined') ? minions.find(m => m && m.isGod && !m.isAbsoluteAxiom && m.health > 0) : null;
        if (!god) { _cinViewerStatus('God entity not found after launch.', true); return; }
        if (typeof _startGodDialogueCin === 'function') {
          _startGodDialogueCin(god);
          _cinViewerStatus('Playing: God Dialogue');
        }
      }, 1000);
    }, '#0c0'],
  ]);

  _btnRow('God Merge -> Absolute Axiom', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching God fight...');
      _cinViewerLaunch('god', () => {
        const god = (typeof minions !== 'undefined') ? minions.find(m => m && m.isGod && !m.isAbsoluteAxiom && m.health > 0) : null;
        if (!god) { _cinViewerStatus('God entity not found after launch.', true); return; }
        if (typeof _startGod1000Cin === 'function') {
          _startGod1000Cin(god);
          _cinViewerStatus('Playing: God Merge -> AA');
        }
      }, 1000);
    }, '#0c0'],
  ]);

  _btnRow('AA Final Assault', [
    ['Launch + Play', () => {
      _cinViewerStatus('Launching Absolute Axiom fight...');
      _cinViewerLaunch('absoluteaxiom', () => {
        const aa = (typeof minions !== 'undefined') ? minions.find(m => m && m.isAbsoluteAxiom && m.health > 0) : null;
        if (!aa) { _cinViewerStatus('Absolute Axiom not found after launch.', true); return; }
        if (typeof _startAAFinalAssaultCinematic === 'function') {
          _startAAFinalAssaultCinematic(aa);
          _cinViewerStatus('Playing: AA Final Assault');
        }
      }, 1000);
    }, '#0c0'],
  ]);

  // ── IN-FIGHT TRIGGER (when already in the right fight) ───────────────────
  // Use these if you want to trigger mid-fight without relaunching.

  _sec('IN-FIGHT TRIGGER', 'Needs the fight already running with the right entity.');

  // Boss threshold — direct trigger only
  _selRow({
    'boss_warn75': 'Boss Warning (75%)',
    'boss_phase2': 'Boss Phase 2',
    'boss_phase3': 'Boss Phase 3',
    'boss_rage':   'Boss Rage (40%)',
    'boss_desp':   'Boss Desperate (10%)',
  }, 'Play', (v) => {
    const boss = (typeof players !== 'undefined') ? players.find(p => p.isBoss && !p.isTrueForm) : null;
    if (!boss) { _cinViewerStatus('No Boss in players[] — use Launch + Play above.', true); return; }
    if (typeof activeCinematic !== 'undefined' && activeCinematic) { _cinViewerStatus('Cinematic already playing.', true); return; }
    try {
      const cinMap = {
        'boss_warn75': typeof _makeBossWarning75Cinematic === 'function' ? _makeBossWarning75Cinematic(boss) : null,
        'boss_phase2': typeof _makeBossPhase2Cinematic   === 'function' ? _makeBossPhase2Cinematic(boss)   : null,
        'boss_phase3': typeof _makeBossPhase3Cinematic   === 'function' ? _makeBossPhase3Cinematic(boss)   : null,
        'boss_rage':   typeof _makeBossRage40Cinematic   === 'function' ? _makeBossRage40Cinematic(boss)   : null,
        'boss_desp':   typeof _makeBossDesp10Cinematic   === 'function' ? _makeBossDesp10Cinematic(boss)   : null,
      };
      const cin = cinMap[v];
      if (!cin) { _cinViewerStatus('Builder null: ' + v, true); return; }
      if (typeof startCinematic === 'function') startCinematic(cin);
      _cinViewerStatus('Playing: ' + v);
    } catch(e) { _cinViewerStatus('Error: ' + e.message, true); }
  });

  // TF threshold — direct trigger only
  _selRow({
    'tf_opening':       'TF Opening Fight',
    'tf_phase2':        'TF Phase 2 Transition',
    'tf_phase3':        'TF Phase 3 Transition',
    'tf_reality':       'TF Reality (50%)',
    'tf_desp':          'TF Desperate (15%)',
    'tf_paradox_return':'TF Paradox Return (1000 HP)',
    'tf_ending_intro':  'TF Ending — First Death',
    'tf_ending_final':  'TF Ending — Final (true death)',
    'tf_intro':         'TF Intro (Paradox)',
    'tf_paradox_entry': 'TF Paradox Entry',
    'tf_final_paradox': 'TF Final Paradox',
    'tf_kills_paradox': 'TF Kills Paradox',
  }, 'Play', (v) => {
    const tf = (typeof players !== 'undefined') ? players.find(p => p.isTrueForm) : null;
    if (!tf) { _cinViewerStatus('No TrueForm in players[] — use Launch + Play above.', true); return; }
    if (typeof activeCinematic !== 'undefined' && activeCinematic) { _cinViewerStatus('Cinematic already playing.', true); return; }
    try {
      if (v === 'tf_opening') {
        if (typeof startTFOpeningFight === 'function') { startTFOpeningFight(tf); _cinViewerStatus('Playing: TF Opening Fight'); }
        return;
      }
      if (v === 'tf_paradox_return') {
        if (typeof startTFParadoxReturn1000 === 'function') { startTFParadoxReturn1000(tf); _cinViewerStatus('Playing: TF Paradox Return'); }
        else _cinViewerStatus('startTFParadoxReturn1000 not found.', true);
        return;
      }
      if (v === 'tf_ending_intro') {
        if (typeof startTFEnding === 'function') { startTFEnding(tf, true); _cinViewerStatus('Playing: TF Ending (First Death)'); }
        else _cinViewerStatus('startTFEnding not found.', true);
        return;
      }
      if (v === 'tf_ending_final') {
        if (typeof startTFEnding === 'function') { startTFEnding(tf, false); _cinViewerStatus('Playing: TF Ending (Final)'); }
        else _cinViewerStatus('startTFEnding not found.', true);
        return;
      }
      const makers = {
        'tf_phase2':        typeof _makeTFPhase2Cinematic        === 'function' ? _makeTFPhase2Cinematic(tf)        : null,
        'tf_phase3':        typeof _makeTFPhase3Cinematic        === 'function' ? _makeTFPhase3Cinematic(tf)        : null,
        'tf_reality':       typeof _makeTFReality50Cinematic    === 'function' ? _makeTFReality50Cinematic(tf)    : null,
        'tf_desp':          typeof _makeTFDesp15Cinematic       === 'function' ? _makeTFDesp15Cinematic(tf)       : null,
        'tf_intro':         typeof _makeTFIntroCinematic        === 'function' ? _makeTFIntroCinematic(tf)        : null,
        'tf_paradox_entry': typeof _makeTFParadoxEntryCinematic === 'function' ? _makeTFParadoxEntryCinematic(tf) : null,
        'tf_final_paradox': typeof _makeTFFinalParadoxCinematic === 'function' ? _makeTFFinalParadoxCinematic(tf) : null,
        'tf_kills_paradox': typeof _makeTFKillsParadoxCinematic === 'function' ? _makeTFKillsParadoxCinematic(tf) : null,
      };
      const cin = makers[v];
      if (!cin) { _cinViewerStatus('Builder null: ' + v, true); return; }
      if (typeof startCinematic === 'function') startCinematic(cin);
      _cinViewerStatus('Playing: ' + v);
    } catch(e) { _cinViewerStatus('Error: ' + e.message, true); }
  });

  // God / AA — direct trigger
  _selRow({
    'god_dialogue': 'God Dialogue',
    'god_merge':    'God Merge -> AA',
    'aa_final':     'AA Final Assault',
  }, 'Play', (v) => {
    if (typeof activeCinematic !== 'undefined' && activeCinematic) { _cinViewerStatus('Cinematic already playing.', true); return; }
    try {
      const mPool = Array.isArray(typeof minions !== 'undefined' ? minions : null) ? minions : [];
      const god = mPool.find(m => m && m.isGod && !m.isAbsoluteAxiom && m.health > 0);
      const aa  = mPool.find(m => m && m.isAbsoluteAxiom && m.health > 0);
      if (v === 'god_dialogue') {
        if (!god) { _cinViewerStatus('No God in minions[] — use Launch + Play above.', true); return; }
        if (typeof _startGodDialogueCin === 'function') { _startGodDialogueCin(god); _cinViewerStatus('Playing: God Dialogue'); }
      } else if (v === 'god_merge') {
        if (!god) { _cinViewerStatus('No God in minions[] — use Launch + Play above.', true); return; }
        if (typeof _startGod1000Cin === 'function') { _startGod1000Cin(god); _cinViewerStatus('Playing: God Merge -> AA'); }
      } else if (v === 'aa_final') {
        if (!aa) { _cinViewerStatus('No AA in minions[] — use Launch + Play above.', true); return; }
        if (typeof _startAAFinalAssaultCinematic === 'function') { _startAAFinalAssaultCinematic(aa); _cinViewerStatus('Playing: AA Final Assault'); }
      }
    } catch(e) { _cinViewerStatus('Error: ' + e.message, true); }
  });

  // Beast / Yeti — direct trigger (need entity in minions[])
  _selRow({
    'beast_phase2': 'Beast Phase 2',
    'yeti_phase2':  'Yeti Phase 2',
  }, 'Play', (v) => {
    if (typeof activeCinematic !== 'undefined' && activeCinematic) { _cinViewerStatus('Cinematic already playing.', true); return; }
    const mPool = Array.isArray(typeof minions !== 'undefined' ? minions : null) ? minions : [];
    const beast = mPool.find(m => m && m.isBeast && m.health > 0);
    const yeti  = mPool.find(m => m && m.isYeti  && m.health > 0);
    if (v === 'beast_phase2') {
      if (!beast) { _cinViewerStatus('No Beast in minions[] — use Launch + Play above.', true); return; }
      if (typeof _makeBeastPhase2Cinematic === 'function' && typeof startCinematic === 'function') {
        startCinematic(_makeBeastPhase2Cinematic(beast)); _cinViewerStatus('Playing: Beast Phase 2');
      }
    } else if (v === 'yeti_phase2') {
      if (!yeti) { _cinViewerStatus('No Yeti in minions[] — use Launch + Play above.', true); return; }
      if (typeof _makeYetiPhase2Cinematic === 'function' && typeof startCinematic === 'function') {
        startCinematic(_makeYetiPhase2Cinematic(yeti)); _cinViewerStatus('Playing: Yeti Phase 2');
      }
    }
  });

  // ── FINISHERS ─────────────────────────────────────────────────────────────
  _sec('FINISHERS', 'Auto-starts a VS match if no game is running.');
  const _finSel = _selRow({
    'w:sword':         'Sword -- Ghost Step',
    'w:hammer':        'Hammer -- Earth Shatter',
    'w:gun':           'Gun -- Bullet Time',
    'w:axe':           'Axe -- Spinning Fury',
    'w:spear':         'Spear -- Celestial Impale',
    'w:scythe':        "Scythe -- Reaper's Sweep",
    'w:fryingpan':     'Frying Pan -- Sweet Dreams',
    'w:bow':           'Bow -- Arrow Storm',
    'w:combat':        'Combat -- Knockout',
    'w:nullblade':     'Nullblade -- Void Reckoning',
    'c:thor':          'Thor -- Thunder God',
    'c:kratos':        'Kratos -- Spartan Rage',
    'c:ninja':         'Ninja -- Shadow Strike',
    'c:gunner':        'Gunner -- Execution',
    'c:paladin':       'Paladin -- Holy Judgment',
    'c:berserker':     'Berserker -- Blood Frenzy',
    'c:archer':        'Archer -- Volley',
    'c:megaknight':    'MegaKnight -- Final Judgment',
    'b:sky_exec':      '[Boss] Sky Execution',
    'b:darkness':      '[Boss] Darkness Falls',
    'b:cr_code_del':   '[Boss] Code Deletion',
    'b:hero':          "[Player] Hero's Triumph",
    'b:void_slam':     '[TF] Void Slam',
    'b:reality_break': '[TF] Reality Break',
    'b:tf_erasure':    '[TF] Erasure',
    'b:tf_phase':      '[TF] Phase Shift',
    'b:yeti_aval':     '[Yeti] Avalanche',
    'b:yeti_polar':    '[Yeti] Polar Slam',
    'b:yeti_ice':      '[Yeti] Ice Burial',
    'b:beast_feral':   '[Beast] Feral Tackle',
    'b:beast_devour':  '[Beast] Nature Devour',
    'b:beast_launch':  '[Beast] Savage Launch',
  }, 'Preview', (v) => {
    const _tryFinisher = () => {
      const allPlayers = typeof players !== 'undefined' ? players : [];
      const mPool = Array.isArray(typeof minions !== 'undefined' ? minions : null) ? minions : [];
      const p0   = allPlayers.find(p => p && p.health > 0 && !p.isBoss && !p.isMinion);
      const p1   = allPlayers.find(p => p && p !== p0 && p.health > 0 && !p.isMinion);
      const boss = allPlayers.find(p => p && p.isBoss && !p.isTrueForm && p.health > 0);
      const tf   = allPlayers.find(p => p && p.isTrueForm && p.health > 0);
      const yeti  = mPool.find(m => m && m.isYeti  && m.health > 0);
      const beast = mPool.find(m => m && m.isBeast && m.health > 0);
      const [type, key] = v.split(':');
      if (type === 'w') {
        const def = typeof WEAPON_FINISHERS !== 'undefined' ? WEAPON_FINISHERS[key] : null;
        if (!def) { _cinViewerStatus('Weapon finisher not found: ' + key, true); return; }
        if (!p0 || !p1) { _cinViewerStatus('Need 2 entities — auto-launch started.', true); return; }
        _devForceFinisher(def, p0, p1);
        return;
      }
      if (type === 'c') {
        const def = typeof CLASS_FINISHERS !== 'undefined' ? CLASS_FINISHERS[key] : null;
        if (!def) { _cinViewerStatus('Class finisher not found: ' + key, true); return; }
        if (!p0 || !p1) { _cinViewerStatus('Need 2 entities — auto-launch started.', true); return; }
        _devForceFinisher(def, p0, p1);
        return;
      }
      const bMap = {
        'sky_exec':      { def: typeof FIN_SKY_EXECUTION       !== 'undefined' ? FIN_SKY_EXECUTION       : null, att: boss,  tgt: p0  },
        'darkness':      { def: typeof FIN_DARKNESS_FALLS      !== 'undefined' ? FIN_DARKNESS_FALLS      : null, att: boss,  tgt: p0  },
        'cr_code_del':   { def: typeof FIN_CR_CODE_DELETION    !== 'undefined' ? FIN_CR_CODE_DELETION    : null, att: boss,  tgt: p0  },
        'hero':          { def: typeof FIN_HEROS_TRIUMPH       !== 'undefined' ? FIN_HEROS_TRIUMPH       : null, att: p0,    tgt: boss },
        'void_slam':     { def: typeof FIN_VOID_SLAM           !== 'undefined' ? FIN_VOID_SLAM           : null, att: tf,    tgt: p0  },
        'reality_break': { def: typeof FIN_REALITY_BREAK       !== 'undefined' ? FIN_REALITY_BREAK       : null, att: tf,    tgt: p0  },
        'tf_erasure':    { def: typeof FIN_TF_ERASURE          !== 'undefined' ? FIN_TF_ERASURE          : null, att: tf,    tgt: p0  },
        'tf_phase':      { def: typeof FIN_TF_PHASE_SHIFT      !== 'undefined' ? FIN_TF_PHASE_SHIFT      : null, att: tf,    tgt: p0  },
        'yeti_aval':     { def: typeof FIN_YETI_AVALANCHE      !== 'undefined' ? FIN_YETI_AVALANCHE      : null, att: yeti,  tgt: p0  },
        'yeti_polar':    { def: typeof FIN_YETI_POLAR_SLAM     !== 'undefined' ? FIN_YETI_POLAR_SLAM     : null, att: yeti,  tgt: p0  },
        'yeti_ice':      { def: typeof FIN_YETI_ICE_BURIAL     !== 'undefined' ? FIN_YETI_ICE_BURIAL     : null, att: yeti,  tgt: p0  },
        'beast_feral':   { def: typeof FIN_BEAST_FERAL_TACKLE  !== 'undefined' ? FIN_BEAST_FERAL_TACKLE  : null, att: beast, tgt: p0  },
        'beast_devour':  { def: typeof FIN_BEAST_NATURE_DEVOUR !== 'undefined' ? FIN_BEAST_NATURE_DEVOUR : null, att: beast, tgt: p0  },
        'beast_launch':  { def: typeof FIN_BEAST_SAVAGE_LAUNCH !== 'undefined' ? FIN_BEAST_SAVAGE_LAUNCH : null, att: beast, tgt: p0  },
      };
      const entry = bMap[key];
      if (!entry)     { _cinViewerStatus('Unknown finisher: ' + v, true); return; }
      if (!entry.def) { _cinViewerStatus('Finisher def not available: ' + key, true); return; }
      if (!entry.att) { _cinViewerStatus('Required entity not in fight: ' + key, true); return; }
      if (!entry.tgt) { _cinViewerStatus('No valid target in fight.', true); return; }
      _devForceFinisher(entry.def, entry.att, entry.tgt);
    };

    // Auto-launch VS/boss/TF if game isn't running
    const [type] = v.split(':');
    const needsBoss = type === 'b' && (v.includes('sky_exec') || v.includes('darkness') || v.includes('cr_code_del') || v.includes('hero'));
    const needsTF   = type === 'b' && (v.includes('void_slam') || v.includes('reality_break') || v.includes('tf_'));
    const needsYeti = type === 'b' && v.includes('yeti_');
    const needsBeast= type === 'b' && v.includes('beast_');

    if (!gameRunning) {
      const launchMode = needsBoss ? 'boss' : needsTF ? 'trueform' : needsYeti ? 'yeti' : needsBeast ? 'beast' : 'vs';
      _cinViewerStatus('Auto-launching ' + launchMode + ' fight...');
      _cinViewerLaunch(launchMode, () => {
        if (needsBoss && typeof activeCinematic !== 'undefined' && activeCinematic) _cinViewerSkipCurrent();
        setTimeout(_tryFinisher, needsBoss ? 400 : 200);
      }, needsBoss ? 1500 : 800);
    } else {
      try { _tryFinisher(); } catch(e) { _cinViewerStatus('Error: ' + e.message, true); }
    }
  });

  // ── CONVICTION ────────────────────────────────────────────────────────────
  _sec('CONVICTION', 'Auto-starts a VS match if no game is running.');
  _selRow({
    'thor':       'Thor -- Storm Realm',
    'kratos':     'Kratos -- Spartan War Domain',
    'ninja':      'Ninja -- Shadow Realm',
    'gunner':     'Gunner -- Arsenal Domain',
    'archer':     'Archer -- Verdant Hunt',
    'paladin':    'Paladin -- Holy Sanctuary',
    'berserker':  'Berserker -- Blood Arena',
    'megaknight': 'MegaKnight -- Void Rift',
    'ronin':      "Ronin -- Death's Dojo",
    'reaper':     'Reaper -- Eternal Harvest',
    'pugilist':   'Pugilist -- Iron Arena',
    'none':       'None -- Primal Surge',
  }, 'Trigger', (v) => {
    if (!gameRunning) {
      _cinViewerStatus('Auto-launching VS fight for domain preview...');
      _cinViewerLaunch('vs', () => _devPreviewDomain(v), 800);
    } else {
      _devPreviewDomain(v);
    }
  });

  // ── Status ────────────────────────────────────────────────────────────────
  const statusDiv = document.createElement('div');
  statusDiv.id = '_cinViewerStatus';
  statusDiv.style.cssText = 'margin-top:14px;border-top:1px solid #0a0;padding-top:8px;' +
    'font-size:0.72rem;color:#44aa66;min-height:36px;line-height:1.55;';
  statusDiv.textContent = 'Ready.';
  ov.appendChild(statusDiv);

  document.body.appendChild(ov);
}
