'use strict';
// smb-menu-startcore.js — _startGameCore: full game initialisation sequence
// Depends on: smb-globals.js, smb-fighter.js, smb-enemies.js, smb-menu-spawn.js
// Must load AFTER smb-menu-spawn.js, BEFORE smb-menu-utils.js

function _startGameCore() {
  // Stale online state must never leak into an offline match. Leaving a room
  // without reloading the page used to leave onlineMode true, which forced
  // training2P on and flagged a fighter isRemote with nothing driving it: an
  // invulnerable, motionless clone of the last online opponent, plus the online
  // chat log floating over a solo session.
  if (onlineMode && !(typeof NetworkManager !== 'undefined' && NetworkManager.connected)) {
    onlineMode = false;
    onlineLocalSlot = 0;
    if (typeof localPlayerSlot !== 'undefined') localPlayerSlot = 0;
  }
  document.getElementById('menu').style.display            = 'none';
  document.getElementById('gameOverOverlay').style.display  = 'none';
  document.getElementById('pauseOverlay').style.display     = 'none';
  canvas.style.display = 'block';
  document.getElementById('hud').style.display = (settings && settings.hideHud) ? 'none' : 'flex';

  // Resolve arena
  const isBossMode         = gameMode === 'boss';
  const isTrueFormMode     = gameMode === 'trueform';
  const isGodMode          = gameMode === 'god';
  const isAbsoluteAxiomMode = gameMode === 'absoluteaxiom';
  const isDamnationMode    = gameMode === 'damnation';
  const isTrainingMode     = gameMode === 'training';
  // Online: force 2P-compatible variants so guest doesn't get assigned to boss/dummy
  // A hosted room with nobody in it is NOT a multiplayer match. Both the forced
  // 2P layout and the isRemote hand-off below have to key off a real peer, or an
  // empty room produces a second fighter with no driver: the motionless,
  // damage-proof clone players saw after a friend left.
  const _onlinePeerPresent = onlineMode
    && typeof NetworkManager !== 'undefined' && NetworkManager.connected
    && (typeof NetworkManager.getSlotCount !== 'function' || NetworkManager.getSlotCount() > 1);
  // The chat widget is an in-match overlay and only earns its screen space when
  // there is somebody to talk to.
  const chatEl = document.getElementById('onlineChat');
  if (chatEl) chatEl.style.display = _onlinePeerPresent ? 'flex' : 'none';
  if (_onlinePeerPresent && isBossMode && bossPlayerCount !== 2) bossPlayerCount = 2;
  if (_onlinePeerPresent && isTrainingMode) training2P = true;
  const isMinigamesMode      = gameMode === 'minigames';
  const isBattleRoyaleMode   = gameMode === 'battleroyale';
  const isEscortMode         = gameMode === 'escort';
  const isExploreMode        = gameMode === 'exploration';
  const isAdaptiveMode     = gameMode === 'adaptive' || gameMode === 'sovereign';
  const isSovereignMode    = gameMode === 'sovereign';
  const isCompleteRandMode = gameMode === '2p' && completeRandomizer;
  // Quick Fight: one-shot "everything random" for this match only — arena, weapon
  // and class are rolled fresh and the player's 1v1 menu selections are ignored.
  // Unlike Complete Randomizer it does not reroll the arena on every death.
  const isQuickFightRand   = gameMode === '2p' && !!window._quickFightRandomNext;
  window._quickFightRandomNext = false;
  // Fight Ladder rung (smb-ladder.js): the opponent, arena and difficulty are
  // fixed per rung. P1 gets the starter kit (sword, Warrior) on the first-run
  // fight, and on every rung unless they picked a real loadout (anything but
  // Random) in Versus, so a run keeps one identity from fight to fight.
  const ladderDef          = gameMode === '2p' ? (window._ladderNext || null) : null;
  window._ladderNext = null;
  const _p1PicksRandom     = (document.getElementById('p1Weapon')?.value || 'random') === 'random'
                          && (document.getElementById('p1Class')?.value  || 'random') === 'random';
  const useStarterKit      = !!(ladderDef && (ladderDef.firstRun || _p1PicksRandom));
  const isRandLoadout      = isCompleteRandMode || isQuickFightRand;
  const isMultiverseMode   = gameMode === 'multiverse';
  const isBossLivesMode    = isBossMode || isTrueFormMode;
  _setBossFightLivesLock(isBossLivesMode);

  // Track which fighters the player has encountered for the Guidebook Fighters Log
  if (typeof GameState !== 'undefined') {
    const _seen = GameState.get('fightersSeen') || {};
    if (gameMode === '2p' || gameMode === 'minigames' || gameMode === 'battleroyale') _seen.guard = true;
    if (isBossMode) _seen.boss = true;
    if (isTrueFormMode) { _seen.boss = true; _seen.trueform = true; }
    if (isSovereignMode) _seen.axiom = true;
    if (isAdaptiveMode && !isSovereignMode) _seen.adaptive = true;
    if (isDamnationMode) _seen.damnation = true;
    if (isGodMode) _seen.god = true;
    if (storyModeActive) _seen.story = true;
    GameState.set('fightersSeen', _seen);
    GameState.save();
  }

  trainingMode = isTrainingMode;
  tutorialMode = false; // tutorial mode removed
  if (isSovereignMode) {
    currentArenaKey = 'sovereign'; // Sovereign's dedicated melee-only arena
  } else if (isAbsoluteAxiomMode) {
    currentArenaKey = 'absolute_axiom_domain';
  } else if (isGodMode) {
    currentArenaKey = 'god_domain'; // God's own divine domain arena
  } else if (isMultiverseMode) {
    const mvWorld = (typeof MultiverseManager !== 'undefined') ? MultiverseManager.getActiveWorld() : null;
    currentArenaKey = (mvWorld && mvWorld.arenaKey) ? mvWorld.arenaKey : 'homeAlley';
  } else if (isBossMode) {
    // A story chapter's authored arena (storyLevelArenaKey) keeps the Creator
    // arena's boss rules via isBossArena; any other boss match is 'creator'.
    currentArenaKey = (storyModeActive && selectedArena === '__storyarena__' && ARENAS.__storyarena__ && ARENAS.__storyarena__.isBossArena) ? '__storyarena__' : 'creator';
  } else if (isTrainingMode) {
    currentArenaKey = 'training';
  } else if (isTrueFormMode) {
    currentArenaKey = 'void';
  } else if (isDamnationMode) {
    // Story arenas built on 'damnation' keep its six platforms in order — the
    // fall-removal sequence (damnationRemovalOrder) is index-based.
    currentArenaKey = (storyModeActive && selectedArena === '__storyarena__' && ARENAS.__storyarena__ && ARENAS.__storyarena__.isDamnationArena) ? '__storyarena__' : 'damnation';
    if (typeof resetDamnationState === 'function') resetDamnationState();
  } else if (isExploreMode) {
    currentArenaKey = '__explore__';
  } else if (isBattleRoyaleMode) {
    currentArenaKey = '__br__';
    if (typeof _makeBRArena === 'function') ARENAS['__br__'] = _makeBRArena(); // ensure ARENAS lookup works at line 83
  } else if (isMinigamesMode) {
    if (minigameType === 'sports') {
      currentArenaKey = 'soccer';
    } else if (minigameType === 'defense') {
      currentArenaKey = 'nexus';
    } else {
      // Pick a random arena from the standard PvP selection
      const arenaPool = ARENA_KEYS_ORDERED.filter(k => ARENAS[k] && !ARENAS[k].isStoryOnly);
      currentArenaKey = randChoice(arenaPool);
    }
  } else if (ladderDef && ARENAS[ladderDef.arena]) {
    currentArenaKey = ladderDef.arena;
  } else if (isRandLoadout) {
    let arenaPool = ARENA_KEYS_ORDERED.filter(k => ARENAS[k] && !ARENAS[k].isStoryOnly);
    if (isQuickFightRand && !settings.quickFightHazards && typeof _QUICK_FIGHT_ARENAS !== 'undefined') {
      const _safe = arenaPool.filter(k => _QUICK_FIGHT_ARENAS.includes(k));
      if (_safe.length) arenaPool = _safe;
    }
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
  isRandomMapMode = (selectedArena === 'random' && !isRandLoadout);
  // Lava/void: no randomization
  if (currentArenaKey !== 'creator' && currentArenaKey !== 'god_domain' && currentArenaKey !== 'lava' && currentArenaKey !== 'void' && currentArenaKey !== 'soccer' && currentArenaKey !== 'damnation' && currentArenaKey !== 'sovereign' && currentArenaKey !== 'training' && !isExploreMode && !isBattleRoyaleMode && !isEscortMode) randomizeArenaLayout(currentArenaKey);
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
  // Story uses its own saved pick (story loadout menu), not the Versus selects.
  // Random rolls skip anything the mode would strip afterwards, so a rolled
  // class is never left holding a substituted sword.
  const _p1StoryLoadout = (storyModeActive && typeof storyLoadoutValues === 'function') ? storyLoadoutValues() : null;
  const _isBossRoll = isBossMode || isTrueFormMode || isGodMode || isAbsoluteAxiomMode || isDamnationMode || isSovereignMode;
  const _rollFilter = (storyModeActive && typeof _storyWeaponAllowed === 'function') ? _storyWeaponAllowed
    : _isBossRoll ? (k => !WEAPONS[k] || WEAPONS[k].type !== 'ranged') : null;
  const _p1Resolved = isRandLoadout ? resolveWeaponAndClassValues('random', 'random')
    : _p1StoryLoadout ? resolveWeaponAndClassValues(_p1StoryLoadout.weapon, _p1StoryLoadout.cls, _rollFilter)
    : resolveWeaponAndClass('p1Weapon', 'p1Class', _rollFilter);
  const _p2Resolved = isRandLoadout ? resolveWeaponAndClassValues('random', 'random') : resolveWeaponAndClass('p2Weapon', 'p2Class', _rollFilter);
  let w1 = _p1Resolved.weaponKey;
  let w2 = _p2Resolved.weaponKey;
  if (useStarterKit) w1 = 'sword';
  if (ladderDef) w2 = ladderDef.weapon;
  // Story mode: HARD enforce no ranged weapons for human players at game start
  if (storyModeActive) {
    const _isMeleeOnly = (key) => typeof WEAPONS !== 'undefined' && WEAPONS[key] && WEAPONS[key].type === 'ranged';
    if (_isMeleeOnly(w1)) w1 = 'sword';
    if (_isMeleeOnly(w2)) w2 = 'sword';
  }
  // ── RANGED BAN (all boss fights) ────────────────────────────────────────
  // Every boss encounter is melee-only for the player side. Ranged weapons let
  // the player kite from outside the boss's engage range, which bypasses the
  // read-and-punish adaptation systems (Sovereign) and the telegraph/counter
  // design of the phase bosses. Substitute a sword for any ranged pick.
  // Boss entities themselves are constructed separately and are unaffected.
  const _isBossFight = isBossMode || isTrueFormMode || isGodMode ||
                       isAbsoluteAxiomMode || isDamnationMode || isSovereignMode;
  if (_isBossFight) {
    // Custom weapons are keyed '_custom_*' and live in CUSTOM_WEAPONS, not WEAPONS —
    // resolve both so a hand-built ranged weapon can't slip past the ban.
    const _wDef = (key) => (key && String(key).startsWith('_custom_') && window.CUSTOM_WEAPONS)
      ? window.CUSTOM_WEAPONS[key]
      : (typeof WEAPONS !== 'undefined' ? WEAPONS[key] : null);
    const _isRanged = (key) => { const d = _wDef(key); return !!d && d.type === 'ranged'; };
    const _banned = _isRanged(w1) || _isRanged(w2);
    if (_isRanged(w1)) w1 = 'sword';
    if (_isRanged(w2)) w2 = 'sword';
    if (_banned && typeof queueAnnouncement === 'function') {
      queueAnnouncement('RANGED BARRED — MELEE ONLY', '#ffcc44');
    }
  }
  // Store resolved class keys so applyClass calls below use the coordinated result
  let _p1ResolvedClass = _p1Resolved.classKey;
  let _p2ResolvedClass = _p2Resolved.classKey;
  if (useStarterKit) _p1ResolvedClass = 'warrior';
  if (ladderDef) _p2ResolvedClass = ladderDef.cls;

  // ── TROLL CLASS BAR (boss fights) ───────────────────────────────────────
  // Knight is a joke class with deliberately absurd stats — a 30-damage
  // launcher on a 22-frame cooldown, a free AoE on every landing, and a super
  // that grants 2s of invincibility. That is fine as a toy in versus and
  // training, and completely trivialises a boss fight: it beat Sovereign 10-8
  // in a measured full match while every other loadout tested lost badly.
  // Rather than balance the joke into something it was never meant to be, it is
  // simply barred from boss encounters and rerolled to an ordinary class.
  if (_isBossFight) {
    const _reroll = (cls) => {
      if (cls !== 'megaknight') return cls;
      const _pool = (typeof CLASSES !== 'undefined')
        ? Object.keys(CLASSES).filter(k => k !== 'megaknight' && k !== 'random' && k !== 'none')
        : ['none'];
      const _pick = _pool.length ? _pool[Math.floor(Math.random() * _pool.length)] : 'none';
      if (typeof queueAnnouncement === 'function') {
        queueAnnouncement('KNIGHT BARRED — REROLLED', '#cc88ff');
      }
      return _pick;
    };
    _p1ResolvedClass = _reroll(_p1ResolvedClass);
    _p2ResolvedClass = _reroll(_p2ResolvedClass);
    // The class selector locks the weapon to mkgauntlet while Knight is
    // picked, so rerolling the class alone would leave the player holding a
    // 30-damage 22-frame gauntlet under an ordinary class — the stats that made
    // it a problem, minus the identity. Reroll the weapon with it.
    const _rerollW = (wk) => {
      if (wk !== 'mkgauntlet' && wk !== 'gauntlet') return wk;
      const _wp = (typeof WEAPON_KEYS !== 'undefined' && WEAPON_KEYS.length)
        ? WEAPON_KEYS.filter(k => !(WEAPONS[k] && WEAPONS[k].type === 'ranged'))
        : ['sword'];
      return _wp.length ? _wp[Math.floor(Math.random() * _wp.length)] : 'sword';
    };
    w1 = _rerollW(w1);
    w2 = _rerollW(w2);
  }
  const c1   = document.getElementById('p1Color').value;
  const c2   = document.getElementById('p2Color').value;
  const p1Diff = (document.getElementById('p1Difficulty')?.value) || 'hard';
  const p2Diff = ladderDef ? ladderDef.diff : ((document.getElementById('p2Difficulty')?.value) || 'hard');
  const diff   = p2Diff; // legacy alias used below for p2
  const isBot  = p2IsBot; // bot determined by P2 toggle, not separate mode

  // Generate bg elements fresh each game
  generateBgElements();

  // Reset state — stop menu background loop
  menuLoopRunning    = false;
  frameCount         = 0; // reset per-game frame counter (used for yeti min-spawn delay)
  projectiles        = [];
  particles          = [];
  if (typeof resetDestruction === 'function') resetDestruction();
  if (typeof resetWorldReact === 'function') resetWorldReact();
  bloodStains        = [];
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
  // Unconditional TF/boss global reset — clears all attack state arrays regardless of mode
  // so hazards from a previous game never carry damage into the next one.
  if (typeof resetBossWarnings === 'function') resetBossWarnings();
  if (typeof resetTFState === 'function') resetTFState();
  if (typeof DomainManager !== 'undefined') DomainManager.reset();
  trainingDummies    = [];
  bossDialogue       = { text: '', timer: 0 };
  backstagePortals   = [];
  lightningBolts     = [];
  bossDeathScene     = null;
  fakeDeath          = { triggered: false, active: false, timer: 0, player: null };
  if (typeof resetParadoxState === 'function') resetParadoxState();
  // Re-seed rather than blank-wipe. initMapPerks() clears both globals itself and
  // then re-spawns the arena's pickups; a bare `mapItems = []` here ran AFTER the
  // initMapPerks() call above and left every pickup arena (ruins, and now The
  // Circuit) permanently item-less — crates/meteors/gusts only survived because
  // their update blocks lazily re-seed their own state, and pickups have no such path.
  if (typeof initMapPerks === 'function') initMapPerks(currentArenaKey);
  else { mapItems = []; mapPerkState = {}; }
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
  // Stale-mode leak guards: a quit mid-Damnation or mid-gravity-flip chaos event
  // must never carry these flags into the next match.
  damnationActive = false;
  if (typeof tfGravityInverted !== 'undefined') tfGravityInverted = false;
  if (typeof tfControlsInverted !== 'undefined') tfControlsInverted = false;
  if (typeof _lastFrameTime !== 'undefined') _lastFrameTime = 0;
  if (typeof resetDirector === 'function') resetDirector();

  // Reset camera zoom
  camZoomCur = 1; camZoomTarget = 1;
  camXCur = GAME_W / 2; camYCur = GAME_H / 2;
  camXTarget = GAME_W / 2; camYTarget = GAME_H / 2;
  camHitZoomTimer = 0;
  if (typeof resetCameraMotion === 'function') resetCameraMotion();
  // Reset duel-cam state so it doesn't carry stale midpoint from previous match
  if (typeof _duelMidX !== 'undefined') { _duelMidX = GAME_W / 2; _duelMidY = GAME_H / 2; _duelFallDelay = 0; }
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
  // Restore god_domain arena floor platform
  if (ARENAS.god_domain) {
    const floorPl = ARENAS.god_domain.platforms.find(p => p.isFloor);
    if (floorPl) floorPl.isFloorDisabled = false;
    ARENAS.god_domain.hasLava = false;
    ARENAS.god_domain.deathY  = 640;
  }
  if (currentArenaKey === '__storyarena__' && currentArena && currentArena.isBossArena) {
    currentArena.hasLava = false;
    currentArena.deathY  = 640;
  }

  // Player 1  (W/A/D move · S=shield · Space=attack · Q=ability)
  const p1 = new Fighter(160, 300, c1, w1, { left:'a', right:'d', jump:'w', attack:' ', shield:'s', ability:'q', super:'e' }, p1IsBot, p1Diff);
  p1.playerNum = 1; p1.name = p1IsBot ? 'BOT1' : 'P1'; p1.lives = chosenLives;
  const _p1SpawnPos = pickSafeSpawn('left') || { x: 160, y: 300 };
  p1.spawnX = _p1SpawnPos.x; p1.spawnY = _p1SpawnPos.y; p1.x = _p1SpawnPos.x; p1.y = _p1SpawnPos.y - p1.h;
  p1.hat  = document.getElementById('p1Hat')?.value  || 'none';
  p1.cape = document.getElementById('p1Cape')?.value || 'none';
  if (p1Skin !== 'default' && SKIN_COLORS[p1Skin]) p1.color = SKIN_COLORS[p1Skin];
  p1.weaponTheme = (p1WeaponSkin && p1WeaponSkin !== 'default') ? p1WeaponSkin : null;
  // Story mode: if class is locked for this chapter, ignore player's class selection
  const _storyClassLocked = storyModeActive && storyPlayerOverride && storyPlayerOverride.noClass;
  applyClass(p1, _storyClassLocked ? 'none' : _p1ResolvedClass);
  // If player explicitly chose a weapon (not random), restore it after applyClass
  // so archer/paladin class doesn't forcefully override the selected weapon
  const _p1WeaponPick = _p1StoryLoadout ? _p1StoryLoadout.weapon : document.getElementById('p1Weapon')?.value;
  if (_p1WeaponPick && _p1WeaponPick !== 'random' && !isRandLoadout) {
    const _w1Obj = (w1 && w1.startsWith('_custom_') && window.CUSTOM_WEAPONS && window.CUSTOM_WEAPONS[w1])
                   ? window.CUSTOM_WEAPONS[w1]
                   : (typeof WEAPONS !== 'undefined' && WEAPONS[w1] ? WEAPONS[w1] : null);
    if (_w1Obj) { p1.weaponKey = w1; p1.weapon = _w1Obj; p1._ammo = p1.weapon.clipSize || 0; }
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
    p1._noDoubleJump      = !!_sc.noDoubleJump;  // unified flag checked in smb-loop.js
  }
  // Knight spawn fall
  if (p1.charClass === 'megaknight') { p1.y = -120; p1.vy = 2; p1._spawnFalling = true; p1.invincible = 200; SoundManager.megaknightFall && SoundManager.megaknightFall(); }

  // Player 2 / Bot / Boss / Training Dummy
  let p2;
  if (isBossMode) {
    const _guestOnline = _onlinePeerPresent
      && typeof NetworkManager !== 'undefined' && !NetworkManager.isHost();
    const boss = (storyBossType === 'fallen_god' && typeof FallenGod !== 'undefined') ? new FallenGod() : new Boss();
    // Online guests: mark boss as remote so loop skips its AI
    if (_guestOnline) { boss.isRemote = true; boss.isAI = false; }
    // True Creator mode: significantly harder boss (requires TRUEFORM code)
    // Skipped in story mode — story has its own boss scaling below
    if (unlockedTrueBoss && !storyModeActive) {
      boss.health            = 4500;
      boss.maxHealth         = 4500;
      boss.attackCooldownMult = 0.28;
      boss.kbBonus           = 2.5;
      boss.kbResist          = 0.25;
      boss.name              = 'CREATOR';
      boss.color             = '#ff00ee';
    }
    // Story mode uses the real, full-power boss (no downscaling) — matches the standalone game mode.
    // Fallen God: apply health multiplier on top of base stats
    if (boss.isFallenGod && boss._healthMult) {
      boss.health    = Math.round(boss.health    * boss._healthMult);
      boss.maxHealth = Math.round(boss.maxHealth * boss._healthMult);
    }
    if (bossPlayerCount === 2 && !storyModeActive) {
      // 2P boss: harder boss
      boss.attackCooldownMult = 0.38; // ~1.3x faster attacks than 1P
      boss.kbBonus            = 2.0;  // 1.33x more KB than 1P
      boss.health             *= 1.5; // 1.5x more HP
      boss.maxHealth          = boss.health;
      // Spawn real P2 alongside boss (can be human or bot)
      const w2b  = _p2ResolvedClass !== 'none' && typeof CLASSES !== 'undefined' && CLASSES[_p2ResolvedClass]?.weapon
                   ? CLASSES[_p2ResolvedClass].weapon : w2;
      const c2b  = document.getElementById('p2Color').value;
      const p2h  = new Fighter(720, 300, c2b, w2b, { left:'j', right:'l', jump:'i', attack:'u', shield:'k', ability:'o', super:'[' }, p2IsBot, diff);
      p2h.playerNum = 2; p2h.name = p2IsBot ? 'BOT' : 'P2'; p2h.lives = chosenLives;
      { const _sp2 = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
        p2h.spawnX = _sp2.x; p2h.spawnY = _sp2.y; p2h.x = _sp2.x; p2h.y = _sp2.y - p2h.h; }
      p2h.hat  = document.getElementById('p2Hat')?.value  || 'none';
      p2h.cape = document.getElementById('p2Cape')?.value || 'none';
      applyClass(p2h, _p2ResolvedClass);
      if (p2h.charClass === 'megaknight') { p2h.y = -120; p2h.vy = 2; p2h._spawnFalling = true; p2h.invincible = 200; SoundManager.megaknightFall && SoundManager.megaknightFall(); }
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
  } else if (isMultiverseMode) {
    // Multiverse: P1 vs AI fighter configured by the pending encounter
    p1.isAI  = false;
    p1.lives = (_pendingMultiverseEncounter && _pendingMultiverseEncounter.lives) || 3;
    const _mvEnc = (typeof _pendingMultiverseEncounter !== 'undefined' && _pendingMultiverseEncounter) || {};
    const _mvSpawn = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
    const mvEnemy = new Fighter(
      _mvSpawn.x, _mvSpawn.y,
      _mvEnc.color || '#778899',
      _mvEnc.weaponKey || 'sword',
      null, // AI-controlled
      true,
      _mvEnc.aiDiff || 'hard'
    );
    mvEnemy.playerNum = 2;
    mvEnemy.name      = _mvEnc.opponentName || 'Dimensional Fighter';
    mvEnemy.lives     = p1.lives;
    mvEnemy.spawnX    = _mvSpawn.x; mvEnemy.spawnY = _mvSpawn.y;
    mvEnemy.x = _mvSpawn.x; mvEnemy.y = _mvSpawn.y - mvEnemy.h;
    if (typeof applyClass === 'function') applyClass(mvEnemy, _mvEnc.classKey || 'warrior');
    if (Array.isArray(_mvEnc.armor)) {
      mvEnemy.armorPieces = [..._mvEnc.armor];
    }
    if (_mvEnc.isBossEnc) mvEnemy.isBoss = false; // treat as strong AI, not actual boss class
    p2 = mvEnemy;
    players = [p1, mvEnemy];
    p1.target = mvEnemy; mvEnemy.target = p1;

    // Optional second enemy (elite/survival encounters)
    if (_mvEnc.twoEnemies) {
      const _mvSpawn2 = pickSafeSpawn('right', _mvSpawn.x + 80) || { x: 760, y: 300 };
      const mvEnemy2  = new Fighter(
        _mvSpawn2.x, _mvSpawn2.y,
        _mvEnc.secondColor || '#667788',
        _mvEnc.weaponKey || 'sword',
        null, true, _mvEnc.aiDiff || 'hard'
      );
      mvEnemy2.playerNum = 3;
      mvEnemy2.name      = (_mvEnc.opponentName || 'Fighter') + ' II';
      mvEnemy2.lives     = p1.lives;
      mvEnemy2.spawnX    = _mvSpawn2.x; mvEnemy2.spawnY = _mvSpawn2.y;
      mvEnemy2.x = _mvSpawn2.x; mvEnemy2.y = _mvSpawn2.y - mvEnemy2.h;
      if (typeof applyClass === 'function') applyClass(mvEnemy2, _mvEnc.classKey || 'warrior');
      mvEnemy2.target = p1;
      players.push(mvEnemy2);
    }

    // Clear pending so it doesn't persist across fights
    _pendingMultiverseEncounter = null;

    // Fire multiverse fight start hooks (scaling, modifiers)
    if (typeof MultiverseManager !== 'undefined') MultiverseManager.onFightStart();

  } else if (isAdaptiveMode) {
    // Adaptive AI: P1 vs the learning AdaptiveAI opponent
    // Sovereign mode uses SovereignMK2 (enhanced); story adaptive uses base AdaptiveAI
    p1.isAI  = false;
    p1.lives = isSovereignMode ? Math.max(chosenLives, 10) : chosenLives;
    // Pick a weapon for the AI — Sovereign always uses nullblade; adaptive uses a random melee set
    // Story Sovereign chapters use the full SovereignMK2 brain (no-mercy), the same
    // as the standalone mode — but keep the story's own arena and lives.
    const _storySovFight = storyModeActive && typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter && !!_activeStory2Chapter.isSovereignFight;
    const _useSovMK2 = isSovereignMode || _storySovFight;
    const _aiWeapons = ['sword','axe','spear','hammer','scythe','voidblade'];
    const _aiWeapon  = _useSovMK2 ? 'nullblade' : _aiWeapons[Math.floor(Math.random() * _aiWeapons.length)];
    const ai = _useSovMK2
      ? new SovereignMK2(720, 300, '#ff3311', _aiWeapon)
      : new AdaptiveAI(720, 300, '#9955ee', _aiWeapon);

    // Opening kit — his signature loadout (nullblade), as a real LOADOUT rather
    // than a bare weaponKey so it carries the class identity and the authored
    // nullblade finisher. It is also the fallback: _ensureMatchLoadout replaces
    // it with a counter-pick on the first frame he has a target (the pick needs
    // an opponent to score against, which does not exist yet here), and that kit
    // is then locked for the whole match.
    if (_useSovMK2 && typeof SMK2_LOADOUTS !== 'undefined' && ai._applyLoadout) {
      const _sig = SMK2_LOADOUTS.find(l => l.key === 'signature');
      if (_sig) ai._applyLoadout(_sig);
    } else if (isSovereignMode && typeof WEAPONS !== 'undefined' && WEAPONS.nullblade) {
      ai.weapon    = WEAPONS.nullblade;
      ai.weaponKey = 'nullblade';
    }

    // ── Difficulty boosts applied post-construction ───────────────────────────
    // Sovereign gamemode: start at near-peak intelligence, limiter already broken.
    // The player faces maximum Sovereign from round 1 — no warm-up phase.
    // The numbers live in applySovereignPeakTuning (smb-smk2-class.js) so the
    // possession spirit runs the identical Sovereign — see SovereignControl.
    if (_useSovMK2 && typeof applySovereignPeakTuning === 'function') {
      applySovereignPeakTuning(ai);
    }
    // Story adaptive: start sharper than default so the fight feels earned, not trivial.
    if (storyModeActive && !_useSovMK2) {
      ai.aiMemory.aggression    = 0.88;
      ai.aiMemory.defense       = 0.82;
      ai.aiMemory.spacing       = 0.10;
      ai.aiMemory.reactionSpeed = 0.95;
      ai.intelligence = (ai.aiMemory.aggression + ai.aiMemory.defense +
                         (1 - ai.aiMemory.spacing) * 0.5 + ai.aiMemory.reactionSpeed) / 3.5;
      ai._updateAuraColor();
    }

    ai.playerNum = 2;
    // Sovereign needs multiple lives to build pattern data across rounds — minimum 5 regardless of menu pick
    ai.lives     = isSovereignMode ? Math.max(chosenLives, 10) : chosenLives;
    const _aiSpawn = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
    ai.spawnX = _aiSpawn.x; ai.spawnY = _aiSpawn.y;
    ai.x = _aiSpawn.x;      ai.y = _aiSpawn.y - ai.h;
    p2 = ai;
    players = [p1, ai];
    p1.target = ai;
    ai.target = p1;
    if (_useSovMK2 && typeof Brain !== 'undefined' && Brain.driveSovereign) Brain.driveSovereign(ai, p1);
  } else if (isDamnationMode) {
    // Eternal Damnation arc: P1 solo, wave manager spawns echoes dynamically
    p1.isAI  = false;
    p1.lives = 9999;   // damnationDeaths manages progression, not lives
    players  = [p1];
    p1.target = null;
    damnationActive = true;
    if (typeof spawnDamnationWave === 'function') spawnDamnationWave();
  } else if (isTrueFormMode) {
    // True Form: solo — P1 vs True Form boss, void arena, no 2P
    p1.isAI = false;
    p1.lives = chosenLives;
    const tf = new TrueForm();
    // Story mode uses the real, full-power True Form (no downscaling) — matches the standalone game mode.
    tf.target = p1;
    p1.target = tf;
    p2 = tf;
    players = [p1, tf];
    // Damnation scar bonus: surviving the echo gives 10% extra damage
    if (storyModeActive) {
      try {
        if (window.GameState && GameState.getActiveAccount()?.data?.unlocks?.damnationScar) {
          p1.dmgMult = (p1.dmgMult || 1.0) * 1.10;
          p1._hasDamnationScar = true;
        }
      } catch(e) {}
    }
  } else if (isTrainingMode) {
    if (training2P) {
      // 2P training: both fighters present, shared dummy
      p2 = new Fighter(720, 300, c2, w2, { left:'j', right:'l', jump:'i', attack:'u', shield:'k', ability:'o', super:'[' }, p2IsBot, diff);
      p2.playerNum = 2; p2.name = p2IsBot ? 'BOT' : 'P2'; p2.lives = 999;
      { const _sp2 = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
        p2.spawnX = _sp2.x; p2.spawnY = _sp2.y; p2.x = _sp2.x; p2.y = _sp2.y - p2.h; }
      applyClass(p2, _p2ResolvedClass);
      if (p2.charClass === 'megaknight') { p2.y = -120; p2.vy = 2; p2._spawnFalling = true; p2.invincible = 200; SoundManager.megaknightFall && SoundManager.megaknightFall(); }
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
    p1.lives = (minigameType === 'survival') ? 1 : 99; // survival: 1 life; koth/chaos/sports: infinite (99)
    if (minigameType === 'koth' || minigameType === 'chaos' || minigameType === 'sports' || (minigameType === 'survival' && !p2IsNone)) {
      const p2mg = new Fighter(720, 300, c2, w2,
        { left:'j', right:'l', jump:'i', attack:'u', shield:'k', ability:'o', super:'[' }, p2IsBot, p2Diff);
      p2mg.playerNum = 2; p2mg.name = p2IsBot ? 'BOT' : 'P2';
      p2mg.lives = (minigameType === 'survival') ? 1 : 99;
      { const _sp2 = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
        p2mg.spawnX = _sp2.x; p2mg.spawnY = _sp2.y; p2mg.x = _sp2.x; p2mg.y = _sp2.y - p2mg.h; }
      p2mg.hat  = document.getElementById('p2Hat')?.value  || 'none';
      p2mg.cape = document.getElementById('p2Cape')?.value || 'none';
      if (p2Skin !== 'default' && SKIN_COLORS[p2Skin]) p2mg.color = SKIN_COLORS[p2Skin];
      p2mg.weaponTheme = (p2WeaponSkin && p2WeaponSkin !== 'default') ? p2WeaponSkin : null;
      applyClass(p2mg, _p2ResolvedClass);
      players = [p1, p2mg];
      if (minigameType === 'koth' || minigameType === 'chaos') { p1.target = p2mg; p2mg.target = p1; }
      else if (minigameType === 'sports') {
        p1.lives = 99; p2mg.lives = 99;
        p1.target = p2mg; p2mg.target = p1;
      } else { p1.target = null; p2mg.target = null; } // survival: both target enemies
    } else {
      // Survival solo
      players = [p1];
      p1.target = null;
    }
    initMinigame();
  } else if (isBattleRoyaleMode) {
    p1.isAI  = false;
    p1.lives = 1;
    players  = [p1];
    p1.target = null;
    if (typeof initBattleRoyale === 'function') initBattleRoyale();
  } else if (gameMode === 'escort') {
    // Escort: single player only — NPC and enemies spawned by initEscortMode() later
    p1.isAI   = false;
    p1.lives  = (typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter && _activeStory2Chapter.playerLives) || chosenLives;
    players   = [p1];
    p1.target = null;
    minions.length = 0;
    if (typeof escortCleanup === 'function') escortCleanup(); // reset any prior escort state
  } else if (isGodMode) {
    // God encounter — P1 vs God (in minions), optional Paradox ally.
    // Story God fight (ch.isGodFight): keep the story's lives, story-scale God's HP,
    // and spawn the story ally (Axiom) instead of the standalone godslayer loadout.
    const _storyGod = storyModeActive && typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter && !!_activeStory2Chapter.isGodFight;
    p1.isAI  = false;
    p1.lives = _storyGod ? chosenLives : 10;
    p1._teamId = 1;
    if (!_storyGod) {
      p1.armorPieces = ['helmet', 'chestplate', 'leggings'];
      p1.armorStyle  = 'godslayer';
      if (window.GODSLAYER_WEAPON) {
        p1.weapon    = window.GODSLAYER_WEAPON;
        p1.weaponKey = '_godslayer';
        p1._ammo     = 0;
      }
    }
    players = [p1];
    p1.target = null;
    // Spawn God into minions — spawnGod() enforces singleton and spawns near player
    let _godRef = null;
    if (typeof spawnGod === 'function') {
      _godRef = spawnGod(false);
      if (_godRef && typeof _godWasAlive !== 'undefined') _godWasAlive = true;
      if (_storyGod && _godRef) {
        const _gh = _activeStory2Chapter.godStoryHealth || 1400;
        _godRef.maxHealth = _gh; _godRef.health = _gh;
        _godRef._storyGod = true;
        _godRef.target = p1;
        // Always fight God's full phase-2 form here: _phase is normally derived from
        // the godEncountered/sovereignBeaten unlocks, and phase 1 carries the
        // standalone easter-egg stats (1e15 HP, 9999x damage) that instantly kill a
        // 1-life story player. Damage is rescaled for a ~150-HP story hero — the
        // authored special-attack base values (85–160) stay lethal-but-dodgeable at 1x.
        _godRef._phase   = 2;
        _godRef.dmgMult  = 1.0;
        _godRef.kbBonus  = 1.2;
        _godRef.kbResist = 0.7;
        // Apex-scale presentation: godStoryHealth-sized hitbox + uniform draw scale
        _godRef._scale = 1.6;
        _godRef.w = Math.round(_godRef.w * 1.6);
        _godRef.h = Math.round(_godRef.h * 1.6);
      }
    }
    if (_storyGod) {
      // Story ally (Axiom) fights beside the player against God
      if (typeof storyAllyDef !== 'undefined' && storyAllyDef) {
        const _sad = storyAllyDef;
        const _spA = pickSafeSpawn('left', p1.x) || { x: 250, y: 300 };
        const pA = new Fighter(_spA.x, _spA.y, _sad.color || '#ffd27f', _sad.weaponKey || 'sword',
          { left:'j', right:'l', jump:'i', attack:'u', shield:'k', ability:'o', super:'[' }, true, _sad.aiDiff || 'expert');
        pA.playerNum = 4; pA.name = _sad.name || 'Ally'; pA.lives = 1;
        pA.spawnX = _spA.x; pA.spawnY = _spA.y; pA.y = _spA.y - pA.h;
        if (_sad.classKey) applyClass(pA, _sad.classKey);
        if (_sad.health) { pA.maxHealth = _sad.health; pA.health = _sad.health; }
        pA.storyFaction = 'player'; pA._teamId = 1; pA.isStoryAlly = true; pA.isMinion = true;
        pA.target = _godRef;
        minions.push(pA);
      }
    } else if (typeof _isGodPhase2 === 'function' && _isGodPhase2() && typeof GodParadoxAlly !== 'undefined') {
      // Phase 2: spawn Paradox as ally
      const _ally = new GodParadoxAlly(300, 200);
      _ally._teamId = 1;
      minions.push(_ally);
    }
  } else if (isAbsoluteAxiomMode) {
    // Absolute Axiom encounter — P1 vs Absolute Axiom directly
    p1.isAI    = false;
    p1._teamId = 1;
    if (!storyModeActive) {
      // Standalone mode: give the player the full godslayer loadout and extra lives
      p1.lives = 10;
      p1.armorPieces = ['helmet', 'chestplate', 'leggings'];
      p1.armorStyle  = 'godslayer';
      if (window.GODSLAYER_WEAPON) {
        p1.weapon    = window.GODSLAYER_WEAPON;
        p1.weaponKey = '_godslayer';
        p1._ammo     = 0;
      }
    }
    players = [p1];
    p1.target = null;
    minions.length = 0;
    if (typeof AbsoluteAxiom !== 'undefined') {
      const _aa = new AbsoluteAxiom(600, 200);
      _aa._teamId = 50;
      minions.push(_aa);
      window._absoluteAxiomWasAlive = true;
      if (!storyModeActive && typeof _activateRGSForMatch === 'function') _activateRGSForMatch();
    }
    // Story: Paradox manifestation ally (ch.paradoxManifest) — the fragment is the
    // projector, Paradox's remaining energy is the fuel. 'fading' = starts nearly spent.
    if (storyModeActive && typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter &&
        _activeStory2Chapter.paradoxManifest && typeof ParadoxManifestation !== 'undefined') {
      const _pmEnergy = _activeStory2Chapter.paradoxManifest === 'fading' ? 45 : 100;
      const _pm = new ParadoxManifestation(260, 220, _pmEnergy);
      minions.push(_pm);
    }
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
    // Lever 2: late-game named/elite story opponents get the base AdaptiveAI brain
    // (real-time player profiling). NEVER SovereignMK2 here — that stays Sovereign-only.
    // Opt out per chapter with `noAdaptive: true`.
    const _l2Ctx = (typeof storyChapterCtx !== 'undefined' && storyChapterCtx) ? storyChapterCtx : null;
    const _l2ElitePhase = typeof storyPendingPhaseConfig !== 'undefined' && storyPendingPhaseConfig
      && (storyPendingPhaseConfig.type === 'elite_wave' || storyPendingPhaseConfig.type === 'mini_boss');
    const _storyAdaptiveElite = storyModeActive && isBot
      && typeof AdaptiveAI === 'function'
      && _l2Ctx && !_l2Ctx.noAdaptive && _l2Ctx.origId >= 45
      && (!!storyOpponentName || _l2ElitePhase);
    p2 = _storyAdaptiveElite
      ? new AdaptiveAI(720, 300, c2, w2)
      : new Fighter(720, 300, c2, w2, { left:'j', right:'l', jump:'i', attack:'u', shield:'k', ability:'o', super:'[' }, isBot, diff);
    // In story two-enemy fights, cap p2 lives so total enemy lives ≤ player lives
    const _p2StoryLives = (storyModeActive && storyTwoEnemies) ? Math.max(1, Math.floor(chosenLives / 2)) : chosenLives;
    p2.playerNum = 2; p2.name = p2IsBot ? 'BOT' : 'P2'; p2.lives = _p2StoryLives;
    { const _sp2 = pickSafeSpawn('right', _p1SpawnPos.x) || { x: 720, y: 300 };
      p2.spawnX = _sp2.x; p2.spawnY = _sp2.y; p2.x = _sp2.x; p2.y = _sp2.y - p2.h; }
    p2.hat  = document.getElementById('p2Hat')?.value  || 'none';
    p2.cape = document.getElementById('p2Cape')?.value || 'none';
    if (p2Skin !== 'default' && SKIN_COLORS[p2Skin]) p2.color = SKIN_COLORS[p2Skin];
    p2.weaponTheme = (p2WeaponSkin && p2WeaponSkin !== 'default') ? p2WeaponSkin : null;
    applyClass(p2, _p2ResolvedClass);
    if (p2.charClass === 'megaknight') { p2.y = -120; p2.vy = 2; p2._spawnFalling = true; p2.invincible = 200; SoundManager.megaknightFall && SoundManager.megaknightFall(); }
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
    // Story opponent name, color, and character appearance
    if (storyModeActive && storyOpponentName)  p2.name    = storyOpponentName;
    if (storyModeActive && storyOpponentColor) p2.color   = storyOpponentColor;
    if (storyModeActive && storyCharId)        p2.storyCharId = storyCharId;
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
        { left:'j', right:'l', jump:'i', attack:'u', shield:'k', ability:'o', super:'[' },
        true, _p3d);
      // In story two-enemy fights the player must have lives ≥ total enemy lives.
      // Cap each enemy at floor(playerLives/2) so 2 enemies never exceed the player's total.
      const _p3Lives = storyModeActive ? Math.max(1, Math.floor(chosenLives / 2)) : chosenLives;
      p3.playerNum = 3; p3.name = _sed.name || 'ENEMY B'; p3.lives = _p3Lives;
      p3.spawnX = _sp3.x; p3.spawnY = _sp3.y; p3.y = _sp3.y - p3.h;
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

    // Story ally: spawn an AI fighter on the player's side (companion chapters, ch.allyDef)
    if (storyModeActive && typeof storyAllyDef !== 'undefined' && storyAllyDef) {
      const _sad = storyAllyDef;
      const _spA = pickSafeSpawn('left', p2.x) || { x: 250, y: 300 };
      const pA = new Fighter(_spA.x, _spA.y, _sad.color || '#ffd27f', _sad.weaponKey || 'sword',
        { left:'j', right:'l', jump:'i', attack:'u', shield:'k', ability:'o', super:'[' },
        true, _sad.aiDiff || 'expert');
      pA.playerNum = 4; pA.name = _sad.name || 'Ally'; pA.lives = 1;
      pA.spawnX = _spA.x; pA.spawnY = _spA.y; pA.y = _spA.y - pA.h;
      if (_sad.classKey) applyClass(pA, _sad.classKey);
      if (_sad.health) { pA.maxHealth = _sad.health; pA.health = _sad.health; }
      pA.storyFaction = 'player'; pA._teamId = 1;
      pA.isStoryAlly = true;
      players.push(pA);
      pA.target = p2;
    }
  }

  // Assign bot personalities — each AI fighter gets a random personality
  const PERSONALITIES = ['aggressive', 'defensive', 'trickster', 'sniper'];
  for (const p of players) {
    if (p.isAI && !p.isBoss && !p.isTrueForm && !p.isMinion) {
      p.personality = randChoice(PERSONALITIES);
    }
  }

  // Offline safety net: nothing may stay flagged network-driven once the session
  // is gone (entities carried over from a previous online match, etc.).
  if (!_onlinePeerPresent) {
    for (const p of players) { if (p && p.isRemote) p.isRemote = false; }
  }
  // Online mode: mark which player is remote so gameLoop applies network state
  if (_onlinePeerPresent) {
    // Only remap human (non-boss, non-trueform) players — boss/TrueForm always stay AI
    const humanPlayers = players.filter(p => p && !p.isBoss && !p.isTrueForm);
    const localIdx  = onlineLocalSlot;  // 0 = host, 1 = guest
    const remoteIdx = 1 - localIdx;
    if (humanPlayers[localIdx]) {
      humanPlayers[localIdx].isRemote = false;
      humanPlayers[localIdx].controls = {
        left: 'a', right: 'd', jump: 'w', attack: ' ',
        shield: 's', ability: 'q', super: 'e',
      };
      humanPlayers[localIdx].isAI = false;
    }
    if (humanPlayers[remoteIdx]) {
      humanPlayers[remoteIdx].isRemote  = true;
      humanPlayers[remoteIdx].isAI      = false; // network drives this player, not AI
      humanPlayers[remoteIdx].controls  = {};    // no local keyboard input
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
  if (p2 && ladderDef) {
    p2.name  = ladderDef.name.toUpperCase();
    p2.lives = p2._maxLives = ladderDef.lives;
  }
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
  if (!isRandLoadout) {
    const _p2WeaponEl = document.getElementById('p2Weapon');
    const _p2WeaponVal = _p2WeaponEl?.value;
    if (p2 && !p2.isBoss && _p2WeaponVal && _p2WeaponVal !== 'random') {
      const _w2Obj = (w2 && w2.startsWith('_custom_') && window.CUSTOM_WEAPONS && window.CUSTOM_WEAPONS[w2])
                     ? window.CUSTOM_WEAPONS[w2]
                     : (typeof WEAPONS !== 'undefined' && WEAPONS[w2] ? WEAPONS[w2] : null);
      if (_w2Obj) { p2.weaponKey = w2; p2.weapon = _w2Obj; p2._ammo = p2.weapon.clipSize || 0; }
    }
  }

  gameRunning = true;
  if (typeof ReplaySystem !== 'undefined') ReplaySystem.startRecording();
  // Paradox companion: speak on boss start
  if ((gameMode === 'boss' || gameMode === 'trueform') &&
      typeof paradoxOnBossStart === 'function') {
    paradoxOnBossStart();
  }
  // Start appropriate background music
  if (gameMode === 'boss' || gameMode === 'trueform' || gameMode === 'god') {
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
