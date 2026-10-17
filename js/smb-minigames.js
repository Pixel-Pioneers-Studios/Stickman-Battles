'use strict';

// Survival, KotH, Chaos Match and Defense minigames.
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
// endGame() reads this for the banner and winner. The guard stops a condition that stays true
// for several frames from scheduling endGame() every frame.
let minigameResult   = null;       // { text, color, winner }

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

// Gravity Storm: oscillating gravity multiplier read by Fighter physics.
// Exactly 1.0 when off, so other modes are unaffected.
let chaosGravityMult  = 1.0;
let _chaosGravPhase   = 0;

const DEFENSE_WAVE_GOAL = 10;
let defenseNexusHp    = 100;
let defenseNexusMaxHp = 100;
let defenseWave       = 0;
let defenseEnemies    = [];
let defenseWaveDelay  = 0;
// Rushers leave one at a time, so one defender can move between lanes.
let defenseSpawnQueue = [];   // [{ fromLeft }]
let defenseSpawnTimer = 0;
const DEFENSE_SPAWN_GAP   = 40;   // frames between releases on wave 1; shrinks per wave
const DEFENSE_NEXUS_REGEN = 25;   // Nexus HP restored per cleared wave
const DEFENSE_CONTACT_DMG = 10;   // Nexus HP lost per rusher that reaches it
const DEFENSE_BRUTE_DMG   = 15;   // ...and per brute
// Gate centres on the Nexus Bastion arena (drawNexusArena reads these too).
const NEXUS_GATE_L_X = 60;
const NEXUS_GATE_R_X = 1740;
// Valid minigame types. selectMinigame can be called from the network, so reject unknown values.
const MINIGAME_TYPES = ['survival', 'koth', 'chaos', 'sports', 'defense'];

function selectMinigame(type) {
  // Older hosts still send 'soccer'. It is a sport inside the Sports Arena now.
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
  const survOpts = document.getElementById('survivalOptions');
  if (survOpts) survOpts.style.display = type === 'survival' ? 'flex' : 'none';
  const sportsOpts = document.getElementById('sportsOptions');
  if (sportsOpts) sportsOpts.style.display = type === 'sports' ? 'flex' : 'none';
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

// Chaos Match: one modifier every 15s in 1v1.
let chaosMatchTimer = 0;
let _chaosModNotif = null; // { label, desc, timer }

function showChaosModNotification(mod) {
  _chaosModNotif = { label: mod.label, desc: mod.desc, timer: 150 };
}

function addOneChaosModifier() {
  const available = CHAOS_MODS.filter(m => !currentChaosModifiers.has(m.id));
  if (!available.length) return;
  const newMod = available[Math.floor(Math.random() * available.length)];
  if (currentChaosModifiers.size >= 10) {
    const existing = [...currentChaosModifiers];
    const toRemove = existing[Math.floor(Math.random() * existing.length)];
    currentChaosModifiers.delete(toRemove);
  }
  currentChaosModifiers.add(newMod.id);
  // Survival rolls 3 modifiers at once. Chaos Match stacks them all.
  if (currentChaosModifiers.size >= CHAOS_MODS.length && typeof unlockAchievement === 'function') unlockAchievement('chaos_all');
  applyChaosModifiers(newMod.id);
  showChaosModNotification(newMod);
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
  // Survival's wave modifiers are what the menu's Chaos Mode toggle turns on.
  if (typeof chaosMode === 'undefined' || !chaosMode) return;
  const count = survivalWave >= 7 ? 3 : survivalWave >= 4 ? 2 : 1;
  const pool = [...CHAOS_MODS];
  for (let i = 0; i < count; i++) {
    if (!pool.length) break;
    const idx = Math.floor(Math.random() * pool.length);
    currentChaosModifiers.add(pool.splice(idx, 1)[0].id);
  }
  applyChaosModifiers();
  const labels = [...currentChaosModifiers].map(id => CHAOS_MODS.find(m => m.id === id)?.label || id).join('  ');
  if (labels) damageTexts.push(new DamageText(GAME_W / 2, 120, labels, '#ff88ff'));
}

// onlyNew: Chaos Match re-applies the whole set, so one-shot effects (1 HP, weapon reroll)
// only run for the newly added modifier.
function applyChaosModifiers(onlyNew) {
  const humanPlayers = players.filter(p => !p.isBoss);
  const fresh = id => currentChaosModifiers.has(id) && (!onlyNew || onlyNew === id);
  humanPlayers.forEach(p => {
    // Save the original once. Chaos Match re-applies without clearing, so re-saving
    // the scaled value compounded hitboxes across waves.
    if (p._chaosOrigW === undefined) { p._chaosOrigW = p.w; p._chaosOrigH = p.h; }
    if (p._chaosOrigDrawScale === undefined) p._chaosOrigDrawScale = p.drawScale || 1;
    // Scale from the saved original, so a re-apply cannot compound.
    const sc = (currentChaosModifiers.has('giant') ? 1.55 : 1) * (currentChaosModifiers.has('tiny') ? 0.55 : 1);
    p.w = Math.floor(p._chaosOrigW * sc); p.h = Math.floor(p._chaosOrigH * sc);
    p.drawScale = (p._chaosOrigDrawScale || 1) * sc;
    if (fresh('sudden_death') && p.health > 0) p.health = 1;
    if (fresh('weapon_swap') && WEAPON_KEYS.length) {
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
  players.forEach(function(p) {
    if (!p.isBoss) {
      delete p.attackCooldownMult;
      delete p._nexusKBBoost;
    }
  });
  minigameResult    = null;
  survivalWave      = 0;
  survivalEnemies   = [];
  survivalWaveDelay = 180; // 3s before first wave
  // The players are one side. Without a shared _teamId, the P2 bot treated P1 as any nearby target.
  players.forEach(function(p) {
    if (p.isBoss) return;
    delete p._mgDown;
    if ((minigameType === 'survival' && survivalTeamMode) || minigameType === 'defense') p._teamId = 'mg_players';
  });
  clearChaosModifiers();
  kothPoints        = [0, 0];
  kothTimer         = 0;
  kothZoneX         = GAME_W / 2;
  kothWinnerIdx     = -1;
  chaosMatchTimer = 0;
  if (minigameType === 'sports' && typeof initSports === 'function') initSports();
  if (minigameType === 'chaos') {
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
    // Start the defender beside the Nexus. The Bastion is 800px wide.
    players.forEach(function(p, i) {
      if (p.isBoss) return;
      p.x = defenseNexusX + (i === 0 ? -90 : 60) - p.w / 2;
      p.y = defenseNexusY - p.h - 2;
      p.spawnX = p.x; p.spawnY = defenseNexusY;
    });
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
  const diff     = survivalWave <= 4 ? 'easy' : survivalWave <= 8 ? 'medium' : 'hard';
  const targets  = players.filter(p => !p.isBoss && p.health > 0);
  if (!targets.length) return;
  for (let i = 0; i < waveSize; i++) {
    const bx  = i % 2 === 0 ? 60 + Math.random() * 80 : GAME_W - 60 - Math.random() * 80;
    const bot = new Fighter(bx, 200, `hsl(${Math.random()*360},65%,55%)`, randChoice(WEAPON_KEYS),
      { left:null, right:null, jump:null, attack:null, ability:null, super:null }, true, diff);
    bot.name     = `W${survivalWave}#${i + 1}`;
    bot.lives    = 1;
    // Wave enemies target only the player side. Retargeting each other soaked their own damage.
    bot._teamId  = 'mg_enemy';
    bot.personality = randChoice(['aggressive', 'defensive', 'trickster', 'sniper']);
    bot.dmgMult  = Math.min(0.5 + survivalWave * 0.05, 0.95); // 0.55x on wave 1, 0.95x from wave 9
    bot.target   = targets[i % targets.length];
    bot.playerNum = 2;
    minions.push(bot);
    survivalEnemies.push(bot);
  }
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
  // Two defenders cover both lanes at once, so they face half as many again.
  const _defenders = players.filter(function(p) { return !p.isBoss; }).length;
  const waveSize = Math.round(Math.min(1 + Math.floor(defenseWave * 0.7), 7) * (_defenders > 1 ? 1.5 : 1));
  // Alternate sides, starting from a random one, so both lanes stay live.
  // From wave 7 every third rusher is a brute.
  const _firstLeft = Math.random() < 0.5;
  for (let i = 0; i < waveSize; i++) {
    defenseSpawnQueue.push({ fromLeft: (i % 2 === 0) === _firstLeft, brute: defenseWave >= 7 && i % 3 === 2 });
  }
  defenseSpawnTimer = 0;
  const _tx = typeof defenseNexusX !== 'undefined' ? defenseNexusX : GAME_W / 2;
  damageTexts.push(new DamageText(_tx, 80, `WAVE ${defenseWave}!`, '#ff8844'));
  screenShake = Math.max(screenShake, 6);
  if (typeof SoundManager !== 'undefined' && SoundManager.waveStart) SoundManager.waveStart();
}

function _releaseDefenseRusher(fromLeft, brute) {
  const speed = Math.min(1.25 + defenseWave * 0.11, 2.7) * (brute ? 0.7 : 1); // rushers get faster each wave
  const _wide = currentArena && currentArena.worldWidth;
  const gateX = _wide ? (fromLeft ? NEXUS_GATE_L_X : NEXUS_GATE_R_X)
                      : (fromLeft ? 50 : GAME_W - 50);
  const bot = new Fighter(gateX, 80, `hsl(${10 + Math.random() * 25},85%,50%)`, randChoice(WEAPON_KEYS),
    { left: null, right: null, jump: null, attack: null, ability: null, super: null }, false, 'easy');
  if (brute) {
    // Hitbox and body scale together, so the brute reads heavy and is no harder to hit.
    bot.w = Math.round(bot.w * 1.6); bot.h = Math.round(bot.h * 1.6);
    bot.drawScale = 1.6;
  }
  bot.x = gateX - bot.w / 2;
  const _floorPl = currentArena && currentArena.platforms && currentArena.platforms.find(function(p) { return p.isFloor; });
  if (_floorPl) bot.y = _floorPl.y - bot.h - 2;
  bot.name        = 'Rusher';
  bot.lives       = 1;
  bot._teamId     = 'mg_enemy';
  // A full 150-HP fighter per rusher let wave 4 outrun a single defender. Rushers are fodder.
  bot.maxHealth   = Math.round((40 + defenseWave * 7) * (brute ? 1.5 : 1));
  bot.health      = bot.maxHealth;
  if (brute) {
    // Slow, heavy, hard to shove back through the gate.
    bot._defenseBrute = true;
    bot.kbResist  = 0.55;
    bot.name      = 'Brute';
  }
  bot.dmgMult     = 0;  // Rushers deal no combat damage. Only nexus contact hurts.
  bot._defenseRusher = true;
  bot._defenseSpeed  = speed;  // always positive; direction is computed from position each frame
  bot._defenseFromLeft = fromLeft;
  bot._defenseLastHp   = bot.health;
  bot._defenseStagger  = 0;
  bot.playerNum   = 3;    // enemy faction colour (red tint from playerNum = 3 styling)
  minions.push(bot);
  defenseEnemies.push(bot);
  if (typeof spawnParticles === 'function') spawnParticles(gateX, bot.y + bot.h / 2, '#ff5530', 10);
}

// Ends the minigame once, with its own banner. winner null = the players lost.
function _minigameFinish(text, color, winner, delay, sub) {
  if (minigameResult) return;
  minigameResult = { text: text, color: color, winner: winner || null, sub: sub || '' };
  setTimeout(function() { if (gameRunning && gameMode === 'minigames') endGame(); }, delay || 2500);
}

// Survival fighters out of lives come here instead of the generic one-left rule. Returns true when handled.
// Team: fallen sit out until the next wave clears. Competitive: last one standing wins.
function minigameOnPlayerOut(p) {
  if (gameMode !== 'minigames' || minigameType !== 'survival' || !p || p.isBoss) return false;
  p._mgDown = true;
  p.invincible = 9999;
  const standing = players.filter(q => !q.isBoss && !q._mgDown && q.lives > 0);
  if (!standing.length) {
    _minigameFinish('WIPED OUT', '#ff4444', null, 1800, 'Reached wave ' + survivalWave);
  } else if (survivalFriendlyFire && standing.length === 1) {
    damageTexts.push(new DamageText(GAME_W / 2, 120, `${standing[0].name} WINS!`, '#ffdd44'));
    _minigameFinish(`${standing[0].name} WINS!`, standing[0].color, standing[0], 2000);
  }
  return true;
}

function updateMinigame() {
  if (!gameRunning || minigameResult) return;
  const livePlayers = players.filter(p => !p.isBoss && (p.health > 0 || p.invincible > 0));
  if (!livePlayers.length) return;

  if (minigameType === 'survival') {
    survivalEnemies = survivalEnemies.filter(e => e.health > 0);
    // Keep enemy targets on a living player. Only dead targets are re-pinned, since re-pinning
    // every frame overrode the brain's own retarget.
    const liveTargets = players.filter(p => !p.isBoss && p.health > 0 && !p._mgDown);
    survivalEnemies.forEach((e, i) => {
      if (liveTargets.length && !liveTargets.includes(e.target)) e.target = liveTargets[i % liveTargets.length];
    });
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

    if (survivalWaveDelay > 0) {
      survivalWaveDelay--;
      if (survivalWaveDelay === 0) spawnSurvivalWave();
    } else if (survivalEnemies.length === 0 && minions.filter(m => m.health > 0).length === 0) {
      // Wave cleared: heal the living. Team mode revives the fallen at half health.
      players.forEach(p => {
        if (p.isBoss) return;
        if (p._mgDown) {
          if (!survivalTeamMode) return;
          p._mgDown = false; p.lives = 1;  // second chance, not a reset
          p.respawn();
          p.health = Math.ceil(p.maxHealth / 2);
          damageTexts.push(new DamageText(p.cx(), p.y - 20, 'BACK IN!', '#44ff88'));
        } else if (p.health > 0) p.health = Math.min(p.maxHealth, p.health + 25);
      });
      survivalWaveDelay = 210;

      const waveGoal = survivalInfinite ? Infinity : survivalWaveGoal;
      if (survivalWave >= waveGoal) {
        // Goal reached!
        const msg = survivalInfinite ? `WAVE ${survivalWave} CLEARED!` : `YOU WIN! ALL ${survivalWaveGoal} WAVES!`;
        damageTexts.push(new DamageText(GAME_W / 2, 120, msg, '#44ff88'));
        clearChaosModifiers();
        if (!survivalInfinite) {
          unlockAchievement('survival_win');
          _minigameFinish(survivalTeamMode && players.length > 1 ? 'SURVIVED!' : 'YOU SURVIVED!', '#44ff88',
            players.find(p => !p.isBoss && !p._mgDown && !p.isAI) || players[0], 2500, `All ${survivalWaveGoal} waves cleared`);
          return;
        }
        survivalWave = 0; // infinite: keep going
      }
    }
  } else if (minigameType === 'koth') {
    kothTimer++;
    const p1 = players[0], p2 = players[1];
    // Zone is the 200px column centred on kothZoneX.
    const zoneLeft = kothZoneX - 100, zoneRight = kothZoneX + 100;
    // Airborne still counts, since the zone is the whole column.
    const p1InZone = p1 && p1.health > 0 && p1.cx() > zoneLeft && p1.cx() < zoneRight;
    const p2InZone = p2 && p2.health > 0 && p2.cx() > zoneLeft && p2.cx() < zoneRight;
    if (p1InZone && !p2InZone) kothPoints[0]++;
    if (p2InZone && !p1InZone) kothPoints[1]++;
    // Win at 1800 frames (30 seconds of uncontested zone)
    const WIN_FRAMES = 1800;
    if (kothPoints[0] >= WIN_FRAMES || kothPoints[1] >= WIN_FRAMES) {
      kothWinnerIdx = kothPoints[0] >= WIN_FRAMES ? 0 : 1;
      const _kw = players[kothWinnerIdx];
      _minigameFinish((_kw ? _kw.name : 'P' + (kothWinnerIdx + 1)) + ' WINS!', _kw ? _kw.color : '#ffdd44', _kw, 600, 'King of the Hill');
    }
  } else if (minigameType === 'chaos') {
    updateChaosMatch();
  } else if (minigameType === 'defense') {
    defenseEnemies = defenseEnemies.filter(function(e) { return e.health > 0; });

    // The defender takes the rusher nearest the crystal, not the nearest enemy.
    players.forEach(function(p) {
      if (!p.isAI || p.isBoss || p.health <= 0) return;
      var _best = null, _bd = Infinity;
      for (var _bi = 0; _bi < defenseEnemies.length; _bi++) {
        var _be = defenseEnemies[_bi];
        var _d = Math.abs(_be.cx() - defenseNexusX);
        if (_d < _bd) { _bd = _d; _best = _be; }
      }
      p.target = _best;
    });

    var _nexusReached = false;
    for (var _di = 0; _di < defenseEnemies.length; _di++) {
      var _de = defenseEnemies[_di];
      if (!_de || _de.health <= 0) continue;

      // Hits stagger the rusher. Steering must not overwrite vx each frame, or knockback vanishes.
      if (_de.health < _de._defenseLastHp) _de._defenseStagger = _de._defenseBrute ? 12 : 26;
      _de._defenseLastHp = _de.health;
      if (_de._defenseStagger > 0) _de._defenseStagger--;
      var _toDx = defenseNexusX - _de.cx();
      // Stagger and stun knockback decays with friction, then the rusher resumes its march.
      if (_de._defenseStagger <= 0 && !(_de.stunTimer > 0)) {
        const _dir = _toDx >= 0 ? 1 : -1;
        _de.vx = _dir * (_de._defenseSpeed || 2.0);
        // Walking into a planted defender only gave it free hits, so rushers vault. Later waves vault sooner.
        if (_de.onGround && !_de._defenseBrute && (_de._defenseHopCd || 0) <= 0) {
          const _blk = players.find(function(p) {
            return !p.isBoss && p.health > 0 && Math.abs(p.y + p.h - (_de.y + _de.h)) < 40 &&
                   (p.cx() - _de.cx()) * _dir > 0 && Math.abs(p.cx() - _de.cx()) < 70 + defenseWave * 4;
          });
          if (_blk && Math.random() < Math.min(0.15 + defenseWave * 0.03, 0.4)) {
            _de.vy = -15;
            _de.vx = _dir * Math.max(4.5, (_de._defenseSpeed || 2.0) * 2);
            _de._defenseStagger = 0;
            _de._defenseHopCd = 50;
          } else if (_blk) _de._defenseHopCd = 20;
        }
      }
      if (_de._defenseHopCd > 0) _de._defenseHopCd--;
      // Mid-vault the rusher keeps its jump carry instead of the walk speed.
      if (!_de.onGround && _de._defenseHopCd > 30 && _de._defenseStagger <= 0) _de.vx = (_toDx >= 0 ? 1 : -1) * Math.max(4.5, (_de._defenseSpeed || 2.0) * 2);

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
        defenseNexusHp -= _de._defenseBrute ? DEFENSE_BRUTE_DMG : DEFENSE_CONTACT_DMG;
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
      _minigameFinish('NEXUS DESTROYED', '#ff4422', null, 2500, 'Fell on wave ' + defenseWave + ' of ' + DEFENSE_WAVE_GOAL);
      return;
    }

    if (defenseSpawnQueue.length > 0) {
      if (defenseSpawnTimer > 0) defenseSpawnTimer--;
      else {
        const _q = defenseSpawnQueue.shift();
        _releaseDefenseRusher(_q.fromLeft, _q.brute);
        defenseSpawnTimer = Math.max(18, DEFENSE_SPAWN_GAP - defenseWave * 2);
      }
    }

    if (defenseWaveDelay > 0) {
      defenseWaveDelay--;
      if (defenseWaveDelay === 0) spawnDefenseWave();
    } else if (defenseSpawnQueue.length === 0 && defenseEnemies.filter(function(e) { return e.health > 0; }).length === 0) {
      // Wave cleared: repair the Nexus and queue the next wave.
      defenseNexusHp = Math.min(defenseNexusMaxHp, defenseNexusHp + DEFENSE_NEXUS_REGEN);
      if (defenseWave >= 5) unlockAchievement('nexus_defender');
      if (defenseWave >= DEFENSE_WAVE_GOAL) {
        damageTexts.push(new DamageText(defenseNexusX, 110, `NEXUS DEFENDED!  ${DEFENSE_WAVE_GOAL} WAVES!`, '#44ff88'));
        unlockAchievement('nexus_defender');
        _minigameFinish('NEXUS DEFENDED!', '#44ff88', players[0], 2500, `All ${DEFENSE_WAVE_GOAL} waves held`);
        return;
      }
      damageTexts.push(new DamageText(defenseNexusX, 110, 'Wave cleared!  Nexus +' + DEFENSE_NEXUS_REGEN, '#44ff88'));
      defenseWaveDelay = 240;
    }
  }
}

// Not named drawDefenseNexus: the story engine defines that name and loads later.
// This reads defenseNexusHp. The story one reads defenseNexusHP, a different variable.
function drawMinigameDefenseNexus() {
  if (!gameRunning || minigameType !== 'defense') return;
  var _cx = defenseNexusX, _cy = defenseNexusY;
  var _hpFrac = Math.max(0, defenseNexusHp / defenseNexusMaxHp);
  var _pulse  = 0.88 + 0.12 * Math.sin(typeof frameCount !== 'undefined' ? frameCount * 0.06 : 0);
  var _col    = _hpFrac > 0.5 ? '#44aaff' : _hpFrac > 0.25 ? '#ffaa22' : '#ff4422';

  ctx.save();

  var _grd = ctx.createRadialGradient(_cx, _cy - 30, 4, _cx, _cy - 30, 48 * _pulse);
  _grd.addColorStop(0, _col + 'bb');
  _grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = _grd;
  ctx.beginPath();
  ctx.arc(_cx, _cy - 30, 48 * _pulse, 0, Math.PI * 2);
  ctx.fill();

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

  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(_cx - 2,  _cy - 58);
  ctx.lineTo(_cx + 10, _cy - 36);
  ctx.lineTo(_cx - 6,  _cy - 36);
  ctx.closePath();
  ctx.fill();

  var _barW = 80, _barH = 8;
  var _bx = _cx - _barW / 2, _by = _cy - 82;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(_bx - 1, _by - 1, _barW + 2, _barH + 2);
  ctx.fillStyle = _hpFrac > 0.5 ? '#44ff88' : _hpFrac > 0.25 ? '#ffaa22' : '#ff4422';
  ctx.fillRect(_bx, _by, _barW * _hpFrac, _barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(_bx, _by, _barW, _barH);

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
  // Pinned to the screen. Under the camera transform the counter drifted on zoomed views.
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
    // Top score bar, screen space so it stays under the DOM HUD.
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
  }
  ctx.restore();
}

// World space, drawn under the camera with the arena. Screen space made the zone drift on zoom.
function drawKothZone() {
  if (!gameRunning || minigameType !== 'koth') return;
  ctx.save();
  const zoneLeft = kothZoneX - 100;
  ctx.fillStyle = 'rgba(255,220,0,0.10)';
  ctx.fillRect(zoneLeft, 0, 200, GAME_H);
  ctx.strokeStyle = 'rgba(255,220,0,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
  ctx.strokeRect(zoneLeft + 1, 0, 198, GAME_H);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
  ctx.fillText('KING ZONE', kothZoneX, 62);
  ctx.shadowBlur = 0;
  const p1 = players[0], p2 = players[1];
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
  ctx.restore();
}

function confirmResetProgress() {
  // Cloud reset first, so the next sync can't merge the old save back. Offline falls through.
  if (window.__SMB_RESET_PUSHED || !(window.SupabaseBridge && SupabaseBridge.pushReset)) { _confirmResetProgressLocal(); return; }
  window.__SMB_RESET_PUSHED = true;
  Promise.race([
    SupabaseBridge.pushReset().catch(function(e) { console.warn('[RESET] cloud reset failed', e); }),
    new Promise(function(r) { setTimeout(r, 3000); })
  ]).then(_confirmResetProgressLocal, _confirmResetProgressLocal);
}

function _confirmResetProgressLocal() {
  // Wipe all localStorage keys, both smc_ and the consolidated save blob.
  localStorage.clear();
  // Nothing may write storage after this, or the unload flush undoes the wipe.
  window.__SMB_WIPING__ = true;
  try { Storage.prototype.setItem = function() {}; } catch (e) {}

  // Flash, then reload so in-memory state resets too.
  const msg = document.createElement('div');
  msg.textContent = 'All progress wiped. Reloading...';
  msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.95);color:#ffaa44;padding:16px 28px;border-radius:8px;font-size:1.1rem;font-weight:bold;z-index:9999;pointer-events:none';
  document.body.appendChild(msg);
  setTimeout(() => { location.reload(); }, 1200);
}

// ETERNAL DAMNATION ARC: wave management and escape.

function spawnDamnationWave() {
  if (!damnationActive) return;
  const wave = damnationCheckpoint > damnationWave ? damnationCheckpoint : damnationWave;
  damnationWave = wave;

  players = players.filter(p => !p.isEcho);

  if (wave === 0) {
    // Wave 1: three minion echoes, all on team 99 so they don't fight each other
    for (let i = 0; i < 3; i++) {
      const echo = new Minion(200 + i * 200, 300);
      echo.isEcho = true;
      echo._teamId = 99;
      echo.color = '#880000';
      echo.health = 150;
      echo.maxHealth = 150;
      echo.lives = 1;  // echoes die once
      echo.target = players[0] || null;
      players.push(echo);
    }
  } else if (wave === 1) {
    const echoB = new Boss();
    echoB.isEcho = true;
    echoB._teamId = 99;
    echoB.color = '#770000';
    echoB.health = 1200;
    echoB.maxHealth = 1200;
    echoB.lives = 1;  // echoes die once
    echoB.target = players[0] || null;
    ['75', 'paradox50', '40', '10'].forEach(k => echoB._cinematicFired.add(k));
    players.push(echoB);
    if (players[0]) players[0].target = echoB;
  } else if (wave === 2) {
    const echoTF = new TrueForm();
    echoTF.isEcho = true;
    echoTF._teamId = 99;
    echoTF.color = '#660000';
    echoTF.health = 2500;
    echoTF.maxHealth = 2500;
    echoTF.lives = 1;  // echoes die once
    echoTF.target = players[0] || null;
    echoTF.dmgMult = 0.6;
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

  damnationPulse = (damnationPulse + 1) % 120;

  if (damnationWave === 0) {
    const minionEchoes = players.filter(p => p.isEcho && !p.isBoss && !p.isTrueForm);
    if (minionEchoes.length > 0 && minionEchoes.every(p => p.health <= 0 || p.isDead)) {
      damnationWave = 1;
      spawnDamnationWave();
    }
  } else if (damnationWave === 1) {
    const bossEchoes = players.filter(p => p.isEcho && p.isBoss);
    if (bossEchoes.length > 0 && bossEchoes.every(p => p.health <= 0 || p.isDead)) {
      damnationWave = 2;
      spawnDamnationWave();
    }
  // TrueForm echo dead: the orb and portal system handles victory from here.
  } else if (damnationWave === 2) {
    const tfEchoes = players.filter(p => p.isEcho && p.isTrueForm);
    if (tfEchoes.length > 0 && tfEchoes.every(p => p.health <= 0 || p.isDead)) {
      damnationWave = 3; // mark complete so this doesn't re-fire
    }
  }

  for (let i = damnationAnchorOrbs.length - 1; i >= 0; i--) {
    const orb = damnationAnchorOrbs[i];
    orb.frame++;
    const dx = p1.cx() - orb.x;
    const dy = (p1.y + p1.h / 2) - orb.y;
    if (Math.sqrt(dx * dx + dy * dy) < 50) {
      damnationAnchors++;
      if (typeof SoundManager !== 'undefined' && SoundManager.pickup) SoundManager.pickup();
      damnationAnchorOrbs.splice(i, 1);
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
  if (typeof screenFlash === 'function') screenFlash('#ffffff', 20);
  if (typeof SoundManager !== 'undefined' && SoundManager.superActivate) SoundManager.superActivate();
  players = players.filter(p => !p.isEcho);
  // End the match. The story engine advances to Ch. 93
  if (typeof endGame === 'function') {
    const p1 = players[0];
    endGame(p1 ? p1.playerNum : 1);
  }
}
