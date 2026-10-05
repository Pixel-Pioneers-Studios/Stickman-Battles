'use strict';
// smb-menu-ui.js — Mode selection, cosmetics/store, bot toggle
// Depends on: smb-globals.js, smb-data-weapons.js, smb-state.js, smb-accounts.js
// Must load BEFORE smb-menu-select.js

// ============================================================
// MENU UI HANDLERS
// ============================================================
function selectMode(mode) {
  const _prevMode = gameMode;
  // 'bot' is no longer a separate mode — merge into '2p' with bot toggles
  if (mode === 'bot') mode = '2p';
  if (mode === 'completerandom') {
    mode = '2p';
    completeRandomizer = true;
  } else if (mode !== '2p') {
    // The flag is only meaningful in 2P (see isCompleteRandMode in
    // smb-menu-startcore.js) and was previously only cleared by backToMenu, so
    // picking Complete Randomizer and then any other card left it set — which
    // dragged the randomizer's on-death arena/loadout swap into that mode.
    completeRandomizer = false;
  }
  // 'story' opens the story modal instead of changing menu layout
  if (mode === 'story') {
    if (typeof openStoryMenu === 'function') openStoryMenu();
    return;
  }
  gameMode = mode;
  if (_prevMode === 'story' && mode !== 'story' && typeof forceResetGravity === 'function') {
    forceResetGravity();
  }
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
  const modeCard = document.querySelector(`[data-mode="${mode}"]`);
  if (modeCard) modeCard.classList.add('active');
  const isBoss       = mode === 'boss';
  // Online allows boss, trueform, training, minigames — no redirect needed
  const isTrueForm   = mode === 'trueform';
  const isBoss2p     = isBoss && bossPlayerCount === 2;
  const isTraining   = mode === 'training';
  const isMinigames  = mode === 'minigames';
  const isOnline     = mode === 'online';
  const isAdaptive        = mode === 'adaptive' || mode === 'sovereign';
  const isCompleteRandom  = mode === '2p' && completeRandomizer;
  // Only update onlineMode when not already connected (prevents clearing it when host/guest switch game modes)
  if (!NetworkManager.connected) onlineMode = isOnline;
  // Show/hide boss player count toggle
  const bpt = document.getElementById('bossPlayerToggle');
  if (bpt) bpt.style.display = isBoss ? 'flex' : 'none';
  const crRow = document.getElementById('completeRandomRow');
  if (crRow) crRow.style.display = mode === '2p' ? 'flex' : 'none';
  const crBtn = document.getElementById('completeRandomBtn');
  if (crBtn) {
    crBtn.textContent = ` Complete Random: ${isCompleteRandom ? 'ON' : 'OFF'}`;
    crBtn.classList.toggle('active', isCompleteRandom);
  }
  // Show/hide online connection panel.
  // While a session is live the panel STAYS open: the host picks the match mode
  // from inside it, and selectMode('2p') used to close the very panel that was
  // driving it — which read as the Online screen vanishing on the first click.
  const _sessionLive = !!(window.NetworkManager && NetworkManager.connected);
  const onlinePanel = document.getElementById('onlinePanel');
  if (onlinePanel) onlinePanel.style.display = (isOnline || _sessionLive) ? 'flex' : 'none';
  if (_sessionLive) {
    const _onlineCard = document.querySelector('[data-mode="online"]');
    if (_onlineCard) _onlineCard.classList.add('active');
  }
  if ((isOnline || _sessionLive) && typeof refreshPublicRooms === 'function') refreshPublicRooms();
  // Show/hide minigame selection panel; sync card active state and survivalOptions on re-entry
  const mgPanel = document.getElementById('minigamePanel');
  if (mgPanel) mgPanel.style.display = isMinigames ? 'block' : 'none';
  if (isMinigames) {
    document.querySelectorAll('#minigamePanel .mode-card').forEach(c => c.classList.remove('active'));
    const _mgCard = document.getElementById('mgCard' + minigameType.charAt(0).toUpperCase() + minigameType.slice(1));
    if (_mgCard) _mgCard.classList.add('active');
    const _survOpts = document.getElementById('survivalOptions');
    if (_survOpts) _survOpts.style.display = minigameType === 'survival' ? 'flex' : 'none';
    const _sportsOpts = document.getElementById('sportsOptions');
    if (_sportsOpts) _sportsOpts.style.display = minigameType === 'sports' ? 'flex' : 'none';
  }
  // P2 panel title/hint
  document.getElementById('p2Title').textContent = isTrueForm ? 'COSMIC AXIOM' : isAdaptive ? 'NEURAL AI' : (isBoss && !isBoss2p) ? 'CREATOR' : (isBoss2p ? 'Player 2' : (isTraining ? 'TRAINING' : (p2IsBot ? 'BOT' : 'Player 2')));
  const _p2Hint = document.getElementById('p2Hint');
  if (_p2Hint) _p2Hint.textContent = isTrueForm ? 'Secret Final Boss' : isAdaptive ? 'Learns your playstyle' : (isBoss && !isBoss2p) ? 'Boss — AI Controlled' : (isBoss2p ? '← → ↑ · Enter · . · /' : (isTraining ? 'Practice mode' : (p2IsBot ? 'AI Controlled' : '← → ↑ · Enter · . · / · ↓')));
  document.getElementById('p1DifficultyRow').style.display = p1IsBot ? 'flex' : 'none';
  document.getElementById('p2DifficultyRow').style.display = p2IsBot ? 'flex' : 'none';
  // Hide P2 config rows in boss 1P, training, trueform, adaptive, battle royale
  const isBattleRoyale = mode === 'battleroyale';
  const isEscort       = mode === 'escort';
  const hideP2 = (isBoss && !isBoss2p) || isTraining || isTrueForm || isAdaptive || isBattleRoyale || isEscort;
  document.getElementById('p2ColorRow').style.display     = hideP2 ? 'none' : 'flex';
  document.getElementById('p2WeaponRow').style.display    = hideP2 ? 'none' : 'flex';
  document.getElementById('p2ClassRow').style.display     = hideP2 ? 'none' : 'flex';
  // Hat/Cape live beside the preview now, so they hide with the rest of the
  // P2 form; the panel then shows the opponent's portrait full-height instead
  // of two orphaned dropdowns over an empty column.
  const _p2Stage = document.getElementById('p2HatRow');
  if (_p2Stage) _p2Stage.style.display = hideP2 ? 'none' : 'flex';
  const _p2Panel = document.getElementById('p2Config');
  if (_p2Panel) _p2Panel.classList.toggle('p2-locked', hideP2);
  const p1BotToggle = document.getElementById('p1BotToggle');
  if (p1BotToggle) p1BotToggle.style.display = (isMinigames || isTrueForm || isAdaptive) ? 'none' : '';
  const p2BotToggleEl = document.getElementById('p2BotToggle');
  if (p2BotToggleEl) p2BotToggleEl.style.display = (isBoss2p) ? '' : (isBoss || isTrueForm || isAdaptive) ? 'none' : '';
  const trainingPanel = document.getElementById('trainingPanel');
  if (trainingPanel) trainingPanel.style.display = isTraining ? 'block' : 'none';
  // 2p and adaptive: show arena + lives picker; all other modes have fixed/auto arenas
  document.getElementById('arenaSection').style.display   = (mode === '2p' || isAdaptive) ? '' : 'none';
  const _infOpt = document.getElementById('infiniteOption');
  if (_infOpt) _infOpt.disabled = !!(isBoss || isTraining || isMinigames || isTrueForm || isOnline || isAdaptive);
  if ((isBoss || isTraining || isMinigames || isTrueForm || isOnline || isAdaptive) && infiniteMode) {
    infiniteMode = false;
    selectLives(3);
  }
  // Chaos mode toggle: only available in minigames and online
  const chaosModeRow = document.getElementById('chaosModeRow');
  if (chaosModeRow) {
    const showChaos = isMinigames || isOnline;
    chaosModeRow.style.display = showChaos ? 'flex' : 'none';
    // If switching away from a chaos-compatible mode, turn chaos off
    if (!showChaos && typeof chaosMode !== 'undefined' && chaosMode) {
      chaosMode = false;
      const btn = document.getElementById('chaosModeBtn');
      if (btn) { btn.textContent = ' Chaos Mode: OFF'; btn.style.borderColor = 'rgba(160,60,255,0.4)'; btn.style.color = '#cc88ff'; btn.style.boxShadow = ''; }
    }
  }
  // Custom weapons: allowed in offline 1v1/training, or online when host enables the checkbox
  const _allowCustomWeapons = (!onlineMode && (mode === '2p' || mode === 'training'))
                             || (onlineMode && onlineAllowCustomWeapons);
  for (const selId of ['p1Weapon', 'p2Weapon']) {
    const sel = document.getElementById(selId);
    if (!sel) continue;
    sel.querySelectorAll('option[value^="_custom_"]').forEach(opt => {
      opt.hidden = !_allowCustomWeapons;
    });
    // If currently selected value is a custom weapon and mode doesn't allow it, reset to sword
    if (!_allowCustomWeapons && sel.value && sel.value.startsWith('_custom_')) {
      sel.value = 'sword';
    }
  }
  // Boss fights are melee-only — grey the ranged cards out rather than letting the
  // player pick one and have _startGameCore swap it for a sword at spawn.
  if (typeof applyBossRangedLock === 'function') applyBossRangedLock(mode);
  // Enter config view if this was a user-initiated mode selection (home content currently visible)
  if (mode !== 'story') {
    const _hc = document.getElementById('menuHomeContent');
    if (_hc && _hc.style.display !== 'none') {
      _enterConfigView(mode);
    }
  }
}

// ── Home/Config view state machine ───────────────────────────────────────────
function _enterConfigView(mode) {
  const menuEl = document.getElementById('menu');
  if (menuEl) menuEl.classList.remove('menu-home');
  const homeContent = document.getElementById('menuHomeContent');
  if (homeContent) homeContent.style.display = 'none';
  _stopHomeCanvas();
  const configContent = document.getElementById('menuConfigContent');
  if (configContent) configContent.style.display = 'flex';
  const modeLabel = document.getElementById('configModeLabel');
  if (modeLabel) {
    const _names = {
      '2p': '1v1', 'boss': 'Boss Fight', 'trueform': 'Cosmic Axiom',
      'training': 'Training', 'minigames': 'Minigames', 'online': 'Online',
      'battleroyale': 'Battle Royale',
      'sovereign': 'Sovereign Ω', 'adaptive': 'Adaptive AI', 'storyonline': 'Story Online',
    };
    modeLabel.textContent = _names[mode] || mode.toUpperCase();
  }
}

function backToHome() {
  const menuEl = document.getElementById('menu');
  if (menuEl) menuEl.classList.add('menu-home');
  const homeContent = document.getElementById('menuHomeContent');
  if (homeContent) homeContent.style.display = '';
  const configContent = document.getElementById('menuConfigContent');
  if (configContent) configContent.style.display = 'none';
  closeSimulator();
  closeStoryPath();
  if (!_homeCanvasRAF) _initHomeCanvas();
}

// ── Simulator navigation ──────────────────────────────────────────────────────
function _hideAllSimPanels() {
  ['simulatorPanel', 'refightPanel', 'theGridPanel'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function openSimulator() {
  _hideAllSimPanels();
  const pathCards  = document.getElementById('pathCards');
  const simPanel   = document.getElementById('simulatorPanel');
  const usernameEl = document.getElementById('simGreetUsername');
  if (pathCards) pathCards.style.display = 'none';
  if (simPanel)  simPanel.style.display  = '';
  if (usernameEl) {
    const acct = (typeof AccountManager !== 'undefined') ? AccountManager.getActiveAccount() : null;
    usernameEl.textContent = (acct && acct.username) ? acct.username : 'Pilot';
  }
}

function closeSimulator() {
  _hideAllSimPanels();
  const pathCards = document.getElementById('pathCards');
  if (pathCards) pathCards.style.display = '';
}

function openRefight() {
  _hideAllSimPanels();
  const refightPanel = document.getElementById('refightPanel');
  if (refightPanel) refightPanel.style.display = '';
  _applyRefightLocks();
}

function _applyRefightLocks() {
  var _locks = {
    'refight-creator':  typeof bossBeaten          !== 'undefined' ? !!bossBeaten          : false,
    'refight-trueform': typeof unlockedTrueBoss     !== 'undefined' ? !!unlockedTrueBoss     : false,
    'refight-sovereign':typeof sovereignBeaten      !== 'undefined' ? !!sovereignBeaten      : false,
    'modeAbsoluteAxiom': typeof absoluteAxiomUnlocked !== 'undefined' ? !!absoluteAxiomUnlocked : false,
  };
  var _allUnlocked = _locks['refight-creator'] && _locks['refight-trueform'] && _locks['refight-sovereign'];

  Object.keys(_locks).forEach(function(id) {
    _setRefightCardLock(id, !_locks[id]);
  });
  _setRefightCardLock('refight-gauntlet', !_allUnlocked);
}

function _setRefightCardLock(id, locked) {
  var el = document.getElementById(id);
  if (!el) return;
  if (locked) {
    el.classList.add('refight-locked');
    el.onclick = function() {
      if (typeof showToast === 'function') showToast(' Complete this fight in Story Mode first.');
    };
  } else {
    el.classList.remove('refight-locked');
    var _modeMap = {
      'refight-creator':  function() { startSimFight('boss'); },
      'refight-trueform': function() { startSimFight('trueform'); },
      'refight-sovereign':function() { startSimFight('sovereign'); },
      'modeAbsoluteAxiom': function() { startSimFight('absoluteaxiom'); },
      'refight-gauntlet': function() { startSimGauntlet(); },
    };
    if (_modeMap[id]) el.onclick = _modeMap[id];
  }
}

function closeRefight() {
  const refightPanel = document.getElementById('refightPanel');
  if (refightPanel) refightPanel.style.display = 'none';
  const simPanel = document.getElementById('simulatorPanel');
  if (simPanel) simPanel.style.display = '';
}

function openTheGrid() {
  _hideAllSimPanels();
  const theGridPanel = document.getElementById('theGridPanel');
  if (theGridPanel) theGridPanel.style.display = '';
}

function closeTheGrid() {
  const theGridPanel = document.getElementById('theGridPanel');
  if (theGridPanel) theGridPanel.style.display = 'none';
  const simPanel = document.getElementById('simulatorPanel');
  if (simPanel) simPanel.style.display = '';
}

// Back-compat alias — the real implementation is the cutscene theater
// (smb-debug-jump.js). Kept so any older call site still lands somewhere real.
function openCutsceneViewer() {
  if (typeof openCutsceneTheater === 'function') { openCutsceneTheater(); return; }
  if (typeof showToast === 'function') showToast('Cutscene theater unavailable.');
}

// ── Simulator fight launchers (formerly Boss Rush) ────────────────────────────
let _bossRushGauntlet = [];  // ['boss','trueform','sovereign'] when gauntlet active
let _bossRushIdx = -1;

function startSimFight(mode) {
  _bossRushGauntlet = [];
  _bossRushIdx = -1;
  _hideAllSimPanels();
  selectMode(mode);
}

function startSimGauntlet() {
  _bossRushGauntlet = ['boss', 'trueform', 'sovereign'];
  _bossRushIdx = 0;
  _hideAllSimPanels();
  selectMode('boss');
  if (typeof startGame === 'function') startGame();
}

// Legacy aliases — referenced by old code paths
function openNexus()     { openSimulator(); }
function closeNexus()    { closeSimulator(); }
function openBossRush()  { openRefight(); }
function closeBossRush() { closeRefight(); }
function startBossRushFight(mode) { startSimFight(mode); }
function startBossRushGauntlet()  { startSimGauntlet(); }

function bossRushAdvance() {
  _bossRushIdx++;
  const overlay = document.getElementById('gameOverOverlay');
  if (overlay) overlay.style.display = 'none';
  if (_bossRushIdx < _bossRushGauntlet.length) {
    const nextMode = _bossRushGauntlet[_bossRushIdx];
    selectMode(nextMode);
    if (typeof startGame === 'function') startGame();
  } else {
    _clearBossRushGauntlet();
    if (typeof backToMenu === 'function') backToMenu();
    if (typeof showToast === 'function') showToast(' Gauntlet Complete — you are unstoppable.');
  }
}

function _clearBossRushGauntlet() {
  _bossRushGauntlet = [];
  _bossRushIdx = -1;
  const row = document.getElementById('bossRushRow');
  if (row) row.style.display = 'none';
}

function _updateBossRushNextBtn(playerWon) {
  const row = document.getElementById('bossRushRow');
  if (!row) return;
  const hasNext = _bossRushGauntlet.length > 0 && (_bossRushIdx + 1) < _bossRushGauntlet.length;
  row.style.display = (playerWon && hasNext) ? '' : 'none';
  if (playerWon && hasNext) {
    const labels = { boss: 'Creator', trueform: 'Cosmic Axiom', sovereign: 'SOVEREIGN Ω' };
    const btn = document.getElementById('bossRushNextBtn');
    if (btn) btn.textContent = 'Continue: ' + (labels[_bossRushGauntlet[_bossRushIdx + 1]] || 'Next') + ' →';
  }
}

function _openStoryPathPanel() {
  const pathCards = document.getElementById('pathCards');
  const storyPathPanel = document.getElementById('storyPathPanel');
  if (pathCards) pathCards.style.display = 'none';
  if (storyPathPanel) storyPathPanel.style.display = '';
  if (typeof _refreshStoryLoadoutLabels === 'function') _refreshStoryLoadoutLabels();
}

function openStoryPath() {
  // First Story open ever plays the Tuesday cold open, then reveals the panel
  // underneath it. maybePlayTuesdayPrologue() lives in smb-menu-utils.js, which
  // loads after this file — fine at click time, guarded anyway.
  if (typeof maybePlayTuesdayPrologue === 'function' &&
      maybePlayTuesdayPrologue(_openStoryPathPanel)) return;
  _openStoryPathPanel();
}

function closeStoryPath() {
  const pathCards = document.getElementById('pathCards');
  const storyPathPanel = document.getElementById('storyPathPanel');
  if (pathCards) pathCards.style.display = '';
  if (storyPathPanel) storyPathPanel.style.display = 'none';
}

// ── Custom weapon options ─────────────────────────────────────────────────────
function refreshCustomWeaponOptions() {
  const customWeapons = window.CUSTOM_WEAPONS || {};
  const keys = Object.keys(customWeapons);
  for (const selId of ['p1Weapon', 'p2Weapon']) {
    const sel = document.getElementById(selId);
    if (!sel) continue;
    // Remove any previously-injected custom options
    sel.querySelectorAll('option[value^="_custom_"]').forEach(o => o.remove());
    sel.querySelectorAll('optgroup[label="─── Custom ────────────"]').forEach(g => g.remove());
    if (keys.length === 0) continue;
    const grp = document.createElement('optgroup');
    grp.label = '─── Custom ────────────';
    keys.forEach(key => {
      const w = customWeapons[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = ' ' + (w.name || key);
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  }
  // Rebuild card grids to include the new options
  _buildSelCardGrid('p1WeaponCards', 'p1Weapon', _WEAPON_CARD_DATA, 'p1', 'weapon');
  _buildSelCardGrid('p2WeaponCards', 'p2Weapon', _WEAPON_CARD_DATA, 'p2', 'weapon');
}

// Called by the "Custom Weapons" checkbox in #onlineGameModeRow
function toggleOnlineCustomWeapons(checked) {
  // Guests cannot change match rules — bounce the checkbox back.
  if (window.NetworkManager && NetworkManager.connected && !NetworkManager.isHost()) {
    NetworkManager.showToast('Only the host can change match settings');
    const el = document.getElementById('onlineCustomWeaponsCheck');
    if (el) el.checked = !!onlineAllowCustomWeapons;
    return;
  }
  onlineAllowCustomWeapons = !!checked;
  // Re-run selectMode so weapon dropdowns update immediately
  if (typeof selectMode === 'function') selectMode(gameMode || 'online');
  if (window.NetworkManager && NetworkManager.connected) {
    NetworkManager.sendGameEvent('customWeaponsToggled', { allowCustomWeapons: onlineAllowCustomWeapons });
    NetworkManager.renderLobby();
  }
}

function toggleCompleteRandom(forceValue) {
  const nextValue = typeof forceValue === 'boolean' ? forceValue : !completeRandomizer;
  completeRandomizer = nextValue;
  if (gameMode !== '2p') gameMode = '2p';
  selectMode('2p');
}

const SKIN_COLORS = {
  default: null, // uses player's selected color
  fire:    '#ff4400',
  ice:     '#44aaff',
  shadow:  '#222233',
  gold:    '#cc8800',
  void:    '#7700cc',
  neon:    '#00ff88',
};

// Weapon theme tint colors applied as a colour-blend overlay in drawWeapon()
const WEAPON_THEMES = {
  default: null,
  fire:    '#ff5500',
  ice:     '#44aaff',
  shadow:  '#220033',
  gold:    '#ffaa00',
  void:    '#aa00ff',
  neon:    '#00ff88',
};

// Cosmetic catalog — price 0 = free / always unlocked
const COSMETIC_CATALOG = [
  // Character skins
  { id: 'skin_default', type: 'skin', key: 'default', name: 'Default',   price: 0,   color: null },
  { id: 'skin_fire',    type: 'skin', key: 'fire',    name: 'Fire',      price: 0,   color: '#ff4400' },
  { id: 'skin_ice',     type: 'skin', key: 'ice',     name: 'Ice',       price: 0,   color: '#44aaff' },
  { id: 'skin_shadow',  type: 'skin', key: 'shadow',  name: 'Shadow',    price: 0,   color: '#222233' },
  { id: 'skin_gold',    type: 'skin', key: 'gold',    name: 'Gold',      price: 0,   color: '#cc8800' },
  { id: 'skin_void',    type: 'skin', key: 'void',    name: 'Void',      price: 150, color: '#7700cc' },
  { id: 'skin_neon',    type: 'skin', key: 'neon',    name: 'Neon',      price: 100, color: '#00ff88' },
  // Weapon themes
  { id: 'wskin_default', type: 'wskin', key: 'default', name: 'Default', price: 0,   color: '#888888' },
  { id: 'wskin_fire',    type: 'wskin', key: 'fire',    name: 'Inferno', price: 50,  color: '#ff5500' },
  { id: 'wskin_ice',     type: 'wskin', key: 'ice',     name: 'Glacier', price: 50,  color: '#44aaff' },
  { id: 'wskin_shadow',  type: 'wskin', key: 'shadow',  name: 'Shadow',  price: 50,  color: '#220033' },
  { id: 'wskin_gold',    type: 'wskin', key: 'gold',    name: 'Gilded',  price: 75,  color: '#ffaa00' },
  { id: 'wskin_void',    type: 'wskin', key: 'void',    name: 'Void',    price: 200, color: '#aa00ff' },
  { id: 'wskin_neon',    type: 'wskin', key: 'neon',    name: 'Neon',    price: 125, color: '#00ff88' },
];

// ---- Coin balance ----
// Sourced from playerCoins global (hydrated by _refreshRuntimeFromSave)
let coinBalance = (typeof playerCoins !== 'undefined') ? playerCoins : 0;

function _syncCoinDisplay() {
  const storeBal = document.getElementById('storeCoinBalance');
  if (storeBal) {
    storeBal.textContent = coinBalance + ' ⬡';
    storeBal.classList.add('coin-pop');
    setTimeout(() => storeBal.classList.remove('coin-pop'), 500);
  }
  // Nav chip is a corner badge on a 34px plate — the number alone fits, and
  // the plate's own coin icon already says what it counts. The store panel
  // balance above keeps the glyph.
  const coinEl = document.getElementById('coinDisplay');
  if (coinEl) coinEl.textContent = coinBalance;
}

function getCoinBalance() {
  // Always read from account.data via getCoins() (single source of truth)
  if (typeof getCoins === 'function') {
    coinBalance = getCoins();
  } else if (typeof playerCoins === 'number') {
    coinBalance = playerCoins;
  }
  return coinBalance;
}

function refreshCoinDisplay() {
  if (typeof getCoins === 'function') coinBalance = getCoins();
  else if (typeof playerCoins === 'number') coinBalance = playerCoins;
  _syncCoinDisplay();
}

function setCoinBalance(value) {
  const next = Math.max(0, Math.floor(Number(value) || 0));
  coinBalance = next;
  // Delegate to canonical setCoins() which writes to account.data first
  if (typeof setCoins === 'function') {
    setCoins(next);
  } else if (typeof updateCoins === 'function') {
    updateCoins(function() { return next; });
  } else if (typeof playerCoins !== 'undefined') {
    playerCoins = next;
    if (typeof saveGame === 'function') saveGame();
  }
  _syncCoinDisplay();
  return coinBalance;
}

function awardCoins(n) {
  const amount = Number(n) || 0;
  if (typeof addCoins === 'function') {
    addCoins(amount);
    coinBalance = typeof getCoins === 'function' ? getCoins() : coinBalance + amount;
    _syncCoinDisplay();
    return coinBalance;
  }
  return setCoinBalance(getCoinBalance() + amount);
}

// ---- Unlocked cosmetics (sourced from unlockedCosmetics global) ----
function _getUnlocked() {
  return typeof unlockedCosmetics !== 'undefined' ? unlockedCosmetics : [];
}
function isCosmeticUnlocked(id) {
  const entry = COSMETIC_CATALOG.find(c => c.id === id);
  if (!entry || entry.price === 0) return true;
  return _getUnlocked().indexOf(id) !== -1;
}
function unlockCosmetic(id) {
  const entry = COSMETIC_CATALOG.find(c => c.id === id);
  if (!entry) return false;
  if (isCosmeticUnlocked(id)) return true;
  const _bal = typeof getCoins === 'function' ? getCoins() : getCoinBalance();
  if (_bal < entry.price) return false;
  if (typeof setCoins === 'function') {
    setCoins(_bal - entry.price);
    coinBalance = typeof getCoins === 'function' ? getCoins() : coinBalance - entry.price;
    _syncCoinDisplay();
  } else {
    setCoinBalance(_bal - entry.price);
  }
  if (typeof addCosmetic === 'function') {
    addCosmetic(id);
  } else if (typeof unlockedCosmetics !== 'undefined' && unlockedCosmetics.indexOf(id) === -1) {
    unlockedCosmetics.push(id);
    if (typeof saveGame === 'function') saveGame();
  }
  if (typeof checkCompletionAchievements === 'function') checkCompletionAchievements();
  return true;
}

// ---- Equip state ----
let p1Skin = 'default', p2Skin = 'default';
let p1WeaponSkin = 'default', p2WeaponSkin = 'default';

function setSkin(pid, skin, btn) {
  if (pid === 'p1') p1Skin = skin;
  else              p2Skin = skin;
  document.querySelectorAll(`.skin-swatch[data-pid="${pid}"]`).forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function setWeaponSkin(pid, skin, btn) {
  if (pid === 'p1') p1WeaponSkin = skin;
  else              p2WeaponSkin = skin;
  document.querySelectorAll(`.wskin-swatch[data-pid="${pid}"]`).forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ---- Store modal ----
function openStore() {
  renderStore();
  const m = document.getElementById('cosmeticStore');
  if (m) m.style.display = 'flex';
}
function closeStore() {
  const m = document.getElementById('cosmeticStore');
  if (m) m.style.display = 'none';
}
function renderStore() {
  const el = document.getElementById('storeCoinBalance');
  if (el) el.textContent = coinBalance + ' ⬡';
  const grid = document.getElementById('storeGrid');
  if (!grid) return;
  grid.innerHTML = '';
  COSMETIC_CATALOG.forEach(item => {
    const owned = isCosmeticUnlocked(item.id);
    const card  = document.createElement('div');
    card.className = 'store-card' + (owned ? ' owned' : '');
    const swatch = item.color
      ? `<div class="store-swatch" style="background:${item.color}"></div>`
      : `<div class="store-swatch" style="background:linear-gradient(135deg,#00d4ff,#ff4455)"></div>`;
    const typeLabel = item.type === 'skin' ? 'Character Skin' : 'Weapon Theme';
    card.innerHTML = `
      ${swatch}
      <div class="store-name">${item.name}</div>
      <div class="store-type">${typeLabel}</div>
      ${owned
        ? `<div class="store-owned">Owned</div>`
        : `<button class="store-buy-btn" onclick="handleStoreBuy('${item.id}')">${item.price} ⬡</button>`
      }`;
    grid.appendChild(card);
  });
}
function handleStoreBuy(id) {
  const ok = unlockCosmetic(id);
  if (!ok) {
    const msg = document.getElementById('storeMsg');
    if (msg) { msg.textContent = 'Not enough coins!'; msg.style.color = '#ff4455'; setTimeout(() => { msg.textContent = ''; }, 1800); }
    return;
  }
  renderStore(); // refresh
  // If bought a skin/wskin that is currently equipped, mark it visually
  _syncStoreSwatches();
}
function _syncStoreSwatches() {
  // Mark locked swatches visually
  document.querySelectorAll('.skin-swatch[data-cosid]').forEach(btn => {
    btn.disabled = !isCosmeticUnlocked(btn.dataset.cosid);
    btn.style.opacity = btn.disabled ? '0.35' : '1';
  });
  document.querySelectorAll('.wskin-swatch[data-cosid]').forEach(btn => {
    btn.disabled = !isCosmeticUnlocked(btn.dataset.cosid);
    btn.style.opacity = btn.disabled ? '0.35' : '1';
  });
}

function setBossPlayers(n) {
  bossPlayerCount = n;
  document.getElementById('bpBtn1').classList.toggle('active', n === 1);
  document.getElementById('bpBtn2').classList.toggle('active', n === 2);
  selectMode('boss'); // refresh UI
}

// Instant match for first-time visitors: no menus, no unlocks, no story gating.
// Arena, weapon and class are all rolled at random for this match (see
// isQuickFightRand in _startGameCore) — the 1v1 menu selections are left untouched.
// Arenas are limited to this hazard-free set so a first fight reads clearly, unless
// the player turns on settings.quickFightHazards.
const _QUICK_FIGHT_ARENAS = ['grass', 'city', 'forest', 'colosseum', 'clouds', 'ruins'];
function quickFight() {
  // Hides storyModal directly rather than via closeStoryMenu(), which refuses to
  // close until chapter 0 is beaten. Quick Fight is a deliberate bypass of that gate.
  const sm = document.getElementById('storyModal');
  if (sm) sm.style.display = 'none';
  const ov = document.getElementById('prologueOverlay');
  if (ov) ov.style.display = 'none';
  selectMode('2p');
  p1IsBot = false;
  p2IsBot = true;
  p2IsNone = false;
  const b = document.getElementById('p2BotToggle');
  if (b) b.textContent = 'Bot';
  window._quickFightRandomNext = true;
  startGame();
}

function toggleBot(pid) {
  if (pid === 'p1') {
    p1IsBot = !p1IsBot;
    const btn = document.getElementById('p1BotToggle');
    if (btn) btn.textContent = p1IsBot ? 'Bot' : 'Human';
  } else {
    // Cycle: Human → Bot → None → Human
    if (!p2IsBot && !p2IsNone)      { p2IsBot = true;  p2IsNone = false; }
    else if (p2IsBot && !p2IsNone)  { p2IsBot = false; p2IsNone = true;  }
    else                             { p2IsBot = false; p2IsNone = false; }
    const btn = document.getElementById('p2BotToggle');
    if (btn) btn.textContent = p2IsNone ? 'None' : (p2IsBot ? 'Bot' : 'Human');
  }
  // Refresh mode UI to reflect updated bot state
  selectMode(gameMode);
}

// ============================================================
// WEAPON / CLASS CARD GRIDS
// ============================================================
const _WEAPON_CARD_DATA = {
  random:        { tag: 'Chaos' },
  sword:         { tag: 'Fast' },
  hammer:        { tag: 'Heavy' },
  gun:           { tag: 'Ranged' },
  axe:           { tag: 'Splash' },
  spear:         { tag: 'Reach' },
  bow:           { tag: 'Volley' },
  shield:        { tag: 'Guard' },
  scythe:        { tag: 'Lifesteal' },
  fryingpan:     { tag: 'Stun' },
  broomstick:    { tag: 'Push' },
  combat:        { tag: 'Combo' },
  peashooter:    { tag: 'Rapid' },
  slingshot:     { tag: 'Arc' },
  paperairplane: { tag: 'Curve' },
  flail:         { tag: 'Return' },
  whip:          { tag: 'Zone' },
  boomerang:     { tag: 'Returner' },
  katana:        { tag: 'Precise' },
  flamethrower:  { tag: 'Suppress' },
  electricstaff: { tag: 'Chain' },
  bomb:          { tag: 'Blast' },
  knives:        { tag: 'Recall' },
  glassblade:    { tag: 'Fragile' },
  anchor:        { tag: 'Moored' },
  crossbow:      { tag: 'Pin' },
  fragment:      { tag: 'Style' },
};

const _CLASS_CARD_DATA = {
  random:      { tag: 'Surprise' },
  none:        { tag: 'Free' },
  warrior:     { tag: 'Balanced' },
  thor:        { tag: 'Tank' },
  kratos:      { tag: 'Rage' },
  ninja:       { tag: 'Speed' },
  gunner:      { tag: 'Double' },
  archer:      { tag: 'Evasive' },
  paladin:     { tag: 'Holy' },
  berserker:   { tag: 'Frenzy' },
  megaknight:  { tag: 'Legend' },
  pugilist:    { tag: 'Brawler' },
  ronin:       { tag: 'Precision' },
  reaper:      { tag: 'Undying' },
  summoner:    { tag: 'Swarm' },
  demolitionist: { tag: 'Blast' },
  warden:      { tag: 'Armour' },
  adept:       { tag: 'Fragment' },
};

// ── Home Screen Canvas Animation ──────────────────────────────────────────────
var _homeCanvasRAF = null;
var _homeCanvasT0  = 0;

function _homeDrawBg(ctx, W, H) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 130, 255, 0.038)';
  ctx.lineWidth = 1;
  var step = 32;
  for (var i = -H; i < W + H; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H * 0.65, H);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(70, 40, 180, 0.05)';
  for (var gx = 0; gx < W; gx += 95) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
  }
  for (var gy = 0; gy < H; gy += 95) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
  }
  var vig = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.12, W / 2, H * 0.55, H * 0.82);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function _homeDrawStick(ctx, cx, cy, color, t, flipped, sc) {
  ctx.save();
  ctx.translate(cx, cy);
  if (flipped) ctx.scale(-1, 1);
  ctx.scale(sc, sc);

  var bob       = Math.sin(t * 1.3) * 3.5;
  var swing     = Math.sin(t * 0.85) * 11;
  var capeWave  = Math.sin(t * 1.05) * 7;
  var capeDroop = Math.sin(t * 0.7 + 0.5) * 4;

  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // ── CAPE (wide flowing cloak) ────────────────────────────────────
  var tipX = -40 + capeWave * 0.6, tipY = 55 + bob + capeDroop;
  ctx.save();
  ctx.beginPath();
  // Outer edge: from upper shoulder, sweeps far left, down to tip
  ctx.moveTo(-4, -43 + bob);
  ctx.bezierCurveTo(
    -42 + capeWave * 0.5, -20 + bob,
    -58 + capeWave * 0.8,  18 + bob,
    tipX, tipY
  );
  // Inner edge: stays closer to body spine, back up to lower neck
  ctx.bezierCurveTo(
    -30 + capeWave * 0.4,  28 + bob,
    -16 + capeWave * 0.2,  -2 + bob,
    -5, -30 + bob
  );
  ctx.closePath();
  ctx.fillStyle   = color;
  ctx.globalAlpha = 0.44;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 22;
  ctx.fill();
  // Outer edge stroke
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.8;
  ctx.shadowBlur  = 14;
  ctx.beginPath();
  ctx.moveTo(-4, -43 + bob);
  ctx.bezierCurveTo(
    -42 + capeWave * 0.5, -20 + bob,
    -58 + capeWave * 0.8,  18 + bob,
    tipX, tipY
  );
  ctx.stroke();
  // Center fold crease
  ctx.lineWidth   = 1;
  ctx.globalAlpha = 0.4;
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.moveTo(-5, -36 + bob);
  ctx.bezierCurveTo(
    -28 + capeWave * 0.3, -5 + bob,
    -38 + capeWave * 0.5, 22 + bob,
    tipX + 8, tipY - 6
  );
  ctx.stroke();
  ctx.restore();

  // ── FIGURE ───────────────────────────────────────────────────────
  ctx.strokeStyle = color;
  ctx.shadowColor = color;

  // Head
  ctx.shadowBlur = 20;
  ctx.lineWidth  = 4.5;
  ctx.beginPath();
  ctx.arc(0, -60 + bob, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.fillStyle   = color;
  ctx.globalAlpha = 0.15;
  ctx.fill();
  ctx.restore();

  // Body
  ctx.shadowBlur = 14;
  ctx.lineWidth  = 5.5;
  ctx.beginPath();
  ctx.moveTo(0, -45 + bob);
  ctx.lineTo(0, -7  + bob);
  ctx.stroke();

  // Back arm
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(0, -38 + bob);
  ctx.lineTo(-24, -20 + bob - swing * 0.5);
  ctx.stroke();

  // Weapon arm
  var hx = 26, hy = -20 + bob + swing;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(0, -38 + bob);
  ctx.lineTo(hx, hy);
  ctx.stroke();

  // Legs
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -7 + bob);
  ctx.lineTo(-18, 30 + bob + swing * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -7 + bob);
  ctx.lineTo(18, 30 + bob - swing * 0.55);
  ctx.stroke();

  // ── SWORD ─────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(0.28 + Math.sin(t * 0.6) * 0.15);

  // Wide soft glow
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 32;
  ctx.lineWidth   = 9;
  ctx.globalAlpha = 0.28;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(54, 0); ctx.stroke();

  // Blade
  ctx.globalAlpha = 1.0;
  ctx.lineWidth   = 4.5;
  ctx.shadowBlur  = 22;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(54, 0); ctx.stroke();

  // Blade edge highlight
  ctx.lineWidth   = 1.5;
  ctx.globalAlpha = 0.5;
  ctx.shadowBlur  = 0;
  ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(54, -0.5); ctx.stroke();

  // Crossguard
  ctx.globalAlpha = 1.0;
  ctx.lineWidth   = 3.5;
  ctx.shadowBlur  = 12;
  ctx.beginPath(); ctx.moveTo(11, -11); ctx.lineTo(11, 11); ctx.stroke();

  ctx.restore();
  ctx.restore();
}

// ── Large Kael hero silhouette for the homescreen ────────────────────────────
// Drawn on homeCanvas (z-index 9) so he appears above the game canvas fracture
// but behind HTML cards. baseY = foot position in screen pixels.
function _homeDrawKael(ctx, cx, baseY, sc, t) {
  // Grounded "sword-planted" hero: clean stickman silhouette, no cape,
  // one continuous gradient-faded red scarf as the signature element.
  var bob      = Math.sin(t * 0.9) * 2 * sc;   // subtle breathing on the torso
  var headR    = 14 * sc;
  var hipY     = baseY - 44 * sc;
  var shouldY  = hipY - 34 * sc + bob;
  var headY    = shouldY - headR - 6 * sc;
  var DARK     = '#060309';

  // Sword geometry (planted point-down at his side, clear of the torso)
  var swX      = cx + 12 * sc;
  var pommelY  = shouldY + 4 * sc;
  var gripY    = shouldY + 13 * sc;
  var guardY   = shouldY + 21 * sc;
  var tipY     = baseY - 1 * sc;

  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Ground void mist
  var gm = ctx.createRadialGradient(cx, baseY + 5*sc, 2*sc, cx, baseY + 5*sc, 65*sc);
  gm.addColorStop(0, 'rgba(70,15,140,0.22)');
  gm.addColorStop(0.5, 'rgba(35,8,70,0.10)');
  gm.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gm;
  ctx.beginPath(); ctx.ellipse(cx, baseY + 5*sc, 65*sc, 16*sc, 0, 0, Math.PI*2); ctx.fill();

  // Faint red bloom where the blade meets the ground
  var bg = ctx.createRadialGradient(swX, baseY + 2*sc, 1*sc, swX, baseY + 2*sc, 26*sc);
  bg.addColorStop(0, 'rgba(220,40,40,0.20)');
  bg.addColorStop(1, 'rgba(220,40,40,0)');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(swX, baseY + 2*sc, 26*sc, 7*sc, 0, 0, Math.PI*2); ctx.fill();

  // Void rim light on head (fracture light from above)
  ctx.beginPath(); ctx.arc(cx, headY, headR + 3*sc, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(75,30,165,0.13)'; ctx.fill();

  var RIM = 'rgba(255,255,255,0.6)';   // thin white outline

  // Limb paths (torso, legs, arms) — traced once, stroked twice
  function limbPaths() {
    ctx.beginPath();
    ctx.moveTo(cx, shouldY);              ctx.lineTo(cx, hipY);               // torso
    ctx.moveTo(cx, hipY);                 ctx.lineTo(cx - 15*sc, baseY);      // left leg
    ctx.moveTo(cx, hipY);                 ctx.lineTo(cx + 16*sc, baseY);      // right leg
    ctx.moveTo(cx - 2*sc, shouldY + 3*sc); ctx.lineTo(swX - 2*sc, gripY + 1*sc); // left arm
    ctx.moveTo(cx + 2*sc, shouldY + 2*sc); ctx.lineTo(swX, gripY - 3*sc);        // right arm
  }
  // Sword paths (blade, crossguard, grip)
  function swordPaths() {
    ctx.beginPath();
    ctx.moveTo(swX, guardY);      ctx.lineTo(swX + 1.5*sc, tipY);   // blade
    ctx.moveTo(swX - 9*sc, guardY); ctx.lineTo(swX + 9*sc, guardY); // crossguard
    ctx.moveTo(swX, guardY);      ctx.lineTo(swX, pommelY);         // grip
  }

  // Head — dark fill + thin white outline
  ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI*2);
  ctx.fillStyle = DARK; ctx.globalAlpha = 0.97; ctx.fill(); ctx.globalAlpha = 1;
  ctx.lineWidth = 1.4*sc; ctx.strokeStyle = RIM; ctx.stroke();

  // Subtle red edge glow on the blade
  ctx.beginPath(); ctx.moveTo(swX, guardY); ctx.lineTo(swX + 1.5*sc, tipY);
  ctx.strokeStyle = 'rgba(180,40,40,0.22)'; ctx.lineWidth = 7*sc; ctx.stroke();

  // White outline underlay, then near-black body/sword on top
  limbPaths();  ctx.strokeStyle = RIM;  ctx.lineWidth = 3.5*sc + 1.6*sc; ctx.stroke();
  swordPaths(); ctx.strokeStyle = RIM;  ctx.lineWidth = 2.6*sc + 1.4*sc; ctx.stroke();
  limbPaths();  ctx.strokeStyle = DARK; ctx.lineWidth = 3.5*sc; ctx.stroke();
  swordPaths(); ctx.strokeStyle = DARK; ctx.lineWidth = 2.6*sc; ctx.stroke();

  // Pommel — dark bead with thin white rim
  ctx.beginPath(); ctx.arc(swX, pommelY - 2*sc, 2.4*sc, 0, Math.PI*2);
  ctx.fillStyle = DARK; ctx.fill();
  ctx.lineWidth = 1.2*sc; ctx.strokeStyle = RIM; ctx.stroke();

  // Red scarf — one continuous ribbon off the left shoulder, fading at the tail
  var s1 = Math.sin(t * 1.1)         * 6  * sc;
  var s2 = Math.sin(t * 1.1 + 1.1)   * 10 * sc;
  var s3 = Math.sin(t * 1.1 + 2.2)   * 14 * sc;
  var neckX = cx - 3*sc, neckSY = shouldY - 2*sc;
  var tipX  = cx - 56*sc + s3, tipSY = shouldY + 74*sc;
  var scarf = ctx.createLinearGradient(neckX, neckSY, tipX, tipSY);
  scarf.addColorStop(0,    'rgba(255,58,58,0.98)');
  scarf.addColorStop(0.55, 'rgba(222,30,30,0.80)');
  scarf.addColorStop(1,    'rgba(150,20,20,0)');
  ctx.beginPath();
  ctx.moveTo(neckX, neckSY);
  ctx.bezierCurveTo(
    cx - 24*sc + s1, shouldY + 18*sc,
    cx - 36*sc + s2, shouldY + 40*sc,
    cx - 46*sc + s2, shouldY + 55*sc
  );
  ctx.bezierCurveTo(
    cx - 52*sc + s3, shouldY + 65*sc,
    cx - 55*sc + s3, shouldY + 70*sc,
    tipX, tipSY
  );
  ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 11 * sc;
  ctx.strokeStyle = scarf; ctx.lineWidth = 4*sc; ctx.lineCap = 'round'; ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.restore();
}


// ── HOME HERO SCENE ─────────────────────────────────────────────────────────
// A story beat instead of a portrait. Kael comes through the rift on the left,
// caught mid-dash across the sky, with hunters converging from the right.
//
// Composition rule: everything lives in the upper band (~0.10H to 0.36H). The
// title sits above it and the hub cards start around 0.38H, so the art has its
// own lane and never fights either. The closing vignette darkens the lower half
// so card text stays readable over whatever the game canvas draws underneath.
//
// Units: `u` is a single scale factor (1 at a 900px-tall window), and every
// offset below is written in those units, so the whole scene rescales together.

// The rift Kael came through — a vertical tear, brightest at its seam.
function _homeRift(ctx, x, y, h, u, t) {
  var w = h * 0.085;   // a TEAR, not a lozenge — it was far too wide before
  var flick = 0.86 + Math.sin(t * 2.3) * 0.08 + Math.sin(t * 5.7) * 0.04;

  ctx.save();

  // Outer bloom
  var bloom = ctx.createRadialGradient(x, y, 0, x, y, h * 0.62);
  bloom.addColorStop(0,    'rgba(150,60,255,' + (0.30 * flick) + ')');
  bloom.addColorStop(0.45, 'rgba(90,30,180,0.10)');
  bloom.addColorStop(1,    'rgba(40,10,90,0)');
  ctx.fillStyle = bloom;
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.62, h * 0.66, 0, 0, Math.PI * 2); ctx.fill();

  // The tear itself: a tall lens with a ragged edge, not a clean ellipse.
  ctx.beginPath();
  var N = 26;
  for (var i = 0; i <= N; i++) {
    var a = (i / N) * Math.PI * 2;
    var jag = 1 + Math.sin(a * 7 + t * 1.6) * 0.07 + Math.sin(a * 13 - t * 2.1) * 0.04;
    var px = x + Math.sin(a) * w * jag;
    var py = y - Math.cos(a) * h * 0.5 * jag;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  var core = ctx.createLinearGradient(x - w, y, x + w, y);
  core.addColorStop(0,    'rgba(40,8,90,0.0)');
  core.addColorStop(0.32, 'rgba(120,45,220,0.75)');
  core.addColorStop(0.5,  'rgba(244,226,255,' + (0.98 * flick) + ')');
  core.addColorStop(0.68, 'rgba(120,45,220,0.75)');
  core.addColorStop(1,    'rgba(40,8,90,0.0)');
  ctx.fillStyle = core; ctx.fill();
  ctx.strokeStyle = 'rgba(214,170,255,0.55)'; ctx.lineWidth = 1.2 * u; ctx.stroke();

  // Hot seam down the middle — this is what sells it as an opening rather than
  // a shape: a hard white line the fill blooms away from.
  var seam = ctx.createLinearGradient(x, y - h * 0.5, x, y + h * 0.5);
  seam.addColorStop(0,   'rgba(255,255,255,0)');
  seam.addColorStop(0.5, 'rgba(255,245,255,' + (0.92 * flick) + ')');
  seam.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.strokeStyle = seam; ctx.lineWidth = 2.2 * u;
  ctx.beginPath(); ctx.moveTo(x, y - h * 0.47); ctx.lineTo(x, y + h * 0.47); ctx.stroke();

  // Hairline fractures radiating off the seam
  ctx.strokeStyle = 'rgba(180,110,255,0.34)';
  ctx.lineWidth = 1.2 * u;
  for (var k = 0; k < 7; k++) {
    var ang = -1.5 + k * 0.48 + Math.sin(t * 0.7 + k) * 0.05;
    var len = h * (0.30 + (k % 3) * 0.13);
    var sx  = x + Math.sin(ang) * w * 0.8;
    var sy  = y - Math.cos(ang) * h * 0.34;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(ang * 1.7) * len * 0.5, sy + Math.sin(ang * 1.7) * len);
    ctx.stroke();
  }
  ctx.restore();
}

// One stickman. Shared by the hero and the hunters — only the pose constants,
// colours and weapon differ, so they read as the same species of figure.
// o = { face, u, dark, rim, weapon, alpha, scarf, t, lean }
function _homeStickman(ctx, hx, hy, o) {
  var u = o.u, f = o.face || 1, t = o.t || 0;
  var DARK = o.dark || '#07040d';
  var RIM  = o.rim  || 'rgba(255,255,255,0.62)';

  // Mid-dash pose, measured from the HIP at (0,0). Proportions matter more than
  // the pose here: a ~92-unit figure with a 34-unit torso, 60 units of leg below
  // the hip and a head that touches the shoulder. The first pass used 20 units
  // of leg and left a gap between head and neck, which is why the figures read
  // as spiders rather than people.
  // x grows along the direction of travel; y grows downward.
  var P = function (dx, dy) { return [hx + dx * f * u, hy + dy * u]; };
  var sh   = P(8,  -34);                    // shoulder (torso pitched forward)
  var head = P(14, -48);                    // head centre, r 10 -> meets the neck
  var lk   = P(22,  10), lf = P(34, 26);    // lead leg  — knee up, foot tucked
  var tk   = P(-16, 18), tf = P(-34, 34);   // trail leg — thrown back
  var le   = P(26, -26), lh = P(40, -34);   // lead arm  — reaching ahead
  var te   = P(-14,-22), th = P(-26,-14);   // trail arm — loaded behind

  var hr = 11 * u;                                   // head radius
  // Point on the head's edge facing the shoulder — where the neck should end.
  var ndx = head[0] - sh[0], ndy = head[1] - sh[1];
  var nlen = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
  var neck = [head[0] - (ndx / nlen) * hr, head[1] - (ndy / nlen) * hr];

  ctx.save();
  ctx.globalAlpha = (o.alpha === undefined) ? 1 : o.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  function body() {
    ctx.beginPath();
    ctx.moveTo(hx, hy);        ctx.lineTo(sh[0], sh[1]);                       // torso
    // Neck stops ON THE HEAD'S CIRCUMFERENCE. Running it to the head's centre
    // draws the line straight across the face, and because the body is stroked
    // after the head is filled, that line sits on top of it.
    ctx.moveTo(sh[0], sh[1]);  ctx.lineTo(neck[0], neck[1]);                   // neck
    ctx.moveTo(hx, hy);        ctx.lineTo(lk[0], lk[1]); ctx.lineTo(lf[0], lf[1]);
    ctx.moveTo(hx, hy);        ctx.lineTo(tk[0], tk[1]); ctx.lineTo(tf[0], tf[1]);
    ctx.moveTo(sh[0], sh[1]);  ctx.lineTo(le[0], le[1]); ctx.lineTo(lh[0], lh[1]);
    ctx.moveTo(sh[0], sh[1]);  ctx.lineTo(te[0], te[1]); ctx.lineTo(th[0], th[1]);
  }

  // Weapon, held in the trailing hand and swept back.
  function weapon() {
    if (!o.weapon) return;
    ctx.beginPath();
    if (o.weapon === 'sword') {
      var tip = P(-64, -40);
      ctx.moveTo(th[0], th[1]); ctx.lineTo(tip[0], tip[1]);
      var g1 = P(-30, -26), g2 = P(-38, -12);
      ctx.moveTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]);            // crossguard
    } else if (o.weapon === 'axe') {
      var ah = P(-56, -38);
      ctx.moveTo(th[0], th[1]); ctx.lineTo(ah[0], ah[1]);
      var b1 = P(-48, -50), b2 = P(-62, -30);
      ctx.moveTo(b1[0], b1[1]); ctx.lineTo(ah[0], ah[1]); ctx.lineTo(b2[0], b2[1]);
    } else if (o.weapon === 'spear') {
      var s1 = P(-70, -44), s2 = P(16, -4);
      ctx.moveTo(s2[0], s2[1]); ctx.lineTo(s1[0], s1[1]);
    }
  }

  // Outline underlay, then the near-black body over it — the silhouette reads
  // against both the dark sky and the rift's glare this way.
  body();   ctx.strokeStyle = RIM;  ctx.lineWidth = 5.4 * u; ctx.stroke();
  weapon(); ctx.strokeStyle = RIM;  ctx.lineWidth = 4.0 * u; ctx.stroke();
  body();   ctx.strokeStyle = DARK; ctx.lineWidth = 4.2 * u; ctx.stroke();
  weapon(); ctx.strokeStyle = DARK; ctx.lineWidth = 2.8 * u; ctx.stroke();

  // Head LAST, opaque, so it covers the neck join cleanly whatever the pose.
  ctx.beginPath(); ctx.arc(head[0], head[1], hr, 0, Math.PI * 2);
  ctx.fillStyle = DARK; ctx.fill();
  ctx.lineWidth = 1.6 * u; ctx.strokeStyle = RIM; ctx.stroke();

  // Hunters get an eye glint instead of a scarf — one red pinpoint each.
  if (o.eye) {
    ctx.beginPath();
    ctx.arc(head[0] + 3 * f * u, head[1] - 1 * u, 1.7 * u, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3b30';
    ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = 7 * u;
    ctx.fill(); ctx.shadowBlur = 0;
  }

  // Kael's scarf, streaming back along the dash.
  if (o.scarf) {
    var w1 = Math.sin(t * 2.2)       * 5 * u;
    var w2 = Math.sin(t * 2.2 + 1.2) * 9 * u;
    var nk = P(6, -38);
    var tipX = hx - 86 * f * u, tipY = hy - 34 * u + w2;
    var g = ctx.createLinearGradient(nk[0], nk[1], tipX, tipY);
    g.addColorStop(0,    'rgba(255,58,58,0.98)');
    g.addColorStop(0.55, 'rgba(222,30,30,0.72)');
    g.addColorStop(1,    'rgba(150,20,20,0)');
    ctx.beginPath();
    ctx.moveTo(nk[0], nk[1]);
    ctx.bezierCurveTo(
      hx - 28 * f * u,      hy - 34 * u + w1,
      hx - 58 * f * u,      hy - 40 * u + w2,
      tipX, tipY
    );
    ctx.strokeStyle = g; ctx.lineWidth = 3.8 * u;
    ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 9 * u;
    ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function _homeDrawHeroScene(ctx, W, H, t) {
  var u  = Math.min(W, H) / 900;       // 1 at a 900px-tall window
  var bandY = H * 0.24;                // the action's eye line

  var riftX = W * 0.17, riftY = bandY + 8 * u, riftH = H * 0.30;
  var heroX = W * 0.36, heroY = bandY + 26 * u;
  var hu    = 1.75 * u;                // hero unit — biggest figure on screen

  // Stage wash — the game canvas underneath draws a bright fracture burst around
  // the centre, which cut straight through the figures. This sits behind them.
  var stage = ctx.createLinearGradient(0, bandY - H * 0.20, 0, bandY + H * 0.20);
  stage.addColorStop(0,   'rgba(5,4,14,0)');
  stage.addColorStop(0.5, 'rgba(5,4,14,0.55)');
  stage.addColorStop(1,   'rgba(5,4,14,0)');
  ctx.fillStyle = stage;
  ctx.fillRect(0, bandY - H * 0.20, W, H * 0.40);

  _homeRift(ctx, riftX, riftY, riftH, u, t);

  // Speed streaks pulled out of the rift along Kael's line of travel.
  ctx.save();
  for (var i = 0; i < 9; i++) {
    var ph  = (t * 0.55 + i * 0.111) % 1;
    var sx  = riftX + (heroX - riftX) * ph * 1.05;
    var sy  = riftY - 34 * u + i * 9 * u + Math.sin(i * 2.1) * 6 * u;
    var len = (42 + (i % 3) * 30) * u;
    var a   = 0.30 * Math.sin(Math.PI * ph);
    var lg  = ctx.createLinearGradient(sx - len, sy, sx, sy);
    lg.addColorStop(0, 'rgba(190,140,255,0)');
    lg.addColorStop(1, 'rgba(210,170,255,' + a.toFixed(3) + ')');
    ctx.strokeStyle = lg; ctx.lineWidth = 1.6 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx - len, sy); ctx.lineTo(sx, sy); ctx.stroke();
  }
  ctx.restore();

  // Afterimages: Kael's dash, trailing back toward the tear he came out of.
  for (var k = 3; k >= 1; k--) {
    _homeStickman(ctx, heroX - k * 34 * u, heroY + k * 5 * u, {
      u: hu, face: 1, t: t, weapon: 'sword', alpha: 0.10 * (4 - k) * 0.5,
      dark: 'rgba(120,70,200,0.55)', rim: 'rgba(190,150,255,0.30)'
    });
  }

  // Kael himself — a slow hover so the held pose still breathes.
  var bob = Math.sin(t * 1.15) * 4 * u;
  _homeStickman(ctx, heroX, heroY + bob, {
    u: hu, face: 1, t: t, weapon: 'sword', scarf: true
  });

  // Where the two sides are about to meet — a charged seam, not a flash. It
  // gives the frame a centre of gravity between hero and hunters.
  var clashX = W * 0.52, clashY = bandY + 10 * u;
  var puls   = 0.5 + Math.sin(t * 1.7) * 0.5;
  var cg = ctx.createRadialGradient(clashX, clashY, 0, clashX, clashY, 150 * u);
  cg.addColorStop(0,   'rgba(255,120,60,' + (0.16 + puls * 0.10).toFixed(3) + ')');
  cg.addColorStop(0.5, 'rgba(180,60,120,0.05)');
  cg.addColorStop(1,   'rgba(120,40,160,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.ellipse(clashX, clashY, 150 * u, 88 * u, 0, 0, Math.PI * 2); ctx.fill();

  // The hunters closing from the right: four figures at different depths, each
  // drifting in and easing back on its own cycle so the line never marches in
  // lockstep. Smaller and dimmer with distance.
  var foes = [
    { x: 0.64, y: -0.050, s: 1.55, w: 'axe',   sp: 0.85, ph: 0.0 },
    { x: 0.755, y: 0.055, s: 1.25, w: 'sword', sp: 1.05, ph: 1.7 },
    { x: 0.855, y:-0.015, s: 1.00, w: 'spear', sp: 0.75, ph: 3.1 },
    { x: 0.945, y: 0.080, s: 0.78, w: 'sword', sp: 0.95, ph: 4.4 }
  ];
  for (var n = 0; n < foes.length; n++) {
    var fo = foes[n];
    var drift = Math.sin(t * fo.sp + fo.ph) * 11 * u;
    var fade  = Math.min(1, 0.46 + fo.s * 0.40);
    _homeStickman(ctx, W * fo.x - drift, bandY + H * fo.y + Math.sin(t * fo.sp * 1.3 + fo.ph) * 4 * u, {
      u: u * fo.s, face: -1, t: t, weapon: fo.w, eye: true, alpha: fade,
      dark: '#04020a', rim: 'rgba(255,72,58,0.72)'
    });
  }
}

function _initHomeCanvas() {
  var canvas = document.getElementById('homeCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  if (!canvas._smbResizeBound) {
    window.addEventListener('resize', resize);
    canvas._smbResizeBound = true;
  }

  if (_homeCanvasRAF) cancelAnimationFrame(_homeCanvasRAF);
  if (!_homeCanvasT0) _homeCanvasT0 = performance.now();

  function frame() {
    if (typeof gameRunning !== 'undefined' && gameRunning) {
      _homeCanvasRAF = requestAnimationFrame(frame);
      return;
    }
    var W = canvas.width  || window.innerWidth;
    var H = canvas.height || window.innerHeight;
    var t = (performance.now() - _homeCanvasT0) / 1000;

    // Transparent — city skyline from game canvas shows through underneath
    ctx.clearRect(0, 0, W, H);

    // Subtle dark vignette over center column so text stays readable
    var cvig = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.05, W / 2, H * 0.42, H * 0.45);
    cvig.addColorStop(0, 'rgba(4,4,11,0.55)');
    cvig.addColorStop(1, 'rgba(4,4,11,0)');
    ctx.fillStyle = cvig;
    ctx.fillRect(0, 0, W, H);

    // The story beat: Kael through the rift, hunters closing in.
    // (_homeDrawKael below is the previous standing portrait — kept, unused,
    // so the old composition can be restored without rewriting it.)
    _homeDrawHeroScene(ctx, W, H, t);

    // Lower-half scrim, drawn LAST so it sits over the art rather than under
    // it — the hub cards start around 0.38H and their text has to stay legible
    // whatever the scene and the game canvas are doing behind them.
    var scrim = ctx.createLinearGradient(0, H * 0.30, 0, H * 0.62);
    scrim.addColorStop(0, 'rgba(4,4,11,0)');
    scrim.addColorStop(1, 'rgba(4,4,11,0.72)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, H * 0.30, W, H * 0.70);

    _homeCanvasRAF = requestAnimationFrame(frame);
  }
  _homeCanvasRAF = requestAnimationFrame(frame);
}

function _stopHomeCanvas() {
  if (_homeCanvasRAF) { cancelAnimationFrame(_homeCanvasRAF); _homeCanvasRAF = null; }
  var canvas = document.getElementById('homeCanvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener('load', function() {
  _homeCanvasT0 = performance.now();
  _initHomeCanvas();
  var menuEl = document.getElementById('menu');
  if (menuEl && window.MutationObserver) {
    new MutationObserver(function() {
      if (menuEl.style.display !== 'none') {
        if (!_homeCanvasRAF) _initHomeCanvas();
      } else {
        _stopHomeCanvas();
      }
    }).observe(menuEl, { attributes: true, attributeFilter: ['style'] });
  }
});
