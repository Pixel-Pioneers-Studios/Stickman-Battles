'use strict';
// smb-menu-config.js — Custom weapons panel, stats log, weapon/class resolution
// Depends on: smb-globals.js, smb-data-weapons.js, smb-menu-select.js
// Must load AFTER smb-menu-select.js, BEFORE smb-menu-spawn.js

function openCustomWeaponsPanel() {
  const existing = document.getElementById('customWeaponsPanel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'customWeaponsPanel';
  panel.style.cssText = [
    'position:fixed','top:50%','left:50%','transform:translate(-50%,-50%)',
    'background:rgba(8,10,30,0.97)','border:1px solid rgba(100,150,255,0.35)',
    'border-radius:12px','padding:20px 24px','z-index:5000','min-width:320px',
    'max-width:480px','max-height:70vh','overflow-y:auto',
    'box-shadow:0 8px 40px rgba(0,0,0,0.8)',
    'font-family:"Segoe UI",Arial,sans-serif',
  ].join(';');

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'position:absolute;top:10px;right:14px;background:transparent;border:none;color:#667;font-size:1.1rem;cursor:pointer;';
  closeBtn.onclick = () => panel.remove();

  const title = document.createElement('h3');
  title.textContent = '⚒ Custom Weapons';
  title.style.cssText = 'margin:0 0 14px;font-size:1rem;color:#aaccff;letter-spacing:1px;';

  const currentKey = typeof loadCustomWeaponSelection === 'function' ? loadCustomWeaponSelection() : '';
  const weapons = window.CUSTOM_WEAPONS || {};
  const keys = Object.keys(weapons);

  if (keys.length === 0) {
    const empty = document.createElement('p');
    empty.style.cssText = 'color:#445;font-size:0.82rem;text-align:center;padding:20px 0;';
    empty.textContent = 'No custom weapons created yet. Use the Level Designer or the EVAL console command to create weapons.';
    panel.appendChild(closeBtn);
    panel.appendChild(title);
    panel.appendChild(empty);
    document.body.appendChild(panel);
    return;
  }

  // "None" option
  const noneCard = _cwCard('(none)', '', currentKey === '', () => {
    if (typeof saveCustomWeaponSelection === 'function') saveCustomWeaponSelection('');
    panel.remove(); openCustomWeaponsPanel();
  });
  panel.appendChild(closeBtn);
  panel.appendChild(title);
  panel.appendChild(noneCard);

  for (const key of keys) {
    const w = weapons[key];
    const card = _cwCard(key, w.description || w.type || '', currentKey === key, () => {
      if (typeof saveCustomWeaponSelection === 'function') saveCustomWeaponSelection(key);
      panel.remove(); openCustomWeaponsPanel();
    });
    panel.appendChild(card);
  }

  document.body.appendChild(panel);
}

function _cwCard(name, desc, active, onClick) {
  const card = document.createElement('div');
  card.style.cssText = [
    'display:flex','align-items:center','justify-content:space-between',
    'padding:9px 12px','margin-bottom:6px','border-radius:7px','cursor:pointer',
    `border:1px solid ${active ? 'rgba(80,160,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
    `background:${active ? 'rgba(30,60,120,0.55)' : 'rgba(10,12,30,0.4)'}`,
    'transition:background 0.12s',
  ].join(';');
  card.innerHTML = `<div>
    <div style="font-size:0.82rem;color:${active ? '#aacfff' : '#99aacc'};font-weight:600;">${name}</div>
    ${desc ? `<div style="font-size:0.66rem;color:#445;margin-top:2px;">${desc}</div>` : ''}
  </div>
  <div style="font-size:0.72rem;color:${active ? '#44aaff' : '#334'};">${active ? '✓ Equipped' : 'Equip'}</div>`;
  card.onclick = onClick;
  return card;
}

function toggleStatsLog() {
  const modal   = document.getElementById('statsLogModal');
  const content = document.getElementById('statsLogContent');
  if (!modal) return;
  if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }

  // Build HTML tables from game constants
  let html = '<h2 style="color:#cc00ee;margin-bottom:16px;letter-spacing:2px">STATS LOG — Stickman Evolution</h2>';

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
    ['Cosmic Axiom', '5000', 'Void arena (unlock secret letters)', 'Gravity flip, control invert, black holes, size shift, portal, floor removal'],
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
    ['Cosmic Axiom HP', '5000'], ['TF Speed', '4.2 (1.3× normal)'], ['TF KB Resist', '0.90'],
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
  modal.style.display = 'flex';
}

// Classes a 'random' class roll may land on. 'none' is never a valid result —
// rolling Random should always hand you an actual class. Knight is left out
// because it swaps the rolled weapon for its gauntlets. Falls back to every
// rollable class if the player's pool held nothing rollable.
function _isRollableClass(c) {
  return c !== 'none' && c !== 'random' && c !== 'megaknight' && !!CLASSES[c] && !CLASSES[c].styleLocked;
}
function _randomClassPickPool() {
  const all  = Object.keys(CLASSES).filter(_isRollableClass);
  const pool = randomClassPool ? [...randomClassPool].filter(_isRollableClass) : all;
  return pool.length ? pool : all;
}

function _pickFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Classes of one kind ('melee' | 'ranged') from the pool; when the player's
// pool holds none of that kind, any rollable class of that kind.
function _classPoolOfKind(cPool, kind) {
  const own = cPool.filter(c => classRollKind(c) === kind);
  if (own.length) return own;
  return Object.keys(CLASSES).filter(c => _isRollableClass(c) && classRollKind(c) === kind);
}

// Shared roll for both resolvers. The weapon always rolls first and the class
// follows its kind, so a sword never comes with Archer and a gun never with Thor.
//   both random  → random weapon, then a random class of the same kind
//   weapon only  → random weapon of the chosen class's kind (free-weapon classes take any)
//   class only   → random class of the chosen weapon's kind
// `weaponFilter` narrows the weapon pool (story mode uses it for its own rules).
function _rollLoadout(wVal, cVal, weaponFilter) {
  let wPool = randomWeaponPool ? [...randomWeaponPool] : WEAPON_KEYS.slice();
  if (weaponFilter) wPool = wPool.filter(weaponFilter);
  if (!wPool.length) wPool = ['sword'];
  const cPool = _randomClassPickPool();
  let weaponKey, classKey;

  if (wVal === 'random' && cVal === 'random') {
    weaponKey = _pickFrom(wPool);
    classKey  = _pickFrom(_classPoolOfKind(cPool, weaponRollKind(weaponKey)));
  } else if (wVal === 'random') {
    const _cls = CLASSES[cVal];
    const _kindPool = (_cls && _cls.weapon) ? wPool.filter(k => weaponRollKind(k) === classRollKind(cVal)) : wPool;
    weaponKey = _pickFrom(_kindPool.length ? _kindPool : wPool);
    classKey  = cVal;
  } else if (cVal === 'random') {
    weaponKey = wVal;
    classKey  = _pickFrom(_classPoolOfKind(cPool, weaponRollKind(wVal)));
  } else {
    weaponKey = wVal;
    classKey  = cVal;
  }
  return { weaponKey, classKey };
}

// Coordinated resolver — called once per player with BOTH select IDs.
// Returns { weaponKey, classKey }
function resolveWeaponAndClass(weaponSelectId, classSelectId, weaponFilter) {
  const wVal = document.getElementById(weaponSelectId)?.value || 'sword';
  const cVal = document.getElementById(classSelectId)?.value  || 'none';
  const _allowedCustomModes = new Set(['2p', 'training']);

  const { weaponKey: _w, classKey } = _rollLoadout(wVal, cVal, weaponFilter);
  let weaponKey = _w;

  // Custom weapon guard
  if (weaponKey && weaponKey.startsWith('_custom_') && !_allowedCustomModes.has(gameMode)) {
    weaponKey = 'sword';
  }

  return { weaponKey, classKey };
}

// Resolve weapon+class from raw values (not element IDs) — used by completeRandomizer
function resolveWeaponAndClassValues(wVal, cVal, weaponFilter) {
  return _rollLoadout(wVal, cVal, weaponFilter);
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
  return _pickFrom(_randomClassPickPool());
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
    if (!randomClassPool) randomClassPool = new Set(_randomClassPickPool());
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
// Loading-screen copy + which LoadScene to run behind it.
// `scene` keys are defined in js/smb-loadscreen.js. The old `image` field is
// gone: three AI stills used to cover six modes, and battleroyale/online fell
// through to the generic one. Subtitles say what the player is walking into
// rather than shouting the game's name back at them.
function _getLoadingInfo() {
  const mgNames = {
    survival: 'SURVIVAL', koth: 'KING OF THE HILL', chaos: 'CHAOS MATCH', sports: 'SPORTS ARENA'
  };
  const mgSubs = {
    survival: 'WAVE AFTER WAVE — LAST AS LONG AS YOU CAN',
    koth:     'HOLD THE ZONE. THEY WILL NOT LET YOU',
    chaos:    'EVERY RULE IS NEGOTIABLE',
    sports:   'NOBODY SAID NO WEAPONS'
  };
  // Fight Ladder: the card names the rung and the opponent you are about to face.
  const ld = gameMode === '2p' ? window._ladderNext : null;
  if (ld) return { title: `RUNG ${ld.rung + 1}`, subtitle: String(ld.name).toUpperCase(), scene: 'versus' };
  switch (gameMode) {
    case 'boss':
      return { title: 'BOSS FIGHT', subtitle: 'IT HAS BEEN WAITING', scene: 'boss' };
    case 'trueform':
      return { title: 'COSMIC AXIOM',  subtitle: 'THE RULES STOP APPLYING', scene: 'trueform' };
    case 'story':
      return { title: 'STORY MODE', subtitle: 'THE 95TH BEARER', scene: 'story' };
    case 'battleroyale':
      return { title: 'BATTLE ROYALE', subtitle: '94 BEARERS. ONE SURVIVOR', scene: 'battleroyale' };
    case 'minigames':
      return { title: minigameType === 'sports' && typeof SPORTS !== 'undefined' && SPORTS[sportsType]
                        ? SPORTS[sportsType].name : (mgNames[minigameType] || 'MINIGAME'),
               subtitle: mgSubs[minigameType] || 'GET READY', scene: 'minigames' };
    case 'training':
      return { title: 'TRAINING',   subtitle: 'NO STAKES. NO MERCY EITHER', scene: 'training' };
    case 'online':
    case 'storyonline':
      return { title: 'ONLINE MATCH', subtitle: 'SOMEONE ELSE IS AT THE OTHER END', scene: 'online' };
    default:
      return { title: 'VERSUS',     subtitle: 'SETTLE IT', scene: 'versus' };
  }
}

