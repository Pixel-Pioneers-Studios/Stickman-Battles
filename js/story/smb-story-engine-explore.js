'use strict';
// smb-story-engine-explore.js — Exploration chapter: platform gen, enemy scaling, side portal, _launchExplorationChapter
// Depends on: smb-globals.js, smb-story-registry.js (and preceding story-engine splits)

// ============================================================
// EXPLORATION CHAPTER SYSTEM
// ============================================================

function _exploreGenPlatforms(worldLen, seed, ch) {
  // Deterministic seeded pseudo-random (LCG)
  let s = (seed * 1234567 + 89101) | 0;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  const plats = [];
  const mode = ch && ch.exploreMode ? ch.exploreMode : 'exploration';

  // ── Solid floor (no gaps — players should never fall into the void) ──────
  plats.push({ x: 0, y: 440, w: worldLen, h: 80, isFloor: true });

  if (mode === 'survival') {
    // Compact enclosed arena for wave-defence (worldLen = 900)
    plats.push({ x: 90,  y: 330, w: 150, h: 16 });
    plats.push({ x: 375, y: 265, w: 150, h: 16 });
    plats.push({ x: 660, y: 330, w: 150, h: 16 });
    plats.push({ x: 220, y: 190, w: 110, h: 14 });
    plats.push({ x: 570, y: 190, w: 110, h: 14 });
    return plats;
  }

  if (mode === 'parkour') {
    for (let wx = 220; wx < worldLen - 420; wx += 170 + Math.floor(rng() * 85)) {
      plats.push({
        x: wx + Math.floor(rng() * 45),
        y: 330 - Math.floor(rng() * 155),
        w: 95 + Math.floor(rng() * 55),
        h: 16,
      });
      if (rng() < 0.55) {
        plats.push({
          x: wx + 65 + Math.floor(rng() * 40),
          y: 210 - Math.floor(rng() * 90),
          w: 72 + Math.floor(rng() * 44),
          h: 14,
        });
      }
    }
  } else {
    const exploreStyle = ch && ch.exploreStyle ? ch.exploreStyle : 'generic';
    const isCity = exploreStyle === 'city';

    if (isCity) {
      // ── City-style: wide rooftop sections at consistent height with gaps ──
      for (let wx = 200; wx < worldLen - 400; wx += 300 + Math.floor(rng() * 180)) {
        const bldW = 220 + Math.floor(rng() * 160);
        const bldY = 370 + Math.floor(rng() * 30);
        plats.push({ x: wx, y: bldY, w: bldW, h: 20 });
        if (rng() < 0.5) {
          plats.push({ x: wx + 40 + Math.floor(rng() * 60), y: bldY - 80, w: 100 + Math.floor(rng() * 60), h: 16 });
        }
      }
    } else {
      // ── Mid-level platforms ─────────────────────────────────────────────────
      for (let wx = 250; wx < worldLen - 500; wx += 240 + Math.floor(rng() * 200)) {
        plats.push({
          x: wx + Math.floor(rng() * 80),
          y: 290 + Math.floor((rng() - 0.5) * 80),
          w: 100 + Math.floor(rng() * 80),
          h: 18,
        });
      }

      // ── High platforms ──────────────────────────────────────────────────────
      for (let wx = 500; wx < worldLen - 700; wx += 380 + Math.floor(rng() * 280)) {
        plats.push({
          x: wx + Math.floor(rng() * 120),
          y: 170 + Math.floor((rng() - 0.5) * 70),
          w: 85 + Math.floor(rng() * 70),
          h: 15,
        });
      }
    }

    if (mode === 'objective') {
      const goalBase = worldLen - 620;
      plats.push({ x: goalBase, y: 320, w: 180, h: 18 });
      plats.push({ x: goalBase + 70, y: 235, w: 140, h: 16 });
      plats.push({ x: goalBase + 200, y: 285, w: 110, h: 16 });
    }
  }

  return plats;
}

// Story AI intelligence floor by (original) chapter index — early chapters keep
// dumb bots, later chapters sharpen toward the dumb-AI ceiling ('expert').
// Breakpoints mirror the survival-wave _diffTier. Only raises toward the tier;
// never lowers an author's deliberately-set aiDiff. Elites read one tier sharper.
const _STORY_AI_RANK = ['easy', 'medium', 'hard', 'expert'];
function _storyFloorAiDiff(current, chapterId, elite) {
  const id = chapterId || 0;
  let tier = (id >= 45 ? 3 : id >= 25 ? 2 : id >= 10 ? 1 : 0) + (elite ? 1 : 0);
  if (tier > 3) tier = 3;
  return _STORY_AI_RANK[Math.max(_STORY_AI_RANK.indexOf(current), tier)];
}

function _storyScaleEnemyUnit(unit, chapterId, opts = {}) {
  if (!unit) return unit;
  const elite = !!opts.elite;

  // Use the ORIGINAL chapter id for scaling — after phase expansion, _activeStory2Chapter.id
  // can be 200+ (each original chapter fans into ~3 phases), which would give 17× multipliers
  // and produce 2000+ HP elites. _origId tracks the pre-expansion index (0–79).
  const origId = (typeof _activeStory2Chapter !== 'undefined'
    && _activeStory2Chapter
    && _activeStory2Chapter._origId !== undefined)
    ? _activeStory2Chapter._origId
    : Math.min(chapterId, 84); // hard-cap fallback to prevent runaway scaling

  const s = getScaling(origId + (_storyPerformanceBonus() / 0.08 | 0));
  const PLAYER_HP = 100; // Fighter base maxHealth

  // ── HP ───────────────────────────────────────────────────────
  // Standard enemy: capped at 2× player HP (200).  Elite: 3× (300).
  const hpBase = unit.maxHealth || unit.health || 100;
  const rawHP  = Math.round(hpBase * (s.enemyHP / 100) * (elite ? 1.5 : 1));
  unit.maxHealth = Math.min(rawHP, elite ? PLAYER_HP * 3 : PLAYER_HP * 2);
  unit.health    = unit.maxHealth;

  // ── Damage ───────────────────────────────────────────────────
  // Standard: ≤ 25% player HP per hit.  Elite: ≤ 32% (still survivable with 2 hits).
  const dmgCap    = elite ? PLAYER_HP * 0.32 : PLAYER_HP * 0.25;
  const scaledDmg = Math.min(s.enemyDamage, dmgCap);
  unit.dmgMult    = (unit.dmgMult || 1) * (scaledDmg / 12); // 12 = median base weapon damage

  // ── Attack speed / AI ────────────────────────────────────────
  unit.attackCooldownMult = Math.max(0.58, (unit.attackCooldownMult || 1) * (elite ? 0.72 : 0.86));
  unit.aiDiff             = _storyFloorAiDiff(unit.aiDiff, origId, elite);
  unit.aiReact            = elite ? 0 : unit.aiReact;
  unit._storyElite        = elite;
  unit._storyPredict      = 0.10 + Math.min(0.18, origId * 0.0035) + (elite ? 0.12 : 0);
  unit._storyDodgeChance  = elite ? 0.14 : 0.05;
  return unit;
}

function _storyPhaseExploreCap(chId) {
  if (chId < 10) return 2;
  if (chId < 22) return 3;
  if (chId < 35) return 4;
  if (chId < 50) return 5;
  return 6;
}

function _storyBuildSidePortal(ch) {
  if (!ch || ch.id < 6 || Math.random() < 0.45) return null;
  const type = ch.id >= 22 && Math.random() < 0.35 ? 'distorted_rift'
    : Math.random() < 0.5 ? 'elite_gauntlet' : 'survival';
  return {
    x: Math.floor((ch.worldLength || 5200) * (0.35 + Math.random() * 0.35)),
    y: 260,
    type,
    reward: type === 'distorted_rift' ? 55 + ch.id * 3 : 32 + ch.id * 2,
    active: true,
    entered: false,
  };
}

function _storyEnterSidePortal(portal, p1, ch) {
  if (!portal || portal.entered || !p1) return;
  portal.entered = true;
  portal.active = false;
  portal.challengeActive = true;
  const isBossRift = portal.type === 'distorted_rift';
  const eliteA = _storyCloneEnemyDef(ch, {
    name: isBossRift ? 'Distorted Veran Echo' : 'Rift Elite',
    weaponKey: isBossRift ? 'spear' : 'axe',
    classKey: isBossRift ? 'warrior' : 'berserker',
    aiDiff: ch.id >= 25 ? 'expert' : 'hard',
    color: isBossRift ? '#8844ff' : '#aa6633',
    isElite: true,
  });
  const eliteB = _storyCloneEnemyDef(eliteA, {
    name: isBossRift ? 'Fracture Warden' : 'Elite Reinforcement',
    weaponKey: 'hammer',
    classKey: 'tank',
    color: '#665577',
    isElite: true,
  });
  storyFightSubtitle = {
    text: isBossRift
      ? 'Distorted Rift opened. Clear the weakened boss echo for a rare reward.'
      : 'Side portal entered. Survive the encounter for bonus coins.',
    timer: 220,
    maxTimer: 220,
    color: isBossRift ? '#ff88ff' : '#88ffcc'
  };
  _exploreSpawnEnemy({ ...eliteA, wx: p1.x + 140, health: isBossRift ? 220 : 150, isElite: true, isSidePortalEnemy: true }, p1);
  if (!isBossRift) _exploreSpawnEnemy({ ...eliteB, wx: p1.x + 220, health: 160, isElite: true, isSidePortalEnemy: true }, p1);
}

function _launchExplorationChapter(ch) {
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  // Apply world modifiers for this chapter
  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;

  // Apply multiverse arc
  const _arcEx = getStoryArc(ch.id);
  if (_arcEx) storyCurrentArc = _arcEx.id;

  const worldLen = ch.worldLength || 9000;
  const goalX    = ch.objectX    || (worldLen - 350);
  const plats    = _exploreGenPlatforms(worldLen, ch.id, ch);

  // Inject exploration arena into ARENAS under temp key
  const arenaKey = '__explore__';
  ARENAS[arenaKey] = {
    sky:           ch.sky         || ['#0a0a1e', '#1a1a2e'],
    groundColor:   ch.groundColor || '#333344',
    platColor:     ch.platColor   || '#445566',
    worldWidth:    worldLen,
    mapLeft:       GAME_W / 2,
    mapRight:      worldLen - 50, // let player reach the full world including goalX
    deathY:        640,
    isStoryOnly:   true,
    isExploreArena: true,
    exploreStyle:  ch.style || 'city',
    platforms:     plats,
  };
  if (typeof ARENA_BASE_PLATFORMS !== 'undefined') {
    ARENA_BASE_PLATFORMS[arenaKey] = plats.map(p => ({ ...p }));
  }

  // Set exploration globals
  exploreActive    = true;
  exploreWorldLen  = worldLen;
  exploreGoalX     = goalX;
  exploreGoalName  = ch.objectName || 'Exit';
  exploreGoalFound = false;
  exploreCheckpoints = [];
  exploreCheckpointIdx = -1;
  const checkpointCount = ch.worldLength >= 5200 ? 2 : 1;
  for (let i = 1; i <= checkpointCount; i++) {
    exploreCheckpoints.push({ x: Math.floor((worldLen * i) / (checkpointCount + 1)), hit: false });
  }
  // Strip ranged weapons from exploration enemies if this chapter hasn't been beaten yet
  const _expBeaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
  exploreSpawnQ = (ch.spawnEnemies || []).map(e => {
    if (_expBeaten) return e;
    const isRng = typeof WEAPONS !== 'undefined' && WEAPONS[e.weaponKey] && WEAPONS[e.weaponKey].type === 'ranged';
    return isRng ? Object.assign({}, e, { weaponKey: 'sword' }) : e;
  });
  exploreEnemyCap  = _storyPhaseExploreCap(ch.id);
  exploreCombatQuiet = 0;
  exploreAmbushTimer = 0;
  exploreArenaLock = null;
  exploreSidePortals = [];
  storyChaseTimer    = (ch.chaseTimer > 0) ? ch.chaseTimer : 0;
  storyChaseMaxTimer = storyChaseTimer;
  storeSurvivalState = null; // cleared for every exploration chapter; set below for survival

  // Reset all special-mode active flags so stale state never leaks between chapters
  stealthModeActive  = false;
  escapeModeActive   = false;
  defenseModeActive  = false;
  scavengeModeActive = false;
  puzzleModeActive   = false;

  // New modes: initialise after startGame() via setTimeout
  const _exploreMode = ch.exploreMode;

  // Walk→fight→walk duel wrapper: one checkpoint locks the arena and spawns the
  // chapter's real opponent; generic pressure/ambush spawns are suppressed.
  exploreDuelMode = (ch.exploreMode === 'duel' || ch.walkFight === true);
  exploreDuelOpponent = exploreDuelMode ? {
    name:      ch.opponentName  || 'Enemy',
    weaponKey: ch.weaponKey     || 'sword',
    classKey:  ch.classKey      || 'warrior',
    aiDiff:    ch.aiDiff        || 'medium',
    color:     ch.opponentColor || '#cc4444',
    health:    ch.opponentHealth || 140,
  } : null;

  // Loot: coins (money), an EXP orb, and a post-fight healing crystal along the walk path.
  // Persistent health: carry HP from the previous walk→fight chapter (applied on the
  // first exploration frame, once the player exists — full if none saved).
  exploreSeedHealth = (exploreDuelMode && _story2.health != null) ? _story2.health : null;

  explorePickups = [];
  if (exploreDuelMode) {
    const _cpX = exploreCheckpoints[0] ? exploreCheckpoints[0].x : Math.floor(worldLen / 2);
    const _loot = [
      { x: Math.floor(worldLen * 0.20), y: 356, type: 'coin', icon: '🪙', value: 6 },
      { x: Math.floor(worldLen * 0.34), y: 356, type: 'xp',   icon: '✦',  value: 10 },
      { x: Math.min(worldLen - 220, _cpX + 520), y: 356, type: 'heal', icon: '💠', value: 60 },
      { x: Math.floor(worldLen * 0.88), y: 356, type: 'coin', icon: '🪙', value: 6 }
    ];
    // One-time loot: a taken pickup stays gone forever (persisted per chapter+index).
    _story2.lootTaken = _story2.lootTaken || {};
    _loot.forEach((it, i) => {
      it.key = ch.id + ':' + i;
      it.collected = !!_story2.lootTaken[it.key];
      explorePickups.push(it);
    });
  }

  if (ch.exploreMode === 'survival') {
    // Lock the camera to the compact 900px arena — no scrolling
    ARENAS[arenaKey].mapLeft   = 0;
    ARENAS[arenaKey].mapRight  = GAME_W;
    ARENAS[arenaKey].worldWidth = GAME_W;
    exploreGoalX   = 999999; // unreachable — wave-clear is the win condition
    exploreGoalName = 'All Waves';
    exploreCheckpoints = []; // no checkpoints in survival
    exploreEnemyCap = Math.max(6, (ch.waveSize || 2) * 2 + 2);
    const _diffTier = ch.id >= 45 ? 'expert' : ch.id >= 25 ? 'hard' : ch.id >= 10 ? 'medium' : 'easy';
    storeSurvivalState = {
      active:     true,
      state:      'countdown', // 'countdown' | 'active' | 'between' | 'victory'
      wave:       0,
      totalWaves: ch.survivalWaves || 3,
      waveSize:   ch.waveSize      || 2,
      timer:      90, // frames before first wave
      baseEnemy: {
        name:      ch.opponentName  || 'Wave Enemy',
        weaponKey: ch.weaponKey     || 'sword',
        classKey:  ch.classKey      || 'warrior',
        aiDiff:    ch.aiDiff        || _diffTier,
        color:     ch.opponentColor || '#778899',
        armor:     ch.armor         || [],
      },
    };
  }

  if (!exploreDuelMode) {
    const sidePortal = _storyBuildSidePortal(ch);
    if (sidePortal) exploreSidePortals.push(sidePortal);
  }

  // Game config
  selectedArena = arenaKey;
  gameMode      = 'exploration';
  p2IsBot       = false;

  // Ability progression (mirror fight chapter logic) — skill tree only
  const id  = ch._origId !== undefined ? ch._origId : ch.id; // use original id for difficulty scaling
  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    weapon:       null,
    noDoubleJump: !_sk.doubleJump,
    noAbility:    !_sk.weaponAbility,
    noSuper:      !_sk.superMeter,
    noClass:      !_sk.classUnlock,
    noDodge:      !_sk.dodge,
    dmgMult:      1.0 + (_sk.heavyHit2 ? 0.25 : _sk.heavyHit1 ? 0.15 : 0),
    speedMult:    1.0 + (_sk.fastMove2 ? 0.20 : _sk.fastMove1 ? 0.10 : 0),
    jumpMult:     1.0 + (_sk.highJump2 ? 0.25 : _sk.highJump1 ? 0.15 : 0),
  };

  // Ability toasts are now shown only when purchased in the skill tree

  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(id / 5) + 1);
  storyFightScript    = ch.fightScript  || [];
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;
  if (ch.preText) {
    storyFightSubtitle = { text: ch.preText, timer: 220, maxTimer: 220, color: '#dde8ff' };
  }
  storyEnemyArmor     = [];
  storyTwoEnemies     = false;
  storySecondEnemyDef = null;
  storyAllyDef        = null;

  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;

  startGame();
  setTimeout(() => {
    if (players[0]) _applySkillTreeToPlayer(players[0]);
    // Initialise special explore modes after players[] is populated
    if (_exploreMode === 'stealth'  && typeof initStealthMode  === 'function') initStealthMode(ch);
    if (_exploreMode === 'escape'   && typeof initEscapeMode   === 'function') initEscapeMode(ch);
    if (_exploreMode === 'defense'  && typeof initDefenseMode  === 'function') initDefenseMode(ch);
    if (_exploreMode === 'scavenge' && typeof initScavengeMode === 'function') initScavengeMode(ch);
    if (_exploreMode === 'puzzle'   && typeof initPuzzleMode   === 'function') initPuzzleMode(ch);
  }, 80);
}

// Called each frame from gameLoop when gameMode === 'exploration'
