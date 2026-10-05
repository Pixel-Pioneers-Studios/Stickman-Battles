'use strict';

// ============================================================
// MINIGAMES
// ============================================================
let minigameType      = 'survival'; // 'survival' | 'koth' | 'chaos' | 'sports' | 'defense'
let survivalWave      = 0;
let survivalEnemies   = [];         // alive enemies this wave
let survivalWaveDelay = 0;          // countdown to next wave
let survivalTeamMode  = true;       // true = co-op team, false = competitive last-standing
let survivalFriendlyFire = false;   // competitive enables friendly fire between players
let survivalWaveGoal  = 10;         // waves to beat in team mode (0 = infinite)
let survivalInfinite  = false;      // infinite waves in team mode
let kothPoints       = [0, 0];     // points for P1, P2
let kothTimer        = 0;          // game timer
let kothZoneX        = GAME_W / 2; // center of hill zone
let kothWinnerIdx    = -1;         // index into players[] of KotH winner; -1 = no winner yet

// --- Chaos modifiers ---
const CHAOS_MODS = [
  { id: 'giant',        label: '👾 GIANT',         desc: 'Players are huge' },
  { id: 'tiny',         label: '🐜 TINY',           desc: 'Players are tiny' },
  { id: 'moon',         label: '🌙 MOON GRAVITY',   desc: 'Low gravity' },
  { id: 'explosive',    label: '💥 EXPLOSIVE',      desc: 'Hits detonate' },
  { id: 'sudden_death', label: '☠ SUDDEN DEATH',   desc: 'Everyone starts at 1 HP' },
  { id: 'speedy',       label: '⚡ SPEEDY',          desc: 'Everyone moves faster' },
  { id: 'slippery',     label: '🧊 SLIPPERY',        desc: 'Ice-like floor friction' },
  { id: 'weapon_swap',  label: '🔀 WEAPON SWAP',    desc: 'Random weapon each wave' },
  { id: 'grav_storm',   label: '🌀 GRAVITY STORM',  desc: 'Gravity surges and drops' },
];
let currentChaosModifiers = new Set(); // active modifier ids this wave

// Gravity Storm: a smooth oscillating gravity multiplier read by Fighter physics.
// Stays exactly 1.0 whenever the modifier is off so no other mode is affected.
let chaosGravityMult  = 1.0;
let _chaosGravPhase   = 0;

// --- Nexus Defense ---
const DEFENSE_WAVE_GOAL = 10;
let defenseNexusHp    = 100;
let defenseNexusMaxHp = 100;
let defenseWave       = 0;
let defenseEnemies    = [];
let defenseWaveDelay  = 0;
// Rushers leave the gates one at a time instead of all on one frame, so a
// single defender can actually move between lanes.
let defenseSpawnQueue = [];   // [{ fromLeft }]
let defenseSpawnTimer = 0;
const DEFENSE_SPAWN_GAP   = 40;   // frames between releases
const DEFENSE_NEXUS_REGEN = 25;   // Nexus HP restored per cleared wave
const DEFENSE_CONTACT_DMG = 10;   // Nexus HP lost per rusher that reaches it
// Gate centres on the Nexus Bastion arena (drawNexusArena reads these too).
const NEXUS_GATE_L_X = 60;
const NEXUS_GATE_R_X = 1740;
// Every minigame that actually has a card and a system behind it. selectMinigame
// is reachable from the network layer (a host can broadcast a type), so unknown
// values are rejected here rather than setting minigameType to something no
// update/draw path handles.
const MINIGAME_TYPES = ['survival', 'koth', 'chaos', 'sports', 'defense'];

function selectMinigame(type) {
  // Soccer became one sport inside the Sports Arena; older hosts still send it.
  if (type === 'soccer') {
    type = 'sports';
    if (typeof selectSport === 'function') selectSport('soccer');
  }
  if (!MINIGAME_TYPES.includes(type)) {
    console.warn('[Minigames] Unknown minigame type:', type);
    return;
  }
  minigameType = type;
  document.querySelectorAll('#minigamePanel .mode-card').forEach(c => c.classList.remove('active'));
  const card = document.getElementById('mgCard' + type.charAt(0).toUpperCase() + type.slice(1));
  if (card) card.classList.add('active');
  // Show/hide survival sub-options
  const survOpts = document.getElementById('survivalOptions');
  if (survOpts) survOpts.style.display = type === 'survival' ? 'flex' : 'none';
  const sportsOpts = document.getElementById('sportsOptions');
  if (sportsOpts) sportsOpts.style.display = type === 'sports' ? 'flex' : 'none';
  // Refresh selectMode UI so P2 panel visibility toggles correctly
  selectMode('minigames');
}

function setSurvivalMode(isTeam) {
  survivalTeamMode     = isTeam;
  survivalFriendlyFire = !isTeam;
  document.getElementById('survModeTeam').classList.toggle('active', isTeam);
  document.getElementById('survModeComp').classList.toggle('active', !isTeam);
  document.getElementById('survTeamOptions').style.display  = isTeam ? 'flex' : 'none';
  document.getElementById('survCompOptions').style.display  = isTeam ? 'none' : 'block';
}

function setSurvivalGoal(waves) {
  survivalWaveGoal = waves;
  survivalInfinite = waves === 0;
  ['survWave10','survWave20','survWave30','survWaveInf'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('active');
  });
  const map = { 10:'survWave10', 20:'survWave20', 30:'survWave30', 0:'survWaveInf' };
  const btn = document.getElementById(map[waves]); if (btn) btn.classList.add('active');
}

// Chaos Match minigame — add one modifier every 15s during 1v1
let chaosMatchTimer = 0;
let _chaosModNotif = null; // { label, desc, timer }

function showChaosModNotification(mod) {
  _chaosModNotif = { label: mod.label, desc: mod.desc, timer: 150 };
}

function addOneChaosModifier() {
  // Get IDs not yet active
  const available = CHAOS_MODS.filter(m => !currentChaosModifiers.has(m.id));
  if (!available.length) return; // all already active
  const newMod = available[Math.floor(Math.random() * available.length)];
  // If at cap (10), remove a random existing one
  if (currentChaosModifiers.size >= 10) {
    const existing = [...currentChaosModifiers];
    const toRemove = existing[Math.floor(Math.random() * existing.length)];
    currentChaosModifiers.delete(toRemove);
  }
  currentChaosModifiers.add(newMod.id);
  // Survival only ever rolls 3 at once, so Chaos Match is where every modifier can stack
  if (currentChaosModifiers.size >= CHAOS_MODS.length && typeof unlockAchievement === 'function') unlockAchievement('chaos_all');
  // Apply modifier effects to current players
  applyChaosModifiers();
  // Show notification
  showChaosModNotification(newMod);
  // Update icon bar
  updateChaosModIcons();
}

function updateChaosMatch() {
  if (minigameType !== 'chaos') return;
  chaosMatchTimer++;

  // Gravity Storm swings between light (0.45x) and crushing (1.6x) on a ~7s cycle.
  if (currentChaosModifiers.has('grav_storm')) {
    _chaosGravPhase += 0.015;
    chaosGravityMult = 1.02 + Math.sin(_chaosGravPhase) * 0.58;
  } else {
    chaosGravityMult = 1.0;
    _chaosGravPhase  = 0;
  }

  if (chaosMatchTimer % 900 === 0 || chaosMatchTimer === 1) {
    addOneChaosModifier();
  }
}

function rollChaosModifiers() {
  clearChaosModifiers();
  const count = survivalWave >= 7 ? 3 : survivalWave >= 4 ? 2 : 1;
  const pool = [...CHAOS_MODS];
  for (let i = 0; i < count; i++) {
    if (!pool.length) break;
    const idx = Math.floor(Math.random() * pool.length);
    currentChaosModifiers.add(pool.splice(idx, 1)[0].id);
  }
  applyChaosModifiers();
  // Show modifier banners
  const labels = [...currentChaosModifiers].map(id => CHAOS_MODS.find(m => m.id === id)?.label || id).join('  ');
  if (labels) damageTexts.push(new DamageText(GAME_W / 2, 120, labels, '#ff88ff'));
}

function applyChaosModifiers() {
  const humanPlayers = players.filter(p => !p.isBoss);
  humanPlayers.forEach(p => {
    // Idempotent: never overwrite a saved original with an already-scaled value
    // (Chaos Match applies modifiers repeatedly without clearing in between —
    // re-saving caused unbounded hitbox drift across waves).
    if (p._chaosOrigW === undefined) { p._chaosOrigW = p.w; p._chaosOrigH = p.h; }
    if (p._chaosOrigDrawScale === undefined) p._chaosOrigDrawScale = p.drawScale || 1;
    if (currentChaosModifiers.has('giant'))  { p.w = Math.floor(p.w * 1.55); p.h = Math.floor(p.h * 1.55); p.drawScale = (p._chaosOrigDrawScale || 1) * 1.55; }
    if (currentChaosModifiers.has('tiny'))   { p.w = Math.floor(p.w * 0.55); p.h = Math.floor(p.h * 0.55); p.drawScale = (p._chaosOrigDrawScale || 1) * 0.55; }
    if (currentChaosModifiers.has('sudden_death')) p.health = 1;
    if (currentChaosModifiers.has('weapon_swap') && WEAPON_KEYS.length) {
      const newKey = randChoice(WEAPON_KEYS);
      p.weaponKey = newKey; p.weapon = Object.assign({}, WEAPONS[newKey]);
    }
  });
}

function clearChaosModifiers() {
  players.filter(p => !p.isBoss).forEach(p => {
    if (p._chaosOrigW !== undefined) { p.w = p._chaosOrigW; p.h = p._chaosOrigH; delete p._chaosOrigW; delete p._chaosOrigH; }
    if (p._chaosOrigDrawScale !== undefined) { p.drawScale = p._chaosOrigDrawScale; delete p._chaosOrigDrawScale; }
  });
  currentChaosModifiers.clear();
  chaosGravityMult = 1.0;
  _chaosGravPhase  = 0;
  updateChaosModIcons();
}

function updateChaosModIcons() {
  const bar = document.getElementById('chaosModIcons');
  const tip = document.getElementById('chaosModTooltip');
  if (!bar) return;
  if (minigameType !== 'chaos' || !gameRunning || gameMode !== 'minigames') { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = '';
  for (const id of currentChaosModifiers) {
    const mod = CHAOS_MODS.find(m => m.id === id);
    if (!mod) continue;
    const icon = document.createElement('div');
    icon.style.cssText = 'width:36px;height:36px;background:rgba(0,0,0,0.7);border:1px solid #ff88ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:default;';
    icon.textContent = mod.label.split(' ')[0]; // emoji part
    icon.title = mod.desc;
    icon.addEventListener('mouseenter', e => {
      if (!tip) return;
      tip.textContent = `${mod.label}: ${mod.desc}`;
      tip.style.display = 'block';
      tip.style.left = (e.clientX + 10) + 'px';
      tip.style.top  = (e.clientY - 30) + 'px';
    });
    icon.addEventListener('mousemove', e => {
      if (!tip) return;
      tip.style.left = (e.clientX + 10) + 'px';
      tip.style.top  = (e.clientY - 30) + 'px';
    });
    icon.addEventListener('mouseleave', () => { if (tip) tip.style.display = 'none'; });
    bar.appendChild(icon);
  }
}

function initMinigame() {
  // Clear defense-mode properties that bleed across matches if not cleaned up here
  players.forEach(function(p) {
    if (!p.isBoss) {
      delete p.attackCooldownMult;
      delete p._nexusKBBoost;
    }
  });
  survivalWave      = 0;
  survivalEnemies   = [];
  survivalWaveDelay = 180; // 3s before first wave
  // survivalTeamMode / survivalFriendlyFire / survivalWaveGoal / survivalInfinite keep their menu values
  clearChaosModifiers();
  kothPoints        = [0, 0];
  kothTimer         = 0;
  kothZoneX         = GAME_W / 2;
  kothWinnerIdx     = -1;
  chaosMatchTimer = 0;
  if (minigameType === 'sports' && typeof initSports === 'function') initSports();
  if (minigameType === 'chaos') {
    // Reset all players to standard settings; updateChaosMatch will add first mod on frame 1
    clearChaosModifiers();
  }
  if (minigameType === 'defense') {
    defenseNexusHp    = 100;
    defenseNexusMaxHp = 100;
    defenseWave       = 0;
    defenseEnemies    = [];
    defenseSpawnQueue = [];
    defenseSpawnTimer = 0;
    defenseWaveDelay  = 210; // 3.5s before first wave
    const _floorPl = typeof currentArena !== 'undefined' && currentArena && currentArena.platforms &&
                     currentArena.platforms.find(function(p) { return p.isFloor; });
    defenseNexusX = (currentArena && currentArena.worldWidth) ? currentArena.worldWidth / 2 : GAME_W / 2;
    defenseNexusY = _floorPl ? _floorPl.y : GAME_H - 80;
    // Start the defender beside the Nexus, not at the arena's left spawn —
    // on the Bastion that is 800px from the thing being defended.
    players.forEach(function(p, i) {
      if (p.isBoss) return;
      p.x = defenseNexusX + (i === 0 ? -90 : 60) - p.w / 2;
      p.y = defenseNexusY - p.h - 2;
      p.spawnX = p.x; p.spawnY = defenseNexusY;
    });
    // Defense mode: faster attacking, bigger knockback for player(s)
    players.forEach(function(p) {
      if (!p.isBoss) {
        p.attackCooldownMult = 0.55; // 45% shorter attack cooldowns
        p._nexusKBBoost      = true;  // flag read by dealDamage
      }
    });
  }
}

function spawnSurvivalWave() {
  survivalWave++;
  // Wave 1 = 1 enemy (easy), scales up to max 5 enemies
  const waveSize = Math.min(1 + Math.floor(survivalWave / 2), 5);
  const diff     = survivalWave <= 3 ? 'easy' : survivalWave <= 6 ? 'medium' : 'hard';
  const targets  = players.filter(p => !p.isBoss && p.health > 0);
  if (!targets.length) return;
  for (let i = 0; i < waveSize; i++) {
    const bx  = i % 2 === 0 ? 60 + Math.random() * 80 : GAME_W - 60 - Math.random() * 80;
    const bot = new Fighter(bx, 200, `hsl(${Math.random()*360},65%,55%)`, randChoice(WEAPON_KEYS),
      { left:null, right:null, jump:null, attack:null, ability:null, super:null }, true, diff);
    bot.name     = `W${survivalWave}#${i + 1}`;
    bot.lives    = 1;
    bot.personality = randChoice(['aggressive', 'defensive', 'trickster', 'sniper']);
    bot.dmgMult  = Math.min(0.5 + survivalWave * 0.06, 1.0); // starts at 0.56x, scales to 1x by wave 8+
    bot.target   = targets[i % targets.length];
    bot.playerNum = 2;
    minions.push(bot);
    survivalEnemies.push(bot);
  }
  // Survival wave achievements
  if (survivalWave >= 5)  unlockAchievement('wave_5');
  if (survivalWave >= 10) unlockAchievement('wave_10');
  if (currentChaosModifiers.size >= 3) unlockAchievement('chaos_survivor');
  if (currentChaosModifiers.size >= CHAOS_MODS.length) unlockAchievement('chaos_all');
  // Give all players brief invincibility at wave start so they aren't immediately hit
  players.forEach(p => { if (!p.isBoss) p.invincible = Math.max(p.invincible, 90); });
  damageTexts.push(new DamageText(GAME_W / 2, 80, `WAVE ${survivalWave}!`, '#ffdd44'));
  screenShake = Math.max(screenShake, 8);
  SoundManager.waveStart();
  rollChaosModifiers();
}

function spawnDefenseWave() {
  defenseWave++;
  const waveSize = Math.min(1 + Math.floor(defenseWave * 0.6), 6);
  // Alternate sides, starting from a random one, so both lanes stay live.
  const _firstLeft = Math.random() < 0.5;
  for (let i = 0; i < waveSize; i++) defenseSpawnQueue.push({ fromLeft: (i % 2 === 0) === _firstLeft });
  defenseSpawnTimer = 0;
  const _tx = typeof defenseNexusX !== 'undefined' ? defenseNexusX : GAME_W / 2;
  damageTexts.push(new DamageText(_tx, 80, `WAVE ${defenseWave}!`, '#ff8844'));
  screenShake = Math.max(screenShake, 6);
  if (typeof SoundManager !== 'undefined' && SoundManager.waveStart) SoundManager.waveStart();
}

function _releaseDefenseRusher(fromLeft) {
  const speed = Math.min(1.1 + defenseWave * 0.1, 2.4); // rushers get faster each wave
  const _wide = currentArena && currentArena.worldWidth;
  const gateX = _wide ? (fromLeft ? NEXUS_GATE_L_X : NEXUS_GATE_R_X)
                      : (fromLeft ? 50 : GAME_W - 50);
  const bot = new Fighter(gateX, 80, `hsl(${10 + Math.random() * 25},85%,50%)`, randChoice(WEAPON_KEYS),
    { left: null, right: null, jump: null, attack: null, ability: null, super: null }, false, 'easy');
  bot.x = gateX - bot.w / 2;
  const _floorPl = currentArena && currentArena.platforms && currentArena.platforms.find(function(p) { return p.isFloor; });
  if (_floorPl) bot.y = _floorPl.y - bot.h - 2;
  bot.name        = 'Rusher';
  bot.lives       = 1;
  // A full 150-HP fighter per rusher made wave 4 (4 rushers, 600 HP) outrun any
  // single defender. Rushers are fodder that scales gently instead.
  bot.maxHealth   = 40 + defenseWave * 6;
  bot.health      = bot.maxHealth;
  bot.dmgMult     = 0;    // rushers deal no combat damage — they only damage the nexus on contact
  bot._defenseRusher = true;
  bot._defenseSpeed  = speed; // always positive — direction computed from position each frame
  bot._defenseFromLeft = fromLeft;
  bot._defenseLastHp   = bot.health;
  bot._defenseStagger  = 0;
  bot.playerNum   = 3;    // enemy faction colour (red tint from playerNum = 3 styling)
  minions.push(bot);
  defenseEnemies.push(bot);
  if (typeof spawnParticles === 'function') spawnParticles(gateX, bot.y + bot.h / 2, '#ff5530', 10);
}

function updateMinigame() {
  if (!gameRunning) return;
  const livePlayers = players.filter(p => !p.isBoss && (p.health > 0 || p.invincible > 0));
  if (!livePlayers.length) return;

  if (minigameType === 'survival') {
    survivalEnemies = survivalEnemies.filter(e => e.health > 0);
    // Keep enemy targets pointed at a living player
    const liveTargets = players.filter(p => !p.isBoss && p.health > 0);
    survivalEnemies.forEach((e, i) => { if (liveTargets.length) e.target = liveTargets[i % liveTargets.length]; });
    // In team mode, bot players also need targets pointing at survival enemies
    if (survivalTeamMode) {
      const liveEnemies = survivalEnemies.filter(e => e.health > 0);
      players.forEach(p => {
        if (p.isAI && !p.isBoss && liveEnemies.length > 0) {
          const nearest = liveEnemies.reduce((best, e) => dist(p, e) < dist(p, best) ? e : best);
          p.target = nearest;
        }
      });
    }

    // --- Competitive: check if only one human player remains ---
    if (survivalFriendlyFire) {
      const humanAlive = players.filter(p => !p.isBoss && !p.isAI && p.health > 0);
      if (humanAlive.length === 1 && players.filter(p => !p.isBoss && !p.isAI).length > 1) {
        // One survivor wins — clear enemies, award win
        minions.forEach(m => { m.health = 0; });
        survivalEnemies = [];
        damageTexts.push(new DamageText(GAME_W / 2, 120, `${humanAlive[0].name} WINS!`, '#ffdd44'));
        clearChaosModifiers();
        setTimeout(endGame, 2000);
        return;
      }
    }

    if (survivalWaveDelay > 0) {
      survivalWaveDelay--;
      if (survivalWaveDelay === 0) spawnSurvivalWave();
    } else if (survivalEnemies.length === 0 && minions.filter(m => m.health > 0).length === 0) {
      // Wave cleared — heal (team mode heals everyone; competitive must not
      // revive rival bots between waves)
      players.forEach(p => { if (!p.isBoss && (survivalTeamMode || p.health > 0)) p.health = Math.min(p.maxHealth, p.health + 25); });
      survivalWaveDelay = 210;

      const waveGoal = survivalInfinite ? Infinity : survivalWaveGoal;
      if (survivalWave >= waveGoal) {
        // Goal reached!
        const msg = survivalInfinite ? `WAVE ${survivalWave} CLEARED!` : `YOU WIN! ALL ${survivalWaveGoal} WAVES!`;
        damageTexts.push(new DamageText(GAME_W / 2, 120, msg, '#44ff88'));
        clearChaosModifiers();
        if (!survivalInfinite) {
          unlockAchievement('survival_win');
          setTimeout(endGame, 2500);
          return;
        }
        survivalWave = 0; // infinite: keep going
      }
    }
  } else if (minigameType === 'koth') {
    kothTimer++;
    const p1 = players[0], p2 = players[1];
    // Check who's in the zone (200px wide centered on kothZoneX)
    const zoneLeft = kothZoneX - 100, zoneRight = kothZoneX + 100;
    const p1InZone = p1 && p1.health > 0 && p1.cx() > zoneLeft && p1.cx() < zoneRight && p1.onGround;
    const p2InZone = p2 && p2.health > 0 && p2.cx() > zoneLeft && p2.cx() < zoneRight && p2.onGround;
    if (p1InZone && !p2InZone) kothPoints[0]++;
    if (p2InZone && !p1InZone) kothPoints[1]++;
    // Win at 1800 frames (30 seconds of uncontested zone)
    const WIN_FRAMES = 1800;
    if (kothPoints[0] >= WIN_FRAMES || kothPoints[1] >= WIN_FRAMES) {
      kothWinnerIdx = kothPoints[0] >= WIN_FRAMES ? 0 : 1;
      setTimeout(endGame, 600);
    }
  } else if (minigameType === 'chaos') {
    updateChaosMatch();
    // Chaos match is just 1v1 — no special logic, just let normal 2P combat happen with modifiers
  } else if (minigameType === 'defense') {
    defenseEnemies = defenseEnemies.filter(function(e) { return e.health > 0; });

    // Drive each rusher toward the nexus and check for contact
    var _nexusReached = false;
    for (var _di = 0; _di < defenseEnemies.length; _di++) {
      var _de = defenseEnemies[_di];
      if (!_de || _de.health <= 0) continue;

      // A hit staggers the rusher. Steering used to overwrite vx every frame,
      // which erased every hit's knockback on the very next frame.
      if (_de.health < _de._defenseLastHp) _de._defenseStagger = 26;
      _de._defenseLastHp = _de.health;
      if (_de._defenseStagger > 0) _de._defenseStagger--;
      var _toDx = defenseNexusX - _de.cx();
      // While staggered or stunned the knockback carries and friction bleeds
      // it off; afterwards the rusher resumes its march at full speed.
      if (_de._defenseStagger <= 0 && !(_de.stunTimer > 0)) {
        _de.vx = (_toDx >= 0 ? 1 : -1) * (_de._defenseSpeed || 2.0);
      }

      // Ring-out: a rusher knocked back through its own gate is banished.
      if (currentArena && currentArena.worldWidth && _de._defenseStagger > 0 &&
          ((_de._defenseFromLeft && _de.cx() < NEXUS_GATE_L_X - 10) ||
           (!_de._defenseFromLeft && _de.cx() > NEXUS_GATE_R_X + 10))) {
        if (typeof spawnParticles === 'function') spawnParticles(_de.cx(), _de.cy(), '#ffcc66', 16);
        damageTexts.push(new DamageText(_de.cx(), _de.y - 10, 'BANISHED', '#ffcc66'));
        _de.health = 0;
        continue;
      }

      // Contact check: rusher bottom touches nexus base
      var _ddx = Math.abs(_de.cx() - defenseNexusX);
      var _ddy = Math.abs((_de.y + (_de.h || 50)) - defenseNexusY);
      if (_ddx < 50 && _ddy < 60) {
        defenseNexusHp -= DEFENSE_CONTACT_DMG;
        _de.health = 0;
        screenShake = Math.max(screenShake, 14);
        if (typeof spawnParticles === 'function') spawnParticles(defenseNexusX, defenseNexusY - 30, '#ff4422', 14);
        if (defenseNexusHp <= 0) {
          defenseNexusHp = 0;
          _nexusReached = true;
        }
      }
    }

    if (_nexusReached) {
      damageTexts.push(new DamageText(defenseNexusX, GAME_H / 2 - 40, 'NEXUS DESTROYED!', '#ff2200'));
      clearChaosModifiers();
      setTimeout(endGame, 2500);
      return;
    }

    // Release queued rushers one at a time
    if (defenseSpawnQueue.length > 0) {
      if (defenseSpawnTimer > 0) defenseSpawnTimer--;
      else {
        _releaseDefenseRusher(defenseSpawnQueue.shift().fromLeft);
        defenseSpawnTimer = DEFENSE_SPAWN_GAP;
      }
    }

    // Wave timer / spawn next wave
    if (defenseWaveDelay > 0) {
      defenseWaveDelay--;
      if (defenseWaveDelay === 0) spawnDefenseWave();
    } else if (defenseSpawnQueue.length === 0 && defenseEnemies.filter(function(e) { return e.health > 0; }).length === 0) {
      // Wave cleared — repair the Nexus and queue next. (Rushers deal no
      // combat damage, so the old player heal here did nothing.)
      defenseNexusHp = Math.min(defenseNexusMaxHp, defenseNexusHp + DEFENSE_NEXUS_REGEN);
      if (defenseWave >= 5) unlockAchievement('nexus_defender');
      if (defenseWave >= DEFENSE_WAVE_GOAL) {
        damageTexts.push(new DamageText(defenseNexusX, 110, `NEXUS DEFENDED!  ${DEFENSE_WAVE_GOAL} WAVES!`, '#44ff88'));
        unlockAchievement('nexus_defender');
        setTimeout(endGame, 2500);
        return;
      }
      damageTexts.push(new DamageText(defenseNexusX, 110, 'Wave cleared!  Nexus +' + DEFENSE_NEXUS_REGEN, '#44ff88'));
      defenseWaveDelay = 240;
    }
  }
}

// Renamed off `drawDefenseNexus` — smb-story-engine-modes.js defines that name
// too and loads LATER, so this body never ran and the Defense minigame drew no
// nexus at all. The two are not interchangeable: this one reads defenseNexusHp,
// the story one reads defenseNexusHP.
function drawMinigameDefenseNexus() {
  if (!gameRunning || minigameType !== 'defense') return;
  var _cx = defenseNexusX, _cy = defenseNexusY;
  var _hpFrac = Math.max(0, defenseNexusHp / defenseNexusMaxHp);
  var _pulse  = 0.88 + 0.12 * Math.sin(typeof frameCount !== 'undefined' ? frameCount * 0.06 : 0);
  var _col    = _hpFrac > 0.5 ? '#44aaff' : _hpFrac > 0.25 ? '#ffaa22' : '#ff4422';

  ctx.save();

  // Outer glow
  var _grd = ctx.createRadialGradient(_cx, _cy - 30, 4, _cx, _cy - 30, 48 * _pulse);
  _grd.addColorStop(0, _col + 'bb');
  _grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = _grd;
  ctx.beginPath();
  ctx.arc(_cx, _cy - 30, 48 * _pulse, 0, Math.PI * 2);
  ctx.fill();

  // Crystal (diamond shape)
  ctx.fillStyle = _col;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(_cx,      _cy - 62); // tip
  ctx.lineTo(_cx + 22, _cy - 30); // right shoulder
  ctx.lineTo(_cx,      _cy);      // base
  ctx.lineTo(_cx - 22, _cy - 30); // left shoulder
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner highlight shard
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(_cx - 2,  _cy - 58);
  ctx.lineTo(_cx + 10, _cy - 36);
  ctx.lineTo(_cx - 6,  _cy - 36);
  ctx.closePath();
  ctx.fill();

  // HP bar
  var _barW = 80, _barH = 8;
  var _bx = _cx - _barW / 2, _by = _cy - 82;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(_bx - 1, _by - 1, _barW + 2, _barH + 2);
  ctx.fillStyle = _hpFrac > 0.5 ? '#44ff88' : _hpFrac > 0.25 ? '#ffaa22' : '#ff4422';
  ctx.fillRect(_bx, _by, _barW * _hpFrac, _barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(_bx, _by, _barW, _barH);

  // Label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  ctx.fillText('NEXUS', _cx, _by - 4);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawMinigameHUD() {
  if (!gameRunning) return;
  ctx.save();
  // Pin to the screen. This ran under the camera transform, so on any zoomed
  // or scrolled view the wave counter floated somewhere in the world.
  ctx.setTransform(canvas.width / GAME_W, 0, 0, canvas.height / GAME_H, 0, 0);
  if (minigameType === 'sports') {
    if (typeof drawSportsHUD === 'function') drawSportsHUD();
  } else if (minigameType === 'survival') {
    ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    const waveGoalStr = survivalFriendlyFire ? '⚔' : survivalInfinite ? '∞' : `/${survivalWaveGoal}`;
    ctx.fillText(`Wave ${survivalWave}${waveGoalStr} — Enemies: ${survivalEnemies.filter(e=>e.health>0).length}`, GAME_W / 2, GAME_H - 20);
    if (survivalWaveDelay > 0) {
      ctx.fillStyle = '#aaffaa'; ctx.font = 'bold 18px Arial';
      ctx.fillText(`Next wave in ${Math.ceil(survivalWaveDelay / 60)}s`, GAME_W / 2, GAME_H - 44);
    }
    // Chaos modifier badges
    if (currentChaosModifiers.size > 0) {
      const mods = [...currentChaosModifiers].map(id => CHAOS_MODS.find(m => m.id === id)?.label || id);
      ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
      mods.forEach((lbl, i) => {
        const pulse = 0.75 + 0.25 * Math.sin(frameCount * 0.1 + i);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ff88ff';
        ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 8;
        ctx.fillText(lbl, GAME_W - 8, GAME_H - 20 - i * 16);
        ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
    }
  } else if (minigameType === 'defense') {
    ctx.fillStyle = '#ff8844'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    var _defAlive = defenseEnemies.filter(function(e) { return e.health > 0; }).length + defenseSpawnQueue.length;
    ctx.fillText('Wave ' + defenseWave + '  —  Enemies: ' + _defAlive, GAME_W / 2, GAME_H - 20);
    if (defenseWaveDelay > 0 && defenseWave === 0) {
      ctx.fillStyle = '#aaffaa'; ctx.font = 'bold 18px Arial';
      ctx.fillText('Protect the Nexus!  Starting in ' + Math.ceil(defenseWaveDelay / 60) + 's', GAME_W / 2, GAME_H - 44);
    } else if (defenseWaveDelay > 0) {
      ctx.fillStyle = '#aaffaa'; ctx.font = 'bold 18px Arial';
      ctx.fillText('Next wave in ' + Math.ceil(defenseWaveDelay / 60) + 's', GAME_W / 2, GAME_H - 44);
    }
  } else if (minigameType === 'koth') {
    // Draw zone indicator
    const zoneLeft = kothZoneX - 100;
    ctx.fillStyle = 'rgba(255,220,0,0.10)';
    ctx.fillRect(zoneLeft, 0, 200, GAME_H);
    ctx.strokeStyle = 'rgba(255,220,0,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.strokeRect(zoneLeft + 1, 0, 198, GAME_H);
    ctx.setLineDash([]);
    // Zone label
    ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.fillText('KING ZONE', kothZoneX, 62);
    ctx.shadowBlur = 0;
    // Top score bar — drawn in screen space so it stays fixed below the DOM HUD
    const p1 = players[0], p2 = players[1];
    const WIN_FRAMES = 1800;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const _khy = (typeof _hudBottom === 'function' ? _hudBottom() : 0) + 8;
    [p1, p2].forEach((p, i) => {
      if (!p) return;
      const pts = kothPoints[i];
      const barW = 130, barH = 10;
      const bx = i === 0 ? 20 : canvas.width - 20 - barW;
      const by = _khy;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = p.color;
      ctx.fillRect(bx, by, barW * (pts / WIN_FRAMES), barH);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial';
      ctx.textAlign = i === 0 ? 'left' : 'right';
      const tx = i === 0 ? bx : bx + barW;
      ctx.fillText(`${p.name}  ${Math.floor(pts / 60)}s / 30s`, tx, by + 22);
    });
    ctx.restore();
    // Time-in-zone counter ABOVE each player's head (game/camera space)
    [p1, p2].forEach((p, i) => {
      if (!p || p.health <= 0) return;
      const t = Math.floor(kothPoints[i] / 60);
      if (t === 0) return;
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Arial';
      ctx.fillStyle = p.color;
      ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
      ctx.fillText(`${t}s`, p.cx(), p.y - 22);
      ctx.shadowBlur = 0;
    });
  }
  ctx.restore();
}

function confirmResetProgress() {
  // Wipe ALL localStorage keys — both smc_ prefixed and the consolidated save blob
  localStorage.clear();
  // The beforeunload/visibilitychange flush in smb-save.js (and GameState.save)
  // would write the in-memory save straight back before the reload lands, so
  // the wipe silently undid itself. Nothing may touch storage from here on.
  window.__SMB_WIPING__ = true;
  try { Storage.prototype.setItem = function() {}; } catch (e) {}

  // Flash confirmation then reload the page so all in-memory state resets too
  const msg = document.createElement('div');
  msg.textContent = 'All progress wiped. Reloading...';
  msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.95);color:#ffaa44;padding:16px 28px;border-radius:8px;font-size:1.1rem;font-weight:bold;z-index:9999;pointer-events:none';
  document.body.appendChild(msg);
  setTimeout(() => { location.reload(); }, 1200);
}

// ============================================================
// ETERNAL DAMNATION ARC — wave management + escape system
// ============================================================

function spawnDamnationWave() {
  if (!damnationActive) return;
  const wave = damnationCheckpoint > damnationWave ? damnationCheckpoint : damnationWave;
  damnationWave = wave;

  // Remove any remaining echo fighters from the previous wave
  players = players.filter(p => !p.isEcho);

  if (wave === 0) {
    // Wave 1: three minion echoes — all on team 99 so they don't attack each other
    for (let i = 0; i < 3; i++) {
      const echo = new Minion(200 + i * 200, 300);
      echo.isEcho = true;
      echo._teamId = 99;
      echo.color = '#880000';
      echo.health = 150;
      echo.maxHealth = 150;
      echo.lives = 1; // echoes die once — no respawn
      echo.target = players[0] || null;
      players.push(echo);
    }
  } else if (wave === 1) {
    // Wave 2: one Boss echo
    const echoB = new Boss();
    echoB.isEcho = true;
    echoB._teamId = 99;
    echoB.color = '#770000';
    echoB.health = 1200;
    echoB.maxHealth = 1200;
    echoB.lives = 1; // echoes die once — no respawn
    echoB.target = players[0] || null;
    // Suppress mid-fight cinematics on echo boss
    ['75', 'paradox50', '40', '10'].forEach(k => echoB._cinematicFired.add(k));
    players.push(echoB);
    if (players[0]) players[0].target = echoB;
  } else if (wave === 2) {
    // Wave 3: one TrueForm echo
    const echoTF = new TrueForm();
    echoTF.isEcho = true;
    echoTF._teamId = 99;
    echoTF.color = '#660000';
    echoTF.health = 2500;
    echoTF.maxHealth = 2500;
    echoTF.lives = 1; // echoes die once — no respawn
    echoTF.target = players[0] || null;
    // Story scale: reduce damage output on echo
    echoTF.dmgMult = 0.6;
    // Suppress intro + all threshold cinematics
    ['entry', 'qte75', '50', 'paradox1000', 'qte25', '15'].forEach(k =>
      echoTF._cinematicFired.add(k));
    players.push(echoTF);
    if (players[0]) players[0].target = echoTF;
  }
}

function updateDamnation() {
  if (!damnationActive) return;
  const p1 = players[0];
  if (!p1) return;

  // Pulse timer for visual effects
  damnationPulse = (damnationPulse + 1) % 120;

  // Wave 0 → 1: all minion echoes dead
  if (damnationWave === 0) {
    const minionEchoes = players.filter(p => p.isEcho && !p.isBoss && !p.isTrueForm);
    if (minionEchoes.length > 0 && minionEchoes.every(p => p.health <= 0 || p.isDead)) {
      damnationWave = 1;
      spawnDamnationWave();
    }
  // Wave 1 → 2: boss echo dead
  } else if (damnationWave === 1) {
    const bossEchoes = players.filter(p => p.isEcho && p.isBoss);
    if (bossEchoes.length > 0 && bossEchoes.every(p => p.health <= 0 || p.isDead)) {
      damnationWave = 2;
      spawnDamnationWave();
    }
  // Wave 2 done: TrueForm echo dead — orb/portal system handles victory from here
  } else if (damnationWave === 2) {
    const tfEchoes = players.filter(p => p.isEcho && p.isTrueForm);
    if (tfEchoes.length > 0 && tfEchoes.every(p => p.health <= 0 || p.isDead)) {
      damnationWave = 3; // mark complete so this doesn't re-fire
    }
  }

  // Collect anchor orbs
  for (let i = damnationAnchorOrbs.length - 1; i >= 0; i--) {
    const orb = damnationAnchorOrbs[i];
    orb.frame++;
    const dx = p1.cx() - orb.x;
    const dy = (p1.y + p1.h / 2) - orb.y;
    if (Math.sqrt(dx * dx + dy * dy) < 50) {
      damnationAnchors++;
      if (typeof SoundManager !== 'undefined' && SoundManager.pickup) SoundManager.pickup();
      damnationAnchorOrbs.splice(i, 1);
      // Open portal once 8 anchors collected
      if (!damnationPortalActive && damnationAnchors >= 8) {
        damnationPortalActive = true;
        damnationPortal = { x: GAME_W / 2, y: 200, frame: 0 };
        if (typeof SoundManager !== 'undefined') {
          if (SoundManager.phaseUp)   SoundManager.phaseUp();
          if (SoundManager.portalOpen) SoundManager.portalOpen();
        }
      }
    }
  }

  // Check portal escape
  if (damnationPortalActive && damnationPortal) {
    damnationPortal.frame++;
    const dx = p1.cx() - damnationPortal.x;
    const dy = (p1.y + p1.h / 2) - damnationPortal.y;
    if (Math.sqrt(dx * dx + dy * dy) < 50) {
      escapeDamnation();
    }
  }
}

function escapeDamnation() {
  if (damnationEscaped) return;
  damnationEscaped = true;
  damnationActive  = false;
  // Flash white to signal escape
  if (typeof screenFlash === 'function') screenFlash('#ffffff', 20);
  if (typeof SoundManager !== 'undefined' && SoundManager.superActivate) SoundManager.superActivate();
  // Remove all echo fighters
  players = players.filter(p => !p.isEcho);
  // End the match — story engine will advance to Ch. 93
  if (typeof endGame === 'function') {
    const p1 = players[0];
    endGame(p1 ? p1.playerNum : 1);
  }
}
