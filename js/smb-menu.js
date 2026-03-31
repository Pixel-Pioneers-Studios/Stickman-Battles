'use strict';

// ============================================================
// MENU UI HANDLERS
// ============================================================
function selectMode(mode) {
  // 'bot' is no longer a separate mode — merge into '2p' with bot toggles
  if (mode === 'bot') mode = '2p';
  if (mode === 'completerandom') {
    mode = '2p';
    completeRandomizer = true;
  }
  // 'story' opens the story modal instead of changing menu layout
  if (mode === 'story') {
    if (typeof openStoryMenu === 'function') openStoryMenu();
    return;
  }
  // 'storyonline' — story online mode (unlocked on story completion)
  if (mode === 'storyonline') {
    // Story Online: behaves like online mode but marks storyonline context
    mode = 'online';
    const soCard = document.getElementById('modeStoryOnline');
    if (soCard) soCard.classList.add('active');
  }
  gameMode = mode;
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
  const modeCard = document.querySelector(`[data-mode="${mode}"]`);
  if (modeCard) modeCard.classList.add('active');
  const isBoss       = mode === 'boss';
  // When connected online, only 2p is supported — redirect all other modes back to online
  if (NetworkManager.connected && mode !== 'online' && mode !== '2p') {
    mode = 'online';
  }
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
    crBtn.textContent = `🎲 Complete Random: ${isCompleteRandom ? 'ON' : 'OFF'}`;
    crBtn.classList.toggle('active', isCompleteRandom);
  }
  // Show/hide online connection panel
  const onlinePanel = document.getElementById('onlinePanel');
  if (onlinePanel) onlinePanel.style.display = isOnline ? 'flex' : 'none';
  if (isOnline && typeof refreshPublicRooms === 'function') refreshPublicRooms();
  // Show/hide minigame selection panel
  const mgPanel = document.getElementById('minigamePanel');
  if (mgPanel) mgPanel.style.display = isMinigames ? 'block' : 'none';
  // P2 panel title/hint
  document.getElementById('p2Title').textContent = isTrueForm ? 'TRUE FORM' : isAdaptive ? 'NEURAL AI' : (isBoss && !isBoss2p) ? 'CREATOR' : (isBoss2p ? 'Player 2' : (isTraining ? 'TRAINING' : (p2IsBot ? 'BOT' : 'Player 2')));
  const _p2Hint = document.getElementById('p2Hint');
  if (_p2Hint) _p2Hint.textContent = isTrueForm ? 'Secret Final Boss' : isAdaptive ? 'Learns your playstyle' : (isBoss && !isBoss2p) ? 'Boss — AI Controlled' : (isBoss2p ? '← → ↑ · Enter · . · /' : (isTraining ? 'Practice mode' : (p2IsBot ? 'AI Controlled' : '← → ↑ · Enter · . · / · ↓')));
  document.getElementById('p1DifficultyRow').style.display = p1IsBot ? 'flex' : 'none';
  document.getElementById('p2DifficultyRow').style.display = p2IsBot ? 'flex' : 'none';
  // Hide P2 config rows in boss 1P, training, trueform, adaptive
  const hideP2 = (isBoss && !isBoss2p) || isTraining || isTrueForm || isAdaptive;
  document.getElementById('p2ColorRow').style.display     = hideP2 ? 'none' : 'flex';
  document.getElementById('p2WeaponRow').style.display    = hideP2 ? 'none' : 'flex';
  document.getElementById('p2ClassRow').style.display     = hideP2 ? 'none' : 'flex';
  const p1BotToggle = document.getElementById('p1BotToggle');
  if (p1BotToggle) p1BotToggle.style.display = (isMinigames || isTrueForm || isAdaptive) ? 'none' : '';
  const p2BotToggleEl = document.getElementById('p2BotToggle');
  if (p2BotToggleEl) p2BotToggleEl.style.display = (isBoss2p) ? '' : (isBoss || isTrueForm || isAdaptive) ? 'none' : '';
  const trainingPanel = document.getElementById('trainingPanel');
  if (trainingPanel) trainingPanel.style.display = isTraining ? 'block' : 'none';
  // Boss/training/minigames/trueform/online/adaptive: hide ∞ infinite; adaptive still shows arena picker
  document.getElementById('arenaSection').style.display   = (isBoss || isTraining || isMinigames || isTrueForm || isOnline || isCompleteRandom) ? 'none' : '';
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
      if (btn) { btn.textContent = '⚡ Chaos Mode: OFF'; btn.style.borderColor = 'rgba(160,60,255,0.4)'; btn.style.color = '#cc88ff'; btn.style.boxShadow = ''; }
    }
  }
  // Custom weapons only allowed in 1v1 and training — hide options in other modes
  const _allowCustomWeapons = mode === '2p' || mode === 'training';
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
};
let p1Skin = 'default', p2Skin = 'default';

function setSkin(pid, skin, btn) {
  if (pid === 'p1') p1Skin = skin;
  else              p2Skin = skin;
  // Update active state on buttons for this player
  document.querySelectorAll(`.skin-swatch[data-pid="${pid}"]`).forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function setBossPlayers(n) {
  bossPlayerCount = n;
  document.getElementById('bpBtn1').classList.toggle('active', n === 1);
  document.getElementById('bpBtn2').classList.toggle('active', n === 2);
  selectMode('boss'); // refresh UI
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
// WEAPON / CLASS DESCRIPTION PANEL
// ============================================================
function showDesc(pid, type, value) {
  const panel = document.getElementById(pid + 'Desc');
  const titleEl = document.getElementById(pid + 'DescTitle');
  const bodyEl  = document.getElementById(pid + 'DescBody');
  if (!panel || !titleEl || !bodyEl) return;
  const desc = type === 'weapon' ? WEAPON_DESCS[value] : CLASS_DESCS[value];
  if (!desc) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  titleEl.textContent = desc.title;
  bodyEl.innerHTML = [
    `<span style="color:#ccc">${desc.what}</span>`,
    desc.ability ? `<br><span style="color:#88ccff">${desc.ability}</span>` : '',
    desc.super   ? `<br><span style="color:#ffaa44">${desc.super}</span>`   : '',
    desc.perk    ? `<br><span style="color:#aaffaa">★ ${desc.perk}</span>`  : '',
    `<br><span style="color:#aaa; font-style:italic">Tip: ${desc.how}</span>`,
  ].join('');
}

// Bidirectional class/weapon locking removed.
// Rules: weapon selection never forces a class; class selection suggests a weapon only on first pick.
const WEAPON_CLASS_LOCK = {}; // kept as empty stub — logic below no longer uses it

// Called when the CLASS selector changes.
function updateClassWeapon(pid) {
  const classEl  = document.getElementById(pid + 'Class');
  const weaponEl = document.getElementById(pid + 'Weapon');
  if (!classEl || !weaponEl) return;

  // Always unlock both selectors
  classEl.disabled  = false;
  classEl.title     = '';
  weaponEl.disabled = false;

  // Class suggests a default weapon ONLY if user has not manually picked one yet
  const cls = CLASSES[classEl.value];
  if (cls && cls.weapon && !weaponEl.dataset.userPicked) {
    weaponEl.value = cls.weapon;
  }

  showDesc(pid, 'class', classEl.value);
}

// Called when the WEAPON selector changes — marks user intent so class can no longer override it.
function onWeaponChange(pid) {
  const weaponEl = document.getElementById(pid + 'Weapon');
  if (weaponEl) weaponEl.dataset.userPicked = 'true';
  updateClassWeapon(pid);
}

function classSel_wasLocked(el, val) { /* no-op — bidirectional locking removed */ }

const _ARENA_GIMMICKS = {
  grass:      '',
  city:       '🚗 Cars race across the rooftop floor',
  space:      '🌌 Low gravity — big air time',
  lava:       '🔥 Heavy gravity · lava floor burns',
  forest:     '🐾 A forest beast roams · passive healing',
  ice:        '❄️ Icy friction · a yeti stalks the tundra',
  ruins:      '📦 Artifact pickups scattered around',
  cave:       '🦇 Stalactites fall from the ceiling',
  volcano:    '🌋 Lava geysers erupt from the floor · heavy gravity',
  underwater: '🌊 Slow movement · water currents shift',
  colosseum:  '⚔️ Stone pillars · crowd cheers on big hits',
  clouds:     '☁️ Low gravity · cloud platforms slowly shrink',
  mushroom:   '🍄 Bouncy platforms launch you skyward',
  haunted:    '👻 Ghosts drift across and deal damage',
  cyberpunk:  '⚡ Electric floor hazard periodically zaps',
  neonGrid:   '💾 Speed boost pads on the floor',
  mirror:     '🪞 Platforms drift and reality warps',
  random:     '🎲 A random arena is chosen each match',
};

function selectArena(name) {
  selectedArena = name;
  const sel = document.getElementById('arenaSelect');
  if (sel) sel.value = name;
  const hint = document.getElementById('arenaGimmickHint');
  if (hint) hint.textContent = _ARENA_GIMMICKS[name] || '';
}

// Called between random-mode fights: fades to black, switches arena + rerolls weapons/classes, fades back
function switchArenaWithTransition(newArenaKey, callback) {
  const fade = document.getElementById('fadeOverlay');
  if (fade) { fade.style.transition = 'opacity 0.28s'; fade.style.opacity = '1'; }
  setTimeout(() => {
    if (!gameRunning) { // guard: game may have ended between outer and inner timeouts
      if (fade) { fade.style.transition = 'opacity 0.38s'; fade.style.opacity = '0'; }
      return;
    }
    if (typeof switchArena === 'function') switchArena(newArenaKey);
    // Reroll weapons + classes for each non-boss player:
    //   - always when completeRandomizer is active
    //   - otherwise only when the dropdown is set to 'random'
    players.forEach(p => {
      if (p.isBoss) return;
      const isP1 = p === players[0];
      const wSel = isP1 ? 'p1Weapon' : 'p2Weapon';
      const cSel = isP1 ? 'p1Class'  : 'p2Class';
      const wVal = document.getElementById(wSel)?.value;
      const cVal = document.getElementById(cSel)?.value;
      if (!completeRandomizer && wVal !== 'random' && cVal !== 'random') return;
      const resolved = completeRandomizer
        ? resolveWeaponAndClassValues('random', 'random')
        : resolveWeaponAndClass(wSel, cSel);
      if (resolved.weaponKey && typeof WEAPONS !== 'undefined' && WEAPONS[resolved.weaponKey]) {
        p.weaponKey = resolved.weaponKey;
        p.weapon    = WEAPONS[resolved.weaponKey];
        p._ammo     = p.weapon.clipSize || 0;
        p._reloadTimer = 0;
      }
      if (typeof applyClass === 'function') applyClass(p, resolved.classKey);
    });
    if (typeof callback === 'function') callback();
    setTimeout(() => {
      if (fade) { fade.style.transition = 'opacity 0.38s'; fade.style.opacity = '0'; }
    }, 80);
  }, 300);
}

function switchArena(newKey) {
  if (!gameRunning) return;
  const OFFMAP = ['creator', 'void', 'soccer'];
  if (OFFMAP.includes(newKey) || ARENAS[newKey]?.isStoryOnly || ARENAS[newKey]?.isExploreArena) return;
  currentArenaKey = newKey;
  if (currentArenaKey !== 'lava') randomizeArenaLayout(currentArenaKey);
  currentArena = ARENAS[currentArenaKey];
  initMapPerks(currentArenaKey);
  generateBgElements();
  // Clear arena-specific NPCs and items — they belong to their home arena
  if (typeof forestBeast !== 'undefined') { forestBeast = null; forestBeastCooldown = 600; }
  if (typeof yeti        !== 'undefined') { yeti        = null; yetiCooldown        = 600; }
  if (typeof mapItems    !== 'undefined') mapItems = [];
  // Assign safe spawn positions for ALL players on the new map.
  // Alive players are repositioned immediately.
  // Dead players only get spawnX/spawnY updated so their pending respawn()
  // call lands on the correct map instead of stale coordinates from the old arena.
  const _sides = ['left', 'right', 'any'];
  let lastX;
  players.forEach((p, i) => {
    if (p.isBoss) return;
    const sp = pickSafeSpawn(_sides[i] || 'any', lastX) || { x: [160, 720, 450][i] || 300, y: 200 };
    // Always update the cached spawn coordinates for the new arena
    p.spawnX = sp.x;
    p.spawnY = sp.y;
    if (p.health > 0) {
      // Only physically move alive players
      p.x = sp.x; p.y = sp.y - p.h;
      p.vx = 0; p.vy = 0;
      p.invincible = Math.max(p.invincible, 90);
    }
    lastX = sp.x;
  });
  trainingDummies.forEach(d => { d.x = 640; d.y = 200; d.vx = 0; d.vy = 0; });
}

function selectLives(n) {
  if (bossFightLivesLock) {
    chosenLives = BOSS_FIGHT_LIVES;
    const sel = document.getElementById('livesSelect');
    if (sel) sel.value = String(BOSS_FIGHT_LIVES);
    return;
  }
  infiniteMode = (n === 0);
  chosenLives  = infiniteMode ? 3 : n;
  const sel = document.getElementById('livesSelect');
  if (sel) sel.value = String(n);
}

function _setBossFightLivesLock(active) {
  const enable = !!active;
  if (enable) {
    if (!bossFightLivesLock) bossFightLivesPrev = chosenLives;
    bossFightLivesLock = true;
    infiniteMode = false;
    chosenLives = BOSS_FIGHT_LIVES;
    const sel = document.getElementById('livesSelect');
    if (sel) sel.value = String(BOSS_FIGHT_LIVES);
    return;
  }
  if (!bossFightLivesLock) return;
  bossFightLivesLock = false;
  infiniteMode = false;
  chosenLives = bossFightLivesPrev != null ? bossFightLivesPrev : 3;
  bossFightLivesPrev = null;
  const sel = document.getElementById('livesSelect');
  if (sel) sel.value = String(chosenLives);
}

function _applyBossFightLivesLockToPlayers() {
  if (!bossFightLivesLock || !Array.isArray(players)) return;
  for (const p of players) {
    if (!p || p.isBoss || p.isDummy) continue;
    p.lives = BOSS_FIGHT_LIVES;
    p._maxLives = BOSS_FIGHT_LIVES;
  }
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function toggleCard(id) {
  const card  = document.getElementById(id);
  const arrow = card.querySelector('.expand-arrow');
  card.classList.toggle('expanded');
  if (arrow) arrow.textContent = card.classList.contains('expanded') ? '▾' : '▸';
}

function updateSettings() {
  settings.particles   = document.getElementById('settingParticles').checked;
  settings.screenShake = document.getElementById('settingShake').checked;
  settings.dmgNumbers  = document.getElementById('settingDmgNums').checked;
  settings.landingDust = document.getElementById('settingLandDust').checked;
  const bossAuraEl   = document.getElementById('settingBossAura');
  const botPortalEl  = document.getElementById('settingBotPortal');
  const phaseFlashEl = document.getElementById('settingPhaseFlash');
  if (bossAuraEl)   settings.bossAura   = bossAuraEl.checked;
  if (botPortalEl)  settings.botPortal  = botPortalEl.checked;
  if (phaseFlashEl) settings.phaseFlash = phaseFlashEl.checked;
  const finishersEl = document.getElementById('settingFinishers');
  if (finishersEl) settings.finishers = finishersEl.checked;
  const view3DEl = document.getElementById('setting3DView');
  if (view3DEl) {
    settings.view3D = view3DEl.checked;
    localStorage.setItem('smc_view3D', settings.view3D ? '1' : '0');
    // Only apply persistent 3D when not in a TF-driven dimension shift
    if (!tfDimensionIs3D && typeof set3DView === 'function') {
      set3DView(settings.view3D ? 'settings' : false);
    }
  }
  const exp3DEl = document.getElementById('settingExp3D');
  if (exp3DEl) {
    settings.experimental3D = exp3DEl.checked;
    localStorage.setItem('smc_experimental3D', settings.experimental3D ? '1' : '0');
  }
}

function toggleAdvanced() {
  const panel = document.getElementById('advancedPanel');
  if (panel) panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

// ── Changelog ─────────────────────────────────────────────────────────────────
const _CLG_CAT_COLORS = {
  Story:     '#88ccff',
  Cinematic: '#cc88ff',
  AI:        '#ff9966',
  Combat:    '#ff6688',
  UI:        '#88ffcc',
  Network:   '#ffcc66',
  System:    '#aaaacc',
};

function showChangelogModal() {
  const modal   = document.getElementById('changelogModal');
  const content = document.getElementById('changelogContent');
  const verHead = document.getElementById('changelogVersionHeader');
  if (!modal || !content) return;

  if (verHead) verHead.textContent = 'v' + GAME_VERSION;

  let html = '';
  const _clgProgress = (typeof playerProgressLevel !== 'undefined') ? playerProgressLevel : 0;
  for (const entry of CHANGELOG) {
    const isLatest = entry.isLatest;
    const entryRequired = entry.requiredProgress || 0;
    const isRedacted = _clgProgress < entryRequired;
    html += `
      <div style="margin-bottom:28px;border:1px solid rgba(${isLatest?'80,120,255':'40,60,120'},0.35);border-radius:10px;overflow:hidden;${isRedacted?'opacity:0.55;':''}">
        <!-- Header row -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(${isLatest?'30,50,120':'15,20,50'},0.55);cursor:pointer;"
             onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'':'none'">
          <div style="display:flex;align-items:center;gap:10px;">
            ${isLatest ? '<span style="background:linear-gradient(90deg,#4488ff,#8844ff);color:#fff;font-size:0.6rem;padding:2px 8px;border-radius:4px;letter-spacing:2px;font-weight:700;">NEW</span>' : ''}
            <span style="color:${isLatest?'#aaccff':'#7788aa'};font-size:1.0rem;font-weight:700;letter-spacing:1px;">v${entry.version}</span>
            <span style="color:${isLatest?'#ddeeff':'#8899bb'};font-size:0.9rem;">${isRedacted ? '??? REDACTED' : entry.title}</span>
          </div>
          <span style="color:#334466;font-size:0.72rem;letter-spacing:1px;">${entry.date} &nbsp;▾</span>
        </div>
        <!-- Body -->
        <div style="padding:12px 16px 14px;background:rgba(5,8,25,0.6);">
    `;
    if (isRedacted) {
      html += `
          <div style="font-size:0.68rem;color:#334466;letter-spacing:2px;margin-bottom:10px;font-style:italic;">"You're not supposed to see that yet."</div>
          <div style="color:#334466;font-size:0.78rem;letter-spacing:1px;font-style:italic;">[ CONTENT REDACTED — UNLOCK TO VIEW ]</div>
      `;
    } else {
      html += `
          <div style="font-size:0.68rem;color:#334466;letter-spacing:2px;margin-bottom:10px;font-style:italic;">"${entry.flavor}"</div>
          <div style="display:flex;flex-direction:column;gap:5px;">
      `;
      // Group by category
      const grouped = {};
      for (const ch of entry.changes) {
        if (!grouped[ch.cat]) grouped[ch.cat] = [];
        grouped[ch.cat].push(ch.text);
      }
      for (const [cat, items] of Object.entries(grouped)) {
        const col = _CLG_CAT_COLORS[cat] || '#aaaacc';
        html += `<div style="margin-bottom:4px;">
          <span style="font-size:0.62rem;color:${col};letter-spacing:2px;opacity:0.8;text-transform:uppercase;font-weight:700;">[${cat}]</span>
          <ul style="margin:3px 0 0 0;padding-left:18px;list-style:none;">`;
        for (const item of items) {
          html += `<li style="color:#8899bb;font-size:0.78rem;line-height:1.65;position:relative;">
            <span style="position:absolute;left:-14px;color:${col};opacity:0.6;">›</span>${item}
          </li>`;
        }
        html += `</ul></div>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
  }

  content.innerHTML = html;
  modal.style.display = 'block';
}

function closeChangelogModal() {
  const modal = document.getElementById('changelogModal');
  if (modal) modal.style.display = 'none';
}

// ── Populate version labels in menu on page load ─────────────────────────────
function _initVersionLabels() {
  const badge    = document.getElementById('homeVersionBadge');
  const settings = document.getElementById('settingsVersionLabel');
  if (badge)    badge.textContent    = 'v' + GAME_VERSION;
  if (settings) settings.textContent = 'v' + GAME_VERSION;
}

function toggleStatsLog() {
  const modal   = document.getElementById('statsLogModal');
  const content = document.getElementById('statsLogContent');
  if (!modal) return;
  if (modal.style.display === 'block') { modal.style.display = 'none'; return; }

  // Build HTML tables from game constants
  let html = '<h2 style="color:#cc00ee;margin-bottom:16px;letter-spacing:2px">STATS LOG — Stickman Battles</h2>';

  // Classes
  html += '<h3 style="color:#00d4ff;margin:12px 0 6px">Classes</h3><table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<tr style="background:rgba(0,180,255,0.15)"><th>Name</th><th>HP</th><th>Speed</th><th>Weapon</th><th>Perk</th></tr>';
  for (const [key, cls] of Object.entries(CLASSES)) {
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.08)"><td>${cls.name}</td><td>${cls.hp}</td><td>${cls.speedMult}x</td><td>${cls.weapon || '—'}</td><td>${cls.perk || '—'}</td></tr>`;
  }
  html += '</table>';

  // Weapons (all, including new)
  html += '<h3 style="color:#ffd700;margin:16px 0 6px">Weapons</h3><table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<tr style="background:rgba(255,215,0,0.12)"><th>Name</th><th>Type</th><th>Damage</th><th>Range</th><th>CD</th><th>Endlag</th><th>KB</th><th>Ability</th></tr>';
  for (const [key, w] of Object.entries(WEAPONS)) {
    if (w.enemyOnly) continue;
    const dmg = w.damageFunc ? (key === 'gun' ? '5-8' : key === 'bow' ? '12-20' : key === 'peashooter' ? '2-3' : key === 'slingshot' ? '10-14' : key === 'paperairplane' ? '8-12' : 'random') : w.damage;
    const endlagNote = w.endlag ? `${w.endlag}f (whiff: ${Math.round(w.endlag*2.4)}f)` : '—';
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.08)"><td>${w.name || key}</td><td style="color:#aaa">${w.type}</td><td>${dmg}</td><td>${w.range}px</td><td>${w.cooldown}f</td><td style="color:#ff9944">${endlagNote}</td><td>${w.kb}</td><td style="font-size:11px;color:#ccc">${w.abilityName || '—'}</td></tr>`;
  }
  html += '</table>';

  // Arenas
  html += '<h3 style="color:#aaffaa;margin:16px 0 6px">Arenas &amp; Map Gimmicks</h3><table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<tr style="background:rgba(100,255,100,0.10)"><th>Arena</th><th>Gravity</th><th>Gimmick</th><th>Platforms</th></tr>';
  const arenaGimmicks = {
    grass: 'Bouncy platforms, random bouncy platform each game',
    lava: 'Lava floor (high gravity); touching lava = instant kill',
    space: 'Low gravity (0.22); random meteor strikes from sky',
    city: 'Moving cars that deal damage; neon lighting',
    forest: 'Forest Beast NPC (1%/sec), Raged variant (1-in-10); beware aggro range',
    ice: 'Blizzard gusts push fighters; Yeti NPC (rare); icy sliding friction',
    ruins: 'Artifact pickups grant power-ups; curses inflict random debuffs',
    creator: 'Boss fight arena; moving platforms; floor hazard cycles (lava/void)',
    cave: 'Dark cave ceiling; stalactites fall as hazards',
    mirror: 'Controls inverted every 20s; your reflection fights back',
    underwater: 'Reduced gravity + horizontal drag (swimming physics)',
    volcano: 'Periodic eruptions launch lava rocks; heavy gravity',
    colosseum: 'Large 4-tier arena; crowd cheers boost super meter gain',
    cyberpunk: 'Neon boost pads; periodic EMP disables cooldowns briefly',
    haunted: 'Fog of war; ghost enemies phase through platforms',
    neonGrid: 'Speed boost pads; wall-run segments on side walls',
    mushroom: 'Bouncy mushroom platforms; poison spores slow movement',
  };
  for (const [key, ar] of Object.entries(ARENAS)) {
    const grav = ar.isLowGravity ? 'Low (0.22)' : ar.isHeavyGravity ? 'Heavy (0.85)' : 'Normal (0.55)';
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.08)"><td style="color:#aaffaa">${key}</td><td>${grav}</td><td style="font-size:11px;color:#ccc">${arenaGimmicks[key] || '—'}</td><td>${ar.platforms.length}</td></tr>`;
  }
  html += '</table>';

  // Entities
  html += '<h3 style="color:#ff9944;margin:16px 0 6px">Special Entities</h3><table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<tr style="background:rgba(255,150,50,0.12)"><th>Entity</th><th>HP</th><th>Location</th><th>Special Moves</th></tr>';
  const entities = [
    ['Forest Beast', '300 (Raged: 180)', 'Forest arena (1% chance/sec)', 'Dash charge at high speed'],
    ['Raged Beast', '180', 'Forest arena (1 in 10 beast spawns)', '+dmg, +kb, +speed, red aura'],
    ['Yeti', '450', 'Ice arena (0.5% chance/frame)', 'Roar stun, Ice spikes, Ice breath'],
    ['Boss (Creator)', '3000 (True: 4500)', 'Creator arena', 'Beams, Spikes, Floor hazards, Minions, Teleport'],
    ['True Form', '5000', 'Void arena (unlock secret letters)', 'Gravity flip, control invert, black holes, size shift, portal, floor removal'],
    ['Boss Minion', '50', 'Spawned by Boss Phase 2+', 'Hard AI, 50% damage output'],
    ['SOVEREIGN (Neural)', 'Same as hard bot', 'Adaptive AI mode (unlock via story)', 'Reads player patterns, dodge-punish, baits attacks, learns in real-time'],
    ['Dummy', '∞ (auto-heal)', 'Training mode', 'Stands still — for practice'],
  ];
  for (const [name, hp, loc, moves] of entities) {
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.08)"><td style="color:#ffaa66">${name}</td><td>${hp}</td><td style="font-size:11px;color:#aaa">${loc}</td><td style="font-size:11px;color:#ccc">${moves}</td></tr>`;
  }
  html += '</table>';

  // Boss
  html += '<h3 style="color:#cc00ee;margin:16px 0 6px">Boss Stats</h3><table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<tr style="background:rgba(200,0,238,0.12)"><th>Stat</th><th>Value</th></tr>';
  const bossStats = [
    ['Boss HP', '3000'], ['Phase 1', '> 2000 HP — basic attacks + floor hazard'],
    ['Phase 2', '1000–2000 HP — beams, minions'], ['Phase 3', '< 1000 HP — everything, faster'],
    ['KB Resist', '0.5x'], ['KB Bonus', '1.5x'],
    ['Attack CD Mult', '0.5x'], ['Beam CD P2', '560f'], ['Beam CD P3', '400f / 280f (desperation)'],
    ['Spike Damage', '20 (vy=-24)'], ['Beam Damage', '12/frame in 24px radius'], ['Floor Hazard', '15s active, 5s warning cycle'],
    ['Fake Death', 'Triggers once at 33% HP'], ['Stagger', '120+ dmg in 3s → 2.5s stun'],
    ['True Form HP', '5000'], ['TF Speed', '4.2 (1.3× normal)'], ['TF KB Resist', '0.90'],
    ['TF Phases', 'QTE at 75/50/25/10% HP; ends with full cinematic'], ['Adaptation', 'Learns player over time (5 tiers)'],
  ];
  for (const [k, v] of bossStats) {
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.08)"><td>${k}</td><td>${v}</td></tr>`;
  }
  html += '</table>';

  // Training commands
  html += '<h3 style="color:#bb88ff;margin:16px 0 6px">Training Commands</h3><table style="width:100%;border-collapse:collapse;font-size:12px">';
  html += '<tr style="background:rgba(180,120,255,0.12)"><th>Command</th><th>Effect</th></tr>';
  const cmds = [
    ['Full HP', 'Restore health to max (player or all if toggle off)'],
    ['Give Super', 'Fill super meter to 100% instantly'],
    ['No CDs', 'Toggle: all ability/attack cooldowns frozen at 0'],
    ['Spawn Dummy', 'Add a new training dummy to the arena'],
    ['Spawn Bot', 'Spawn an AI fighter targeting you'],
    ['Spawn Boss', 'Spawn a full Boss entity (can spawn multiple)'],
    ['Spawn Beast', 'Spawn a Forest Beast in the arena'],
    ['Godmode', 'Toggle: no hitbox — immune to all damage'],
    ['One Punch', 'Toggle: all attacks deal 9999 damage'],
    ['Chaos', 'Toggle: all entities attack their nearest neighbour'],
    ['Clear All', 'Remove all dummies, bots, bosses, projectiles'],
    ['Player Only', 'Toggle: commands affect only P1 or all entities'],
  ];
  for (const [cmd, effect] of cmds) {
    html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.08)"><td style="color:#cc99ff">${cmd}</td><td style="font-size:11px;color:#ccc">${effect}</td></tr>`;
  }
  html += '</table>';

  content.innerHTML = html;
  modal.style.display = 'block';
}

// Build a reverse map: weaponKey → classKey (first class that locks to that weapon)
function _buildWeaponClassMap() {
  const map = {};
  if (typeof CLASSES === 'undefined') return map;
  for (const [cKey, cDef] of Object.entries(CLASSES)) {
    if (cDef.weapon && !map[cDef.weapon]) map[cDef.weapon] = cKey;
  }
  return map;
}

// Coordinated resolver — called once per player with BOTH select IDs.
// If both are 'random':
//   50% → pick a random weapon, derive class from it (or 'none')
//   50% → pick a random class, use its locked weapon
// If only weapon is random: pick random weapon (no class influence)
// If only class is random:  pick random class (no weapon influence)
// Returns { weaponKey, classKey }
function resolveWeaponAndClass(weaponSelectId, classSelectId) {
  const wVal = document.getElementById(weaponSelectId)?.value || 'sword';
  const cVal = document.getElementById(classSelectId)?.value  || 'none';
  const _allowedCustomModes = new Set(['2p', 'training']);

  const wPool = randomWeaponPool ? [...randomWeaponPool] : WEAPON_KEYS;
  const cPool = randomClassPool  ? [...randomClassPool]  : ['none', 'thor', 'kratos', 'ninja', 'gunner', 'archer', 'paladin'];
  const wcMap = _buildWeaponClassMap(); // weapon → class

  let weaponKey, classKey;

  if (wVal === 'random' && cVal === 'random') {
    // 50/50: weapon-first vs class-first
    if (Math.random() < 0.5) {
      // ── Weapon-first: pick weapon, then derive class ─────────
      weaponKey = wPool.length ? wPool[Math.floor(Math.random() * wPool.length)] : 'sword';
      classKey  = wcMap[weaponKey] || 'none';  // use matching class or No Class
    } else {
      // ── Class-first: pick class, then use its weapon ─────────
      const eligibleClasses = cPool.filter(c => c !== 'none');
      if (eligibleClasses.length === 0) {
        // fallback: pure weapon random
        weaponKey = wPool.length ? wPool[Math.floor(Math.random() * wPool.length)] : 'sword';
        classKey  = 'none';
      } else {
        classKey  = eligibleClasses[Math.floor(Math.random() * eligibleClasses.length)];
        const lockedWeapon = (typeof CLASSES !== 'undefined' && CLASSES[classKey]?.weapon) || null;
        weaponKey = lockedWeapon || (wPool.length ? wPool[Math.floor(Math.random() * wPool.length)] : 'sword');
      }
    }
  } else if (wVal === 'random') {
    // Only weapon is random — class stays as selected
    weaponKey = wPool.length ? wPool[Math.floor(Math.random() * wPool.length)] : 'sword';
    classKey  = cVal;
  } else if (cVal === 'random') {
    // Only class is random — weapon stays as selected
    weaponKey = wVal;
    classKey  = cPool.length ? cPool[Math.floor(Math.random() * cPool.length)] : 'none';
  } else {
    weaponKey = wVal;
    classKey  = cVal;
  }

  // Custom weapon guard
  if (weaponKey && weaponKey.startsWith('_custom_') && !_allowedCustomModes.has(gameMode)) {
    weaponKey = 'sword';
  }

  return { weaponKey, classKey };
}

// Resolve weapon+class from raw values (not element IDs) — used by completeRandomizer
function resolveWeaponAndClassValues(wVal, cVal) {
  const wPool = randomWeaponPool ? [...randomWeaponPool] : WEAPON_KEYS;
  const cPool = randomClassPool  ? [...randomClassPool]  : ['none', 'thor', 'kratos', 'ninja', 'gunner', 'archer', 'paladin'];
  const wcMap = _buildWeaponClassMap();
  let weaponKey, classKey;
  if (wVal === 'random' && cVal === 'random') {
    if (Math.random() < 0.5) {
      weaponKey = wPool[Math.floor(Math.random() * wPool.length)] || 'sword';
      classKey  = wcMap[weaponKey] || 'none';
    } else {
      const eligible = cPool.filter(c => c !== 'none');
      if (!eligible.length) { weaponKey = wPool[Math.floor(Math.random() * wPool.length)] || 'sword'; classKey = 'none'; }
      else {
        classKey  = eligible[Math.floor(Math.random() * eligible.length)];
        const locked = (typeof CLASSES !== 'undefined' && CLASSES[classKey]?.weapon) || null;
        weaponKey = locked || (wPool[Math.floor(Math.random() * wPool.length)] || 'sword');
      }
    }
  } else if (wVal === 'random') {
    weaponKey = wPool[Math.floor(Math.random() * wPool.length)] || 'sword';
    classKey  = cVal;
  } else if (cVal === 'random') {
    weaponKey = wVal;
    classKey  = cPool[Math.floor(Math.random() * cPool.length)] || 'none';
  } else {
    weaponKey = wVal; classKey = cVal;
  }
  return { weaponKey, classKey };
}

// Legacy single-value helpers (used by code paths that resolve independently)
function getWeaponChoice(id) {
  const v = document.getElementById(id)?.value || 'sword';
  if (v !== 'random') {
    const _allowedCustomModes = new Set(['2p', 'training']);
    if (v.startsWith('_custom_') && !_allowedCustomModes.has(gameMode)) return 'sword';
    return v;
  }
  return getWeaponChoiceFromPool();
}

function getClassChoice(id) {
  const v = document.getElementById(id)?.value || 'none';
  if (v !== 'random') return v;
  const pool = randomClassPool ? [...randomClassPool] : ['none', 'thor', 'kratos', 'ninja', 'gunner', 'archer', 'paladin'];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : 'none';
}

function getWeaponChoiceFromPool() {
  const pool = randomWeaponPool ? [...randomWeaponPool] : WEAPON_KEYS;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : (WEAPON_KEYS[0] || 'sword');
}

function toggleRandomPool(type, key) {
  if (type === 'weapon') {
    if (!randomWeaponPool) randomWeaponPool = new Set(WEAPON_KEYS);
    if (randomWeaponPool.has(key)) randomWeaponPool.delete(key);
    else randomWeaponPool.add(key);
    // Keep at least 1 weapon
    if (randomWeaponPool.size === 0) randomWeaponPool.add(key);
  } else if (type === 'class') {
    if (!randomClassPool) randomClassPool = new Set(['none', 'thor', 'kratos', 'ninja', 'gunner']);
    if (randomClassPool.has(key)) randomClassPool.delete(key);
    else randomClassPool.add(key);
    if (randomClassPool.size === 0) randomClassPool.add(key);
  }
  // Update button label
  const btn = document.getElementById(`randBtn_${type}_${key}`);
  if (btn) {
    const inPool = type === 'weapon'
      ? (!randomWeaponPool || randomWeaponPool.has(key))
      : (!randomClassPool  || randomClassPool.has(key));
    btn.textContent  = inPool ? '\u2713 In Random Pool' : '\u2717 Excluded';
    btn.style.background = inPool ? 'rgba(0,200,100,0.25)' : 'rgba(200,50,50,0.25)';
  }
}

// ============================================================
// START GAME
// ============================================================
// Returns mode-specific loading screen info: { title, subtitle, image }
function _getLoadingInfo() {
  const mgNames = { survival: 'SURVIVAL', koth: 'KING OF THE HILL', chaos: 'CHAOS MATCH', soccer: 'SOCCER' };
  switch (gameMode) {
    case 'boss':
      return { title: 'BOSS FIGHT',  subtitle: 'FACE THE CREATOR',    image: 'images/Boss-Page.png' };
    case 'trueform':
      return { title: 'TRUE FORM',   subtitle: 'BEYOND YOUR LIMITS',  image: 'images/True-Form.png' };
    case 'story':
      return { title: 'STORY MODE',  subtitle: 'YOUR JOURNEY BEGINS', image: 'images/Boss-Page.png' };
    case 'minigames':
      return { title: mgNames[minigameType] || 'MINIGAME', subtitle: 'GET READY', image: 'images/Game-Page.png' };
    case 'training':
      return { title: 'TRAINING',    subtitle: 'SHARPEN YOUR SKILLS', image: 'images/Game-Page.png' };
    default:
      return { title: 'BATTLE',      subtitle: 'STICKMAN BATTLES',    image: 'images/Game-Page.png' };
  }
}

function startGame() {
  // Story mode: reset per-fight event state when launching from story
  if (storyModeActive && typeof _onStoryFightStart === 'function') _onStoryFightStart();
  const fadeOv = document.getElementById('fadeOverlay');
  const loadOv = document.getElementById('loadOverlay');

  // Show loading overlay immediately (no dependency on fadeOv)
  if (loadOv) {
    const info    = _getLoadingInfo();
    const titleEl = document.getElementById('loadModeTitle');
    const subEl   = document.getElementById('loadModeSub');
    const imgEl   = document.getElementById('loadModeImg');
    if (titleEl) titleEl.textContent = info.title;
    if (subEl)   subEl.textContent   = info.subtitle;
    if (imgEl) {
      imgEl.src = info.image;
    }
    loadOv.style.display = 'flex';
    const bar = document.getElementById('loadBar');
    if (bar) { bar.style.width = '0%'; requestAnimationFrame(() => { bar.style.transition = 'width 0.75s ease'; bar.style.width = '100%'; }); }
  }
  if (fadeOv) fadeOv.style.opacity = '1';
  gameLoading = true; // freeze input/physics until game is fully started

  // Hold the loading screen for 800ms so the player can see it
  setTimeout(() => {
    _startGameCore();
    if (loadOv) setTimeout(() => { loadOv.style.display = 'none'; }, 200);
    if (fadeOv) setTimeout(() => { fadeOv.style.opacity = '0'; }, 300);
    // Unfreeze only after overlays are fully gone (~350ms fade) so bots can't act while loading screen is visible
    setTimeout(() => { gameLoading = false; }, 480);
  }, 800);
}

// Pick a safe spawn position on a platform in the preferred half of the arena.
// avoidX: if set, the result will be at least MIN_SPAWN_SEP pixels away horizontally.
// Returns {x, y} or null if no arena is loaded.
const MIN_SPAWN_SEP = 220; // minimum horizontal distance between two spawns
function _arenaSpawnBounds() {
  if (!currentArena || !Array.isArray(currentArena.platforms) || !currentArena.platforms.length) {
    return { left: 20, right: GAME_W - 20 };
  }
  const xs = currentArena.platforms.map(pl => pl.x);
  const xr = currentArena.platforms.map(pl => pl.x + pl.w);
  const left = currentArena.worldWidth
    ? Math.max(Math.min(...xs), (currentArena.mapLeft !== undefined ? currentArena.mapLeft : Math.min(...xs)) - GAME_W * 0.5)
    : 20;
  const right = currentArena.worldWidth
    ? Math.min(Math.max(...xr), (currentArena.mapRight !== undefined ? currentArena.mapRight : Math.max(...xr)) + GAME_W * 0.5)
    : GAME_W - 20;
  return { left, right };
}

function _spawnHazardFloorY() {
  if (!currentArena) return Infinity;
  if (currentArena.hasLava) return currentArena.lavaY || 442;
  if (currentArenaKey === 'void' && bossFloorState === 'hazard') return 470;
  return Infinity;
}

function _spawnPointSafe(x, y, w = 24, h = 60) {
  if (!currentArena || !Array.isArray(currentArena.platforms)) return false;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

  const bounds = _arenaSpawnBounds();
  const left   = x - w / 2;
  const right  = x + w / 2;
  const top    = y - h;
  const bottom = y;
  const hazardY = _spawnHazardFloorY();

  if (left < bounds.left + 8 || right > bounds.right - 8) return false;
  if (bottom >= hazardY - 8) return false;

  let support = null;
  for (const pl of currentArena.platforms) {
    if (!pl || pl.isFloorDisabled) continue;
    const overlapX = Math.min(right, pl.x + pl.w) - Math.max(left, pl.x);
    if (overlapX < Math.min(18, w * 0.55)) continue;
    const footGap = Math.abs(bottom - pl.y);
    if (footGap <= 6 && (!support || pl.y < support.y)) support = pl;
    const intersectsBody =
      right > pl.x + 4 &&
      left < pl.x + pl.w - 4 &&
      bottom > pl.y + 3 &&
      top < pl.y + pl.h - 2;
    if (intersectsBody) return false;
  }
  if (!support) return false;

  for (const other of currentArena.platforms) {
    if (!other || other === support || other.isFloorDisabled) continue;
    const blocksHead =
      right > other.x + 4 &&
      left < other.x + other.w - 4 &&
      top < other.y + other.h &&
      bottom > other.y + 2;
    if (blocksHead) return false;
  }

  return true;
}

function pickSafeSpawn(sideHint, avoidX) {
  if (!currentArena) return null;
  if (['void','soccer'].includes(currentArenaKey)) return null;

  const platforms = currentArena.platforms;
  const lavaY = currentArena.hasLava ? (currentArena.lavaY || 442) : Infinity;

  // For boss/creator arena: the floor can be disabled by hazard events.
  // Prefer non-floor platforms that are solid. Fall back to floor if available.
  // Use current pl.x (live, after random-lerp) so spawn lands on the actual platform.
  // Also exclude platforms at or below the lava line (would place spawns in lava).
  // lavaY - 90: keep spawns well above lava so players don't immediately burn on respawn
  // Fix 5: stricter lava margin — keep 120px above lava to account for fall arc
  const lavaMargin = currentArena.hasLava ? 120 : 90;
  const safe = platforms.filter(pl => !pl.isFloorDisabled && pl.w > 50 && pl.y < lavaY - lavaMargin);
  const raised = safe.filter(pl => !pl.isFloor);
  const floor  = safe.find(pl => pl.isFloor);

  // Fix 4: for story arenas with worldWidth, restrict candidates to visible starting section
  // to avoid spawning players on platforms 3000px away from the action.
  // Use camera position if available; otherwise default to first screen near mapLeft.
  let _storyPool = null;
  if (storyModeActive && currentArena.worldWidth) {
    const viewCX = (typeof camX === 'number' ? camX : (currentArena.mapLeft || 0)) + GAME_W / 2;
    const viewHalf = GAME_W * 0.75;
    const nearby = raised.filter(pl => Math.abs(pl.x + pl.w / 2 - viewCX) < viewHalf);
    _storyPool = nearby.length ? nearby : raised;
  }

  // Overhead clearance check: filter out platforms that have another platform within 100px above them
  function hasOverheadClearance(pl) {
    const spawnX = pl.x + pl.w / 2;
    const spawnY = pl.y;
    for (const other of platforms) {
      if (other === pl || other.isFloor) continue;
      // Check if 'other' is directly above this platform spawn point
      if (other.y + other.h > spawnY - 100 && other.y + other.h < spawnY &&
          other.x < spawnX + 20 && other.x + other.w > spawnX - 20) {
        return false;
      }
    }
    return true;
  }

  let pool;
  const raisedBase = _storyPool || raised;
  if (raisedBase.length) {
    // Prefer platforms with overhead clearance, then requested side
    const clear = raisedBase.filter(hasOverheadClearance);
    const usable = clear.length ? clear : raisedBase;
    const preferred = sideHint === 'any' ? usable
      : usable.filter(pl => sideHint === 'right' ? (pl.x + pl.w / 2 > GAME_W / 2) : (pl.x + pl.w / 2 < GAME_W / 2));
    pool = preferred.length ? preferred : usable;
  } else if (floor) {
    // Only the floor is available — place on appropriate side, far from avoidX.
    // For large worldWidth maps the floor may be wider than the viewport; use viewport-relative
    // coordinates so both players don't clamp to the same GAME_W edge.
    const ww = currentArena.worldWidth;
    let rx;
    if (ww) {
      // Viewport starts at mapLeft (or floor.x as a proxy). Spawn within first screen-width of world.
      const viewStart = currentArena.mapLeft !== undefined ? currentArena.mapLeft : floor.x;
      const viewSpan  = Math.min(GAME_W - 160, floor.w);
      rx = viewStart + viewSpan * (sideHint === 'right' ? 0.70 : 0.25);
      rx = Math.max(floor.x + 80, Math.min(floor.x + floor.w - 80, rx));
    } else {
      const fx = floor.x + (sideHint === 'right' ? floor.w * 0.65 : floor.w * 0.25);
      rx = Math.max(100, Math.min(GAME_W - 100, fx));
    }
    // If too close to avoidX, push to the far quarter of the view span
    if (avoidX !== undefined && Math.abs(rx - avoidX) < MIN_SPAWN_SEP) {
      const refW = ww ? Math.min(GAME_W - 160, floor.w) : (GAME_W - 200);
      const refL = ww ? (currentArena.mapLeft !== undefined ? currentArena.mapLeft : floor.x) : 100;
      rx = avoidX < refL + refW / 2
        ? Math.max(avoidX + MIN_SPAWN_SEP, refL + refW * 0.65)
        : Math.min(avoidX - MIN_SPAWN_SEP, refL + refW * 0.35);
      rx = Math.max(floor.x + 80, Math.min(floor.x + floor.w - 80, rx));
    }
    const floorCandidates = [
      rx,
      floor.x + floor.w * 0.22,
      floor.x + floor.w * 0.50,
      floor.x + floor.w * 0.78,
    ];
    for (const candX of floorCandidates) {
      if (_spawnPointSafe(candX, floor.y - 1)) return { x: candX, y: floor.y - 1 };
    }
    return { x: rx, y: floor.y - 1 };
  } else {
    return null; // no safe surface at all
  }

  // If avoidX is set, prefer platforms that are far enough away; fall back to any platform
  let chosenPool = pool;
  if (avoidX !== undefined) {
    const farPool = pool.filter(pl => Math.abs(pl.x + pl.w / 2 - avoidX) >= MIN_SPAWN_SEP);
    if (farPool.length) chosenPool = farPool;
  }
  const orderedPool = chosenPool
    .slice()
    .sort((a, b) => {
      const aMid = a.x + a.w / 2;
      const bMid = b.x + b.w / 2;
      const aScore = avoidX !== undefined ? Math.abs(aMid - avoidX) : 0;
      const bScore = avoidX !== undefined ? Math.abs(bMid - avoidX) : 0;
      return bScore - aScore;
    });

  for (const pl of orderedPool) {
    // Keep spawn within platform bounds without leaking outside the current arena
    const bounds = _arenaSpawnBounds();
    const safeLeft  = Math.max(pl.x + 14, bounds.left + 12);
    const safeRight = Math.min(pl.x + pl.w - 14, bounds.right - 12);
    if (!(safeLeft < safeRight)) continue;

    const samples = [
      safeLeft + (safeRight - safeLeft) * 0.18,
      safeLeft + (safeRight - safeLeft) * 0.50,
      safeLeft + (safeRight - safeLeft) * 0.82,
    ];
    if (avoidX !== undefined) {
      samples.push(avoidX < (safeLeft + safeRight) / 2
        ? Math.min(safeRight, avoidX + MIN_SPAWN_SEP)
        : Math.max(safeLeft, avoidX - MIN_SPAWN_SEP));
    }

    for (let i = 0; i < 6; i++) {
      samples.push(safeLeft + Math.random() * (safeRight - safeLeft));
    }

    for (const candX of samples) {
      if (avoidX !== undefined && Math.abs(candX - avoidX) < MIN_SPAWN_SEP * 0.72) continue;
      if (_spawnPointSafe(candX, pl.y - 1)) return { x: candX, y: pl.y - 1 };
    }
  }

  const fallback = orderedPool[0];
  if (!fallback) return null;
  return { x: clamp(fallback.x + fallback.w / 2, fallback.x + 14, fallback.x + fallback.w - 14), y: fallback.y - 1 };
}

function pickSafeSpawnNear(preferredX, sideHint = 'any', avoidX) {
  if (!currentArena || !Array.isArray(currentArena.platforms)) return pickSafeSpawn(sideHint, avoidX);
  const hazardY = _spawnHazardFloorY();
  const bounds = _arenaSpawnBounds();
  const candidates = currentArena.platforms.filter(pl =>
    pl && !pl.isFloorDisabled && pl.w > 46 && pl.y < hazardY - 18
  );
  if (!candidates.length) return pickSafeSpawn(sideHint, avoidX);

  const desiredX = Number.isFinite(preferredX)
    ? clamp(preferredX, bounds.left + 24, bounds.right - 24)
    : (bounds.left + bounds.right) * 0.5;

  const filtered = sideHint === 'left'
    ? candidates.filter(pl => pl.x + pl.w / 2 <= desiredX + GAME_W * 0.15)
    : sideHint === 'right'
      ? candidates.filter(pl => pl.x + pl.w / 2 >= desiredX - GAME_W * 0.15)
      : candidates;
  const pool = filtered.length ? filtered : candidates;
  const ordered = pool
    .slice()
    .sort((a, b) => Math.abs((a.x + a.w / 2) - desiredX) - Math.abs((b.x + b.w / 2) - desiredX));

  for (const pl of ordered) {
    const left = Math.max(pl.x + 14, bounds.left + 12);
    const right = Math.min(pl.x + pl.w - 14, bounds.right - 12);
    if (!(left < right)) continue;
    const samples = [
      clamp(desiredX, left, right),
      clamp((left + right) * 0.5, left, right),
      left + (right - left) * 0.22,
      left + (right - left) * 0.78,
    ];
    for (let i = 0; i < 5; i++) samples.push(left + Math.random() * (right - left));
    for (const candX of samples) {
      if (avoidX !== undefined && Math.abs(candX - avoidX) < MIN_SPAWN_SEP * 0.66) continue;
      if (_spawnPointSafe(candX, pl.y - 1)) return { x: candX, y: pl.y - 1 };
    }
  }
  return pickSafeSpawn(sideHint, avoidX);
}

function _startGameCore() {
  document.getElementById('menu').style.display            = 'none';
  document.getElementById('gameOverOverlay').style.display  = 'none';
  document.getElementById('pauseOverlay').style.display     = 'none';
  canvas.style.display = 'block';
  document.getElementById('hud').style.display = 'flex';
  // Apply persistent 3D view setting at game start (TF fight may override this later)
  if (typeof set3DView === 'function') set3DView(settings.view3D ? 'settings' : false);
  // Show chat widget if online
  const chatEl = document.getElementById('onlineChat');
  if (chatEl) chatEl.style.display = onlineMode ? 'flex' : 'none';

  // Resolve arena
  const isBossMode      = gameMode === 'boss';
  const isTrueFormMode  = gameMode === 'trueform';
  const isTrainingMode  = gameMode === 'training';
  const isMinigamesMode = gameMode === 'minigames';
  const isExploreMode   = gameMode === 'exploration';
  const isAdaptiveMode     = gameMode === 'adaptive' || gameMode === 'sovereign';
  const isSovereignMode    = gameMode === 'sovereign';
  const isCompleteRandMode = gameMode === '2p' && completeRandomizer;
  const isBossLivesMode    = isBossMode || isTrueFormMode;
  _setBossFightLivesLock(isBossLivesMode);
  trainingMode = isTrainingMode;
  tutorialMode = false; // tutorial mode removed
  if (isBossMode) {
    currentArenaKey = 'creator';
  } else if (isTrueFormMode) {
    currentArenaKey = 'void';
    resetTFState();
  } else if (isExploreMode) {
    currentArenaKey = '__explore__';
  } else if (isMinigamesMode) {
    if (minigameType === 'soccer') {
      currentArenaKey = 'soccer';
    } else {
      // Pick a random arena from the standard PvP selection
      const arenaPool = ARENA_KEYS_ORDERED.filter(k => ARENAS[k] && !ARENAS[k].isStoryOnly);
      currentArenaKey = randChoice(arenaPool);
    }
  } else if (isCompleteRandMode) {
    const arenaPool = ARENA_KEYS_ORDERED.filter(k => ARENAS[k] && !ARENAS[k].isStoryOnly);
    currentArenaKey = randChoice(arenaPool);
  } else {
    // Only standard PvP arenas (ARENA_KEYS_ORDERED) available for random pick
    const arenaPool = ARENA_KEYS_ORDERED.filter(k => ARENAS[k] && !ARENAS[k].isStoryOnly);
    // If a story-only arena was somehow selected outside story mode, fall back to random
    const isStoryOnlyArena = ARENAS[selectedArena] && ARENAS[selectedArena].isStoryOnly;
    if (isStoryOnlyArena && !storyModeActive) {
      currentArenaKey = randChoice(arenaPool);
    } else {
      currentArenaKey = selectedArena === 'random' ? randChoice(arenaPool) : selectedArena;
    }
  }
  isRandomMapMode = (selectedArena === 'random' && !isCompleteRandMode);
  // Lava/void: no randomization
  if (currentArenaKey !== 'creator' && currentArenaKey !== 'lava' && currentArenaKey !== 'void' && currentArenaKey !== 'soccer' && !isExploreMode) randomizeArenaLayout(currentArenaKey);
  currentArena = ARENAS[currentArenaKey];
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  initMapPerks(currentArenaKey);

  // Online host: broadcast authoritative game state to guest BEFORE creating fighters
  if (onlineMode && onlineLocalSlot === 1 && typeof NetworkManager !== 'undefined' && NetworkManager.connected) {
    const syncState = {
      arenaKey:  currentArenaKey,
      gameMode:  gameMode,
      lives:     chosenLives,
      p1Weapon:  document.getElementById('p1Weapon')?.value || 'sword',
      p2Weapon:  document.getElementById('p2Weapon')?.value || 'sword',
      p1Class:   document.getElementById('p1Class')?.value  || 'none',
      p2Class:   document.getElementById('p2Class')?.value  || 'none',
      platforms: (ARENAS[currentArenaKey]?.platforms || []).map(pl => ({ x: pl.x, y: pl.y, w: pl.w })),
    };
    NetworkManager.sendGameStateSync(syncState);
  }

  // Resolve weapons & classes together — handles 50/50 when both are 'random'
  // Complete Randomizer is a 1v1 modifier: force random arena + weapon + class
  const _p1Resolved = isCompleteRandMode ? resolveWeaponAndClassValues('random', 'random') : resolveWeaponAndClass('p1Weapon', 'p1Class');
  const _p2Resolved = isCompleteRandMode ? resolveWeaponAndClassValues('random', 'random') : resolveWeaponAndClass('p2Weapon', 'p2Class');
  let w1 = _p1Resolved.weaponKey;
  let w2 = _p2Resolved.weaponKey;
  // Story mode: HARD enforce no ranged weapons for human players at game start
  if (storyModeActive) {
    const _isMeleeOnly = (key) => typeof WEAPONS !== 'undefined' && WEAPONS[key] && WEAPONS[key].type === 'ranged';
    if (_isMeleeOnly(w1)) w1 = 'sword';
    if (_isMeleeOnly(w2)) w2 = 'sword';
  }
  // Store resolved class keys so applyClass calls below use the coordinated result
  const _p1ResolvedClass = _p1Resolved.classKey;
  const _p2ResolvedClass = _p2Resolved.classKey;
  const c1   = document.getElementById('p1Color').value;
  const c2   = document.getElementById('p2Color').value;
  const p1Diff = (document.getElementById('p1Difficulty')?.value) || 'hard';
  const p2Diff = (document.getElementById('p2Difficulty')?.value) || 'hard';
  const diff   = p2Diff; // legacy alias used below for p2
  const isBot  = p2IsBot; // bot determined by P2 toggle, not separate mode

  // Generate bg elements fresh each game
  generateBgElements();

  // Reset state — stop menu background loop
  menuLoopRunning    = false;
  frameCount         = 0; // reset per-game frame counter (used for yeti min-spawn delay)
  projectiles        = [];
  particles          = [];
  verletRagdolls     = [];
  damageTexts        = [];
  respawnCountdowns  = [];
  minions            = [];
  forestBeast        = null;
  forestBeastCooldown = 0;
  yeti               = null;
  yetiCooldown       = 0;
  bossBeams          = [];
  bossSpikes         = [];
  if (typeof resetBossWarnings === 'function') resetBossWarnings();
  trainingDummies    = [];
  bossDialogue       = { text: '', timer: 0 };
  backstagePortals   = [];
  lightningBolts     = [];
  bossDeathScene     = null;
  fakeDeath          = { triggered: false, active: false, timer: 0, player: null };
  if (typeof resetParadoxState === 'function') resetParadoxState();
  mapItems           = [];
  mapPerkState       = {};
  winsP1             = 0;
  winsP2             = 0;
  screenShake     = 0;
  frameCount      = 0;
  paused          = false;
  // Reset timing globals — prevent stale slow-motion / hitstop from previous game
  slowMotion      = 1.0;
  hitStopFrames   = 0;
  hitSlowTimer    = 0;
  storyFreezeTimer = 0;
  gameFrozen      = false; // ensure cinematic freeze is cleared on new game start
  if (typeof _lastFrameTime !== 'undefined') _lastFrameTime = 0;
  if (typeof resetDirector === 'function') resetDirector();

  // Reset camera zoom
  camZoomCur = 1; camZoomTarget = 1;
  camXCur = GAME_W / 2; camYCur = GAME_H / 2;
  camXTarget = GAME_W / 2; camYTarget = GAME_H / 2;
  camHitZoomTimer = 0;
  aiTick = 0;
  // Reset boss floor state for every game start
  bossFloorState = 'normal';
  bossFloorType  = 'lava';
  bossFloorTimer = 1500;
  bossPhaseFlash = 0;
  // Restore creator arena floor platform in case a previous game left it disabled
  if (ARENAS.creator) {
    const floorPl = ARENAS.creator.platforms.find(p => p.isFloor);
    if (floorPl) floorPl.isFloorDisabled = false;
    ARENAS.creator.hasLava = false;
    ARENAS.creator.deathY  = 640;
  }

  // Player 1  (W/A/D move · S=shield · Space=attack · Q=ability)
  const p1 = new Fighter(160, 300, c1, w1, { left:'a', right:'d', jump:'w', attack:' ', shield:'s', ability:'q', super:'e' }, p1IsBot, p1Diff);
  p1.playerNum = 1; p1.name = p1IsBot ? 'BOT1' : 'P1'; p1.lives = chosenLives;
  const _p1SpawnPos = pickSafeSpawn('left') || { x: 160, y: 300 };
  p1.spawnX = _p1SpawnPos.x; p1.spawnY = _p1SpawnPos.y; p1.x = _p1SpawnPos.x; p1.y = _p1SpawnPos.y;
  p1.hat  = document.getElementById('p1Hat')?.value  || 'none';
  p1.cape = document.getElementById('p1Cape')?.value || 'none';
  if (p1Skin !== 'default' && SKIN_COLORS[p1Skin]) p1.color = SKIN_COLORS[p1Skin];
  // Story mode: if class is locked for this chapter, ignore player's class selection
  const _storyClassLocked = storyModeActive && storyPlayerOverride && storyPlayerOverride.noClass;
  applyClass(p1, _storyClassLocked ? 'none' : _p1ResolvedClass);
  // If player explicitly chose a weapon (not random), restore it after applyClass
  // so archer/paladin class doesn't forcefully override the selected weapon
  if (document.getElementById('p1Weapon')?.value && document.getElementById('p1Weapon').value !== 'random'
      && !isCompleteRandMode && typeof WEAPONS !== 'undefined' && WEAPONS[w1]) {
    p1.weaponKey = w1; p1.weapon = WEAPONS[w1]; p1._ammo = p1.weapon.clipSize || 0;
  }
  // Story mode: apply per-level player restrictions (weak human → powerful fighter progression)
  if (storyModeActive && storyPlayerOverride) {
    const _sc = storyPlayerOverride;
    if (_sc.speedMult !== undefined) p1.classSpeedMult = _sc.speedMult;
    if (_sc.dmgMult   !== undefined) p1.dmgMult        = _sc.dmgMult;
    if (_sc.weapon && typeof WEAPONS !== 'undefined' && WEAPONS[_sc.weapon]) {
      p1.weapon = WEAPONS[_sc.weapon]; p1.weaponKey = _sc.weapon;
    }
    p1._storyNoAbility    = !!_sc.noAbility;
    p1._storyNoSuper      = !!_sc.noSuper;
    p1._storyNoDoubleJump = !!_sc.noDoubleJump;
    p1._storyNoDodge      = !!_sc.noDodge;
  }
  // Megaknight spawn fall
  if (p1.charClass === 'megaknight') { p1.y = -120; p1.vy = 2; p1._spawnFalling = true; p1.invincible = 200; }

  // Player 2 / Bot / Boss / Training Dummy
  let p2;
  if (isBossMode) {
    const boss = new Boss();
    // True Creator mode: significantly harder boss (requires TRUEFORM code)
    if (unlockedTrueBoss) {
      boss.health            = 4500;
      boss.maxHealth         = 4500;
      boss.attackCooldownMult = 0.28;
      boss.kbBonus           = 2.5;
      boss.kbResist          = 0.25;
      boss.name              = 'CREATOR';
      boss.color             = '#ff00ee';
    }
    if (bossPlayerCount === 2) {
      // 2P boss: harder boss
      boss.attackCooldownMult = 0.38; // ~1.3x faster attacks than 1P
      boss.kbBonus            = 2.0;  // 1.33x more KB than 1P
      boss.health             *= 1.5; // 1.5x more HP
      boss.maxHealth          = boss.health;
      // Spawn real P2 alongside boss (can be human or bot)
      const w2b  = _p2ResolvedClass !== 'none' && typeof CLASSES !== 'undefined' && CLASSES[_p2ResolvedClass]?.weapon
                   ? CLASSES[_p2ResolvedClass].weapon : w2;
      const c2b  = document.getElementById('p2Color').value;
      const p2h  = new Fighter(720, 300, c2b, w2b, { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', attack:'Enter', shield:'ArrowDown', ability:'.', super:'/' }, p2IsBot, diff);
      p2h.playerNum = 2; p2h.name = p2IsBot ? 'BOT' : 'P2'; p2h.lives = chosenLives;
      { const _sp2 = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
        p2h.spawnX = _sp2.x; p2h.spawnY = _sp2.y; p2h.x = _sp2.x; p2h.y = _sp2.y; }
      p2h.hat  = document.getElementById('p2Hat')?.value  || 'none';
      p2h.cape = document.getElementById('p2Cape')?.value || 'none';
      applyClass(p2h, _p2ResolvedClass);
      if (p2h.charClass === 'megaknight') { p2h.y = -120; p2h.vy = 2; p2h._spawnFalling = true; p2h.invincible = 200; }
      if (p2h.isAI) p2h.target = boss; // bot targets boss
      players = [p1, p2h, boss];
      p1.target  = boss;
      p2h.target = boss;
      boss.target = p1;
      p2 = p2h; // for HUD reference
    } else {
      p2 = boss;
      players = [p1, p2];
      p1.target = p2;
      p2.target = p1;
    }
  } else if (isAdaptiveMode) {
    // Adaptive AI: P1 vs the learning AdaptiveAI opponent
    // Sovereign mode uses SovereignMK2 (enhanced); story adaptive uses base AdaptiveAI
    p1.isAI  = false;
    p1.lives = chosenLives;
    // Pick a weapon for the AI — random from a balanced set
    const _aiWeapons = ['sword','axe','spear','hammer','scythe','katana'];
    const _aiWeapon  = _aiWeapons[Math.floor(Math.random() * _aiWeapons.length)];
    const ai = isSovereignMode
      ? new SovereignMK2(720, 300, '#ff3311', _aiWeapon)
      : new AdaptiveAI(720, 300, '#9955ee', _aiWeapon);
    ai.playerNum = 2;
    ai.lives     = chosenLives;
    const _aiSpawn = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
    ai.spawnX = _aiSpawn.x; ai.spawnY = _aiSpawn.y;
    ai.x = _aiSpawn.x;      ai.y = _aiSpawn.y;
    p2 = ai;
    players = [p1, ai];
    p1.target = ai;
    ai.target = p1;
  } else if (isTrueFormMode) {
    // True Form: solo — P1 vs True Form boss, void arena, no 2P
    p1.isAI = false;
    p1.lives = chosenLives;
    const tf = new TrueForm();
    tf.target = p1;
    p1.target = tf;
    p2 = tf;
    players = [p1, tf];
  } else if (isTrainingMode) {
    if (training2P) {
      // 2P training: both fighters present, shared dummy
      p2 = new Fighter(720, 300, c2, w2, { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', attack:'Enter', shield:'ArrowDown', ability:'.', super:'/' }, p2IsBot, diff);
      p2.playerNum = 2; p2.name = p2IsBot ? 'BOT' : 'P2'; p2.lives = 999;
      { const _sp2 = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
        p2.spawnX = _sp2.x; p2.spawnY = _sp2.y; p2.x = _sp2.x; p2.y = _sp2.y; }
      applyClass(p2, _p2ResolvedClass);
      if (p2.charClass === 'megaknight') { p2.y = -120; p2.vy = 2; p2._spawnFalling = true; p2.invincible = 200; }
      const starterDummy = new Dummy(450, 200);
      starterDummy.playerNum = 3; starterDummy.name = 'DUMMY';
      trainingDummies.push(starterDummy);
      players = [p1, p2];
      p1.target = p2; p2.target = p1;
      p1.lives = 999;
    } else {
      // Standard training: P1 vs dummy
      const starterDummy = new Dummy(720, 300);
      starterDummy.playerNum = 2; starterDummy.name = 'DUMMY';
      trainingDummies.push(starterDummy);
      players = [p1];
      p1.target = starterDummy; starterDummy.target = p1;
    }
  } else if (isMinigamesMode) {
    // Minigames: P1 always human; survival/koth both support optional P2
    p1.isAI = false;
    p1.lives = (minigameType === 'survival') ? 1 : 10; // survival: 1 life; others: managed by mode
    if (minigameType === 'koth' || minigameType === 'chaos' || minigameType === 'soccer' || (minigameType === 'survival' && !p2IsNone)) {
      const p2mg = new Fighter(720, 300, c2, w2,
        { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', attack:'Enter',
          shield:'ArrowDown', ability:'.', super:'/' }, p2IsBot, p2Diff);
      p2mg.playerNum = 2; p2mg.name = p2IsBot ? 'BOT' : 'P2';
      p2mg.lives = (minigameType === 'survival') ? 1 : 99;
      { const _sp2 = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
        p2mg.spawnX = _sp2.x; p2mg.spawnY = _sp2.y; p2mg.x = _sp2.x; p2mg.y = _sp2.y; }
      p2mg.hat  = document.getElementById('p2Hat')?.value  || 'none';
      p2mg.cape = document.getElementById('p2Cape')?.value || 'none';
      if (p2Skin !== 'default' && SKIN_COLORS[p2Skin]) p2mg.color = SKIN_COLORS[p2Skin];
      applyClass(p2mg, _p2ResolvedClass);
      players = [p1, p2mg];
      if (minigameType === 'koth' || minigameType === 'chaos') { p1.target = p2mg; p2mg.target = p1; }
      else if (minigameType === 'soccer') {
        p1.lives = 99; p2mg.lives = 99;
        p1.target = p2mg; p2mg.target = p1;
      } else { p1.target = null; p2mg.target = null; } // survival: both target enemies
    } else {
      // Survival solo
      players = [p1];
      p1.target = null;
    }
    initMinigame();
  } else if (isExploreMode) {
    // Exploration: P1 only — enemies are dynamically spawned as minions
    players = [p1];
    p1.target = null;
    // Do NOT set trainingMode — exploration uses its own lives system
  } else if (p2IsNone) {
    // Solo / None mode — only P1 exists, infinite lives, no opponent
    p1.lives = 9999;
    players = [p1];
    p1.target = null;
  } else {
    p2 = new Fighter(720, 300, c2, w2, { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', attack:'Enter', shield:'ArrowDown', ability:'.', super:'/' }, isBot, diff);
    p2.playerNum = 2; p2.name = p2IsBot ? 'BOT' : 'P2'; p2.lives = chosenLives;
    { const _sp2 = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
      p2.spawnX = _sp2.x; p2.spawnY = _sp2.y; p2.x = _sp2.x; p2.y = _sp2.y; }
    p2.hat  = document.getElementById('p2Hat')?.value  || 'none';
    p2.cape = document.getElementById('p2Cape')?.value || 'none';
    if (p2Skin !== 'default' && SKIN_COLORS[p2Skin]) p2.color = SKIN_COLORS[p2Skin];
    applyClass(p2, _p2ResolvedClass);
    if (p2.charClass === 'megaknight') { p2.y = -120; p2.vy = 2; p2._spawnFalling = true; p2.invincible = 200; }
    // Story mode: apply enemy damage and cooldown scaling so fights feel fair at each chapter
    if (storyModeActive && typeof STORY_ENEMY_CONFIGS !== 'undefined') {
      const _ec = STORY_ENEMY_CONFIGS[storyCurrentLevel];
      if (_ec) {
        if (_ec.enemyDmgMult   !== undefined) p2.dmgMult            = _ec.enemyDmgMult;
        if (_ec.enemyAtkCdMult !== undefined) p2.attackCooldownMult = _ec.enemyAtkCdMult;
      }
    }
    if (storyModeActive && typeof _storyScaleEnemyUnit === 'function' && typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter) {
      _storyScaleEnemyUnit(p2, _activeStory2Chapter.id, {
        elite: !!(typeof storyPendingPhaseConfig !== 'undefined' && storyPendingPhaseConfig && (storyPendingPhaseConfig.type === 'elite_wave' || storyPendingPhaseConfig.type === 'mini_boss'))
      });
    }
    // Story armor: apply to p2
    if (storyModeActive && storyEnemyArmor && storyEnemyArmor.length > 0) {
      p2.armorPieces = [...storyEnemyArmor];
    }
    // Story opponent name
    if (storyModeActive && storyOpponentName) p2.name = storyOpponentName;
    players = [p1, p2];
    if (storyModeActive) {
      p1.storyFaction = 'player'; p1._teamId = 1;
      p2.storyFaction = 'enemy';  p2._teamId = 2;
    }
    p1.target = p2; p2.target = p1;

    // Story two-enemies: spawn a third fighter on p2's side
    if (storyModeActive && storyTwoEnemies && storySecondEnemyDef) {
      const _sed = storySecondEnemyDef;
      const _sp3 = pickSafeSpawn('right', p1.x) || { x: 600, y: 300 };
      const _p3w = _sed.weaponKey || w2;
      const _p3c = _sed.color || '#cc5500';
      const _p3d = _sed.aiDiff || diff;
      const p3 = new Fighter(_sp3.x, _sp3.y, _p3c, _p3w,
        { left:'ArrowLeft', right:'ArrowRight', jump:'ArrowUp', attack:'Enter', shield:'ArrowDown', ability:'.', super:'/' },
        true, _p3d);
      p3.playerNum = 3; p3.name = _sed.name || 'ENEMY B'; p3.lives = chosenLives;
      p3.spawnX = _sp3.x; p3.spawnY = _sp3.y;
      if (_sed.classKey) applyClass(p3, _sed.classKey);
      if (storyModeActive && typeof STORY_ENEMY_CONFIGS !== 'undefined') {
        const _ec2 = STORY_ENEMY_CONFIGS[storyCurrentLevel];
        if (_ec2) {
          if (_ec2.enemyDmgMult   !== undefined) p3.dmgMult            = _ec2.enemyDmgMult;
          if (_ec2.enemyAtkCdMult !== undefined) p3.attackCooldownMult = _ec2.enemyAtkCdMult;
        }
      }
      if (storyModeActive && typeof _storyScaleEnemyUnit === 'function' && typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter) {
        _storyScaleEnemyUnit(p3, _activeStory2Chapter.id, { elite: true });
      }
      players.push(p3);
      if (storyModeActive) {
        p3.storyFaction = 'enemy';
        p3._teamId = 2;
      }
      // All bots target the player
      p2.target = p1; p3.target = p1;
    }
  }

  // Assign bot personalities — each AI fighter gets a random personality
  const PERSONALITIES = ['aggressive', 'defensive', 'trickster', 'sniper'];
  for (const p of players) {
    if (p.isAI && !p.isBoss && !p.isTrueForm && !p.isMinion) {
      p.personality = randChoice(PERSONALITIES);
    }
  }

  // Online mode: mark which player is remote so gameLoop applies network state
  if (onlineMode && NetworkManager.connected) {
    // onlineLocalSlot: 0 = host (plays as P1/index 0), 1 = guest (plays as P2/index 1)
    const localIdx  = onlineLocalSlot;      // 0 for host, 1 for guest
    const remoteIdx = 1 - localIdx;        // the other slot
    if (players[localIdx]) {
      players[localIdx].isRemote = false;
      // Host always uses P1 keys; guest always uses P1 keys on their machine too
      players[localIdx].controls = {
        left: 'a', right: 'd', jump: 'w', attack: ' ',
        shield: 's', ability: 'q', super: 'e',
      };
      players[localIdx].isAI = false;
    }
    if (players[remoteIdx]) {
      players[remoteIdx].isRemote  = true;
      players[remoteIdx].isAI      = false; // network drives this player, not AI
      players[remoteIdx].controls  = {};    // no local keyboard input
    }
  }

  // Lava arena: override spawn positions to ensure players land on solid platforms
  if (currentArenaKey === 'lava') {
    p1.spawnX = 236; p1.spawnY = 260; // above upper-left platform (x=178,y=278)
    p1.x = 236; p1.y = 200;
    if (p2 && !p2.isBoss) {
      p2.spawnX = 640; p2.spawnY = 260; // above upper-right platform (x=582,y=278)
      p2.x = 640; p2.y = 200;
    }
  }

  _applyBossFightLivesLockToPlayers();

  // Training mode: show in-game HUD (not in tutorial)
  const trainingHud = document.getElementById('trainingHud');
  if (trainingHud) trainingHud.style.display = isTrainingMode ? 'flex' : 'none';
  const trainingCtrl = document.getElementById('trainingControls');
  if (trainingCtrl) trainingCtrl.style.display = isTrainingMode ? 'flex' : 'none';

  // HUD labels
  document.getElementById('p1HudName').textContent = p1.name;
  if (p2) document.getElementById('p2HudName').textContent = p2.name;
  document.getElementById('killFeed').innerHTML = '';

  updateHUD();
  // Reset per-match achievement stats
  _achStats.damageTaken = 0; _achStats.rangedDmg = 0; _achStats.consecutiveHits = 0;
  _achStats.superCount = 0; _achStats.matchStartTime = Date.now();
  _firstDeathFrame  = -1;
  _firstDeathPlayer = null;
  // Chaos mode: initialize after players are set up
  if (typeof chaosMode !== 'undefined' && chaosMode && typeof initChaosMode === 'function') {
    initChaosMode();
  }

  // Post-class weapon restore: if player explicitly selected a non-random weapon,
  // respect that choice over what applyClass may have forced
  if (!isCompleteRandMode && typeof WEAPONS !== 'undefined') {
    const _p2WeaponEl = document.getElementById('p2Weapon');
    const _p2WeaponVal = _p2WeaponEl?.value;
    if (p2 && !p2.isBoss && _p2WeaponVal && _p2WeaponVal !== 'random' && WEAPONS[w2]) {
      p2.weaponKey = w2; p2.weapon = WEAPONS[w2]; p2._ammo = p2.weapon.clipSize || 0;
    }
  }

  gameRunning = true;
  // Start appropriate background music
  if (gameMode === 'boss' || gameMode === 'trueform') {
    MusicManager.playBoss();
  } else {
    MusicManager.playNormal();
  }
  resizeGame();
  const _safeLoop = typeof ErrorBoundary !== 'undefined'
    ? ErrorBoundary.wrapLoop(gameLoop)
    : gameLoop;
  requestAnimationFrame(_safeLoop);
}

// ============================================================
// CHAOS MODE TOGGLE
// ============================================================
function toggleChaosMode() {
  if (typeof chaosMode === 'undefined') return;
  chaosMode = !chaosMode;
  const btn = document.getElementById('chaosModeBtn');
  if (btn) {
    btn.textContent = '⚡ Chaos Mode: ' + (chaosMode ? 'ON' : 'OFF');
    btn.style.borderColor = chaosMode ? 'rgba(220,80,255,0.8)' : 'rgba(160,60,255,0.4)';
    btn.style.color       = chaosMode ? '#ff88ff' : '#cc88ff';
    btn.style.boxShadow   = chaosMode ? '0 0 12px rgba(200,60,255,0.5)' : '';
  }
}

// ============================================================
// FULLSCREEN / RESIZE
// ============================================================
function resizeGame() {
  const hud  = document.getElementById('hud');
  const hudH = (hud && hud.offsetHeight) || 0;
  const w    = window.innerWidth;
  const h    = window.innerHeight - hudH;

  canvas.style.width      = w + 'px';
  canvas.style.height     = h + 'px';
  canvas.style.marginLeft = '0';
  canvas.style.marginTop  = '0';
}

window.addEventListener('resize', resizeGame);

// ============================================================
// PAGE LOAD — start menu background animation immediately
// ============================================================
currentArenaKey = ARENA_KEYS_ORDERED[menuBgArenaIdx];
currentArena    = ARENAS[currentArenaKey];
generateBgElements();
canvas.style.display = 'block';
resizeGame();
menuLoopRunning = true;
requestAnimationFrame(menuBgLoop);

// Sync version labels from GAME_VERSION constant so they never drift
(function() { const el = document.getElementById('gameVersionLabel'); if (el && typeof GAME_VERSION !== 'undefined') el.textContent = GAME_VERSION; })();
_initVersionLabels();

// Restore secret letter state from localStorage on page load
syncCodeInput();
// Sync sound UI with saved state
(function() {
  const btn = document.getElementById('sfxMuteBtn');
  if (btn && SoundManager.isMuted()) btn.textContent = '🔇 Sound: Off';
  const vol = parseFloat(localStorage.getItem('smc_sfxVol') || '0.35');
  const slider = document.querySelector('input[oninput*="setSfxVolume"]');
  if (slider) slider.value = vol;
})();
if (localStorage.getItem('smc_bossBeaten')) {
  const bossCard = document.getElementById('modeBoss');
  if (bossCard) bossCard.style.display = '';
}
// Unlock SOVEREIGN Ω mode card after beating SOVEREIGN in story
if (localStorage.getItem('smc_sovereignBeaten')) {
  const _s2Card  = document.getElementById('modeSovereign');
  if (_s2Card)  _s2Card.style.display  = '';
}
if (localStorage.getItem('smc_trueform')) {
  const card = document.getElementById('modeTrueForm');
  if (card) card.style.display = '';
  // Show 3D View setting (unlocked by defeating True Form)
  const row3D = document.getElementById('setting3DRow');
  if (row3D) row3D.style.display = '';
  // Restore 3D checkbox and apply persistent setting
  const el3D = document.getElementById('setting3DView');
  if (el3D) {
    el3D.checked = settings.view3D;
    if (settings.view3D && typeof set3DView === 'function') set3DView('settings');
  }
}
// Init arena & lives dropdowns — default to random on first load
selectArena('random');
selectLives(chosenLives);
// Init public room browser hidden by default (private is default)
(function() {
  const browser = document.getElementById('publicRoomBrowser');
  if (browser) browser.style.display = 'none'; // hidden until "Public" selected
  // Also auto-refresh room list when Online mode is opened
})();

// First-time visit (or chapter 0 not yet beaten): open Story Mode and force Chapter 1
(function() {
  try {
    const s2 = JSON.parse(localStorage.getItem('smc_story2') || '{}');
    const ch0Beaten = Array.isArray(s2.defeated) && s2.defeated.includes(0);
    if (!ch0Beaten) {
      setTimeout(() => {
        selectMode('story');
        setTimeout(() => {
          if (typeof _showPrologue === 'function') {
            _showPrologue(() => { if (typeof _beginChapter2 === 'function') _beginChapter2(0); });
          } else if (typeof _beginChapter2 === 'function') {
            _beginChapter2(0);
          }
        }, 300);
      }, 500);
    }
  } catch(e) {}
})();

// ============================================================
// EDGE PLAYER INDICATORS
// ============================================================
function drawEdgeIndicators(scX, scY, camCX, camCY) {
  if (!gameRunning) return;
  const MARGIN = 40; // px from screen edge before indicator shows
  const ARROW  = 14; // arrow half-size
  const allP   = [...players, ...minions].filter(p => p.health > 0 && !p.isBoss);
  for (const p of allP) {
    // Convert game coords to screen coords
    const sx = (p.cx() - camCX) * scX + canvas.width  / 2;
    const sy = (p.cy() - camCY) * scY + canvas.height / 2;
    const onScreen = sx > -p.w * scX && sx < canvas.width + p.w * scX &&
                     sy > -p.h * scY && sy < canvas.height + p.h * scY;
    if (onScreen) continue;
    // Clamp indicator to screen edge with margin
    const ix = Math.max(MARGIN, Math.min(canvas.width  - MARGIN, sx));
    const iy = Math.max(MARGIN, Math.min(canvas.height - MARGIN, sy));
    const angle = Math.atan2(sy - iy, sx - ix);
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle   = p.color || '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(ARROW, 0);
    ctx.lineTo(-ARROW * 0.6,  ARROW * 0.55);
    ctx.lineTo(-ARROW * 0.6, -ARROW * 0.55);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    // Name label
    ctx.rotate(-angle);
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 9px Arial';
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur  = 4;
    ctx.fillText(p.name || '?', 0, ARROW + 12);
    ctx.restore();
  }
}
