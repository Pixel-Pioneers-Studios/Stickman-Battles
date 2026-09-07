'use strict';
// smb-story-engine-flow.js — Chapter launch flow: _startStoryGauntlet → _launchChapter2Fight (immediate)
// Depends on: smb-globals.js, smb-story-registry.js (and preceding story-engine splits)

// ── Story character ID lookup — maps opponent names to visual appearance IDs ──
const _STORY_CHAR_NAME_MAP = {
  'Veran — The Architect': 'veran',
  'Veran':                 'veran',
  'Herald of Nothing':     'herald',
  'Second Architect':      'second_architect',
  'Third Architect':       'third_architect',
  'The Enforcer':          'enforcer',
  'God':                   'god',
  'Absolute Axiom':        'absolute_axiom',
  'Null':                  'null_companion',
  'VAEL':                  'vael',
  'Seraph':                'seraph',
  'Thresh':                'thresh',
};
function _resolveStoryCharId(name) {
  return _STORY_CHAR_NAME_MAP[name] || null;
}

// ── Chapter flow ──────────────────────────────────────────────────────────────
let _narrativeActive = false; // guard against re-entrant narrative calls
const _seenNarrativeIds = new Set(); // chapters whose narrative was already shown this session

function _startStoryGauntlet(ch) {
  if (!ch) return;
  const phases = _storyBuildPhases(ch);
  storyGauntletState = {
    chapterId: ch.id,
    phases,
    index: 0,
    carryHealthPct: _storyGetCarryHealthPct(),
    sideRewards: [],
  };
  _storyUpdatePhaseIndicator();
  _launchStoryGauntletPhase(ch);
}

function _storyPhaseLaunchConfig(ch, phase) {
  const phaseType = phase.type;
  const traversalLike = phaseType === 'traversal' || phaseType === 'chase' || phaseType === 'parkour';
  if (traversalLike) {
    const traversalChapter = {
      ...ch,
      type: 'exploration',
      noFight: false,
      preText: `${phase.label || 'Advance'} — ${_storyPhaseName(phase.type)}`,
      worldLength: phase.worldLength || Math.max(5200, Math.floor((ch.worldLength || 4600) * 0.75)),
      objectName: phase.objectName || ch.objectName || 'Forward Route',
      spawnEnemies: phase.spawnEnemies || ch.spawnEnemies || [],
      playerLives: phase.playerLives || ch.playerLives || 3,
      fightScript: [...(ch.fightScript || [])],
    };
    if (phaseType === 'chase') {
      traversalChapter.chaseTimer  = phase.timeLimit || 1800; // 30s at 60fps
      traversalChapter.exploreMode = 'chase';
    }
    if (phaseType === 'parkour') {
      traversalChapter.exploreMode = 'parkour';
    }
    return { mode: 'exploration', chapter: traversalChapter };
  }

  if (phaseType === 'survival_wave') {
    const survivalChapter = {
      ...ch,
      type:          'exploration',
      exploreMode:   'survival',
      worldLength:   900,
      objectName:    'Survive All Waves',
      spawnEnemies:  [],
      survivalWaves: phase.waves      || 3,
      waveSize:      phase.waveSize   || 2,
      arena:         phase.arena      || ch.arena,
      playerLives:   phase.playerLives || ch.playerLives || 3,
      fightScript:   [...(ch.fightScript || [])],
      preText:       phase.label || 'Hold the arena. Survive all waves.',
    };
    return { mode: 'exploration', chapter: survivalChapter };
  }

  const launch = {
    ...ch,
    type: 'fight',
    noFight: false,
    preText: `${phase.label || _storyPhaseName(phaseType)}`,
    playerLives: phase.playerLives || ch.playerLives || 3,
    arena: phase.arena || ch.arena,
    isBossFight: false,
    isTrueFormFight: false,
    isSovereignFight: false,
    twoEnemies: Array.isArray(phase.opponents) && phase.opponents.length > 1,
    secondEnemy: Array.isArray(phase.opponents) && phase.opponents.length > 1 ? phase.opponents[1] : null,
  };
  if (Array.isArray(phase.opponents) && phase.opponents[0]) {
    const lead = phase.opponents[0];
    launch.opponentName = lead.name || ch.opponentName || 'Enemy';
    launch.weaponKey = lead.weaponKey || ch.weaponKey || 'sword';
    launch.classKey = lead.classKey || ch.classKey || 'warrior';
    launch.aiDiff = lead.aiDiff || ch.aiDiff || 'medium';
    launch.opponentColor = lead.color || ch.opponentColor || '#778899';
    launch.armor = lead.armor || [];
  }
  if (phase.finalChapter) {
    launch.isBossFight = !!ch.isBossFight;
    launch.isTrueFormFight = !!ch.isTrueFormFight;
    launch.isSovereignFight = !!ch.isSovereignFight;
    if (!launch.opponentName && ch.opponentName) launch.opponentName = ch.opponentName;
    if (!launch.weaponKey && ch.weaponKey) launch.weaponKey = ch.weaponKey;
    if (!launch.classKey && ch.classKey) launch.classKey = ch.classKey;
  }
  return { mode: 'chapter', chapter: launch };
}

function _launchStoryGauntletPhase(ch) {
  const phase = _storyGetCurrentPhase();
  if (!phase) return;
  _storyUpdatePhaseIndicator();
  storyPendingPhaseConfig = phase;
  const cfg = _storyPhaseLaunchConfig(ch, phase);
  if (cfg.mode === 'exploration') _launchExplorationChapter(cfg.chapter);
  else _launchChapter2Fight(cfg.chapter);
}

function _advanceStoryGauntletPhase(ch) {
  if (!storyGauntletState) return false;
  storyGauntletState.index++;
  if (storyGauntletState.index >= storyGauntletState.phases.length) {
    storyPendingPhaseConfig = null;
    storyPhaseIndicator = null;
    return false;
  }
  _storyUpdatePhaseIndicator();
  setTimeout(() => {
    const go = document.getElementById('gameOverOverlay');
    if (go) go.style.display = 'none';
    const pauseOv = document.getElementById('pauseOverlay');
    if (pauseOv) pauseOv.style.display = 'none';
    storyModeActive = true;
    window._storySeamlessNext = true; // mid-chapter phase change — never a loading screen
    _launchStoryGauntletPhase(ch);
  }, 420);
  return true;
}

// Boss/special chapters bypass the gauntlet and launch directly.
// All other fight/exploration chapters go through _startStoryGauntlet so pacing archetypes fire.
// ── Seamless story transitions ────────────────────────────────────────────────
// Story worlds are pure draw functions — nothing heavy loads between chapters,
// so story-internal launches skip the loading screen (startGame consumes
// window._storySeamlessNext). The full loading screen is reserved for:
//   • the first story launch of a session (loading into the game proper),
//   • crossing into a new ACT (a deliberate "something big is coming" beat),
//   • major set-piece boss chapters.
var _storyLastLoadedActId = null; // act id of the last chapter launched this session

function _storyIsSetPieceChapter(ch) {
  return !!(ch && (ch.isBossFight || ch.isTrueFormFight || ch.isSovereignFight ||
                   ch.isAbsoluteAxiomFight || ch.isGodFight));
}

function _storyMarkTransition(ch) {
  if (!ch) return;
  const _act   = (typeof _getActForChapter === 'function') ? _getActForChapter(ch.id) : null;
  const _actId = _act ? _act.id : null;
  const _sameAct  = _actId === _storyLastLoadedActId;
  const _setPiece = _storyIsSetPieceChapter(ch);
  const _first    = _storyLastLoadedActId === null;

  window._storySeamlessNext = !_first && _sameAct && !_setPiece;

  // An act change is a title card rather than a loading screen; everything else
  // that stays seamless gets the ink wipe.
  if (!_first && !_sameAct && !_setPiece) {
    window._storySeamlessNext   = true;
    window._storyTransitionKind = 'act';
    // Act labels read "Act III — The Fracture"; the card splits them.
    const _parts = String((_act && _act.label) || 'New Act').split('—');
    window._storyTransitionTitle  = _parts[0].trim().toUpperCase();
    window._storyTransitionSub    = (_parts[1] || '').trim();
    window._storyTransitionAccent = (_act && _act.color) || '#5cc8ff';
  } else if (window._storySeamlessNext) {
    window._storyTransitionKind = 'ink';
  } else {
    window._storyTransitionKind = null;
  }
  _storyLastLoadedActId = _actId;
}

function _launchChapterWithGauntlet(ch) {
  _storyMarkTransition(ch);
  // Walk→fight→walk chapters run through the exploration engine (one continuous
  // space with a single arena-lock duel at the midpoint) rather than the instant duel.
  if (ch.walkFight) { _launchExplorationChapter(ch); return; }
  // Exploration chapters launch through their real (stealth/escape/defense/
  // scavenge/puzzle/survival/traversal) mode via _directLaunchChapter, NOT the
  // combat gauntlet — this revives the built-but-dormant exploration engine.
  // Their authored data is preserved through expansion (see _expandStoryChaptersInPlace).
  // Special-mode chapters (assassination/gauntlet/ship_flight/escort) also
  // bypass the gauntlet — otherwise _storyBuildPhases rewrites ch.type to
  // 'fight' and collapses their authored mode into a plain duel.
  if (ch.type === 'exploration' || ch.isBossFight || ch.isTrueFormFight || ch.isSovereignFight || ch.isAbsoluteAxiomFight || ch.isGodFight || ch.type === 'interlude'
      || ch.type === 'assassination' || ch.type === 'gauntlet' || ch.type === 'ship_flight' || ch.type === 'escort'
      || ch.type === 'battleroyale') {
    _directLaunchChapter(ch);
  } else {
    _startStoryGauntlet(ch);
  }
}

// ── Saga cold opens ───────────────────────────────────────────────────────────
// Mirror of `sagaFinaleText` (see _showStory2Victory): a chapter that opens the
// ACTIVE saga can carry a `sagaColdOpen` line array that is prepended to its
// narrative, re-establishing the protagonist, what he carries and who he is
// walking towards for a player who has never played the earlier sagas.
//
// It must never fire on the combined build — there the story already opened at
// ch. 0 and a mid-story recap would be a regression. On 'full', _sagaFirstId()
// resolves to the story's own first chapter, so the `<=` test below is false for
// every chapter that carries the field; the explicit sagaIsFullBuild() guard
// states that intent rather than relying on it.
//
// smb-saga-structure.js loads AFTER this file, so both helpers guard on presence.
function _sagaFirstId() {
  if (typeof activeSagaFirstChapterId === 'function') return activeSagaFirstChapterId();
  return STORY_CHAPTERS2.reduce((m, c) => Math.min(m, c.id), Infinity);
}
function _isSagaOpener(ch) {
  if (!ch || !Array.isArray(ch.sagaColdOpen) || !ch.sagaColdOpen.length) return false;
  if (typeof sagaIsFullBuild === 'function' && sagaIsFullBuild()) return false;
  // Membership is load-bearing, not belt-and-braces: `id <= firstId` alone is true
  // for EVERY earlier saga's opener (ch. 70 qualifies on a saga3 build). Those
  // chapters are out of range and unreachable today, so the bug would only surface
  // the day one became reachable. Both tests together mean "the chapter this build
  // starts on".
  if (typeof isChapterInActiveSaga === 'function' && !isChapterInActiveSaga(ch.id)) return false;
  return ch.id <= _sagaFirstId();
}
// The narrative lines a chapter actually plays in this build.
function _sagaChapterNarrative(ch) {
  const base = (ch && ch.narrative) || [];
  if (!_isSagaOpener(ch)) return base;
  return [...ch.sagaColdOpen, '', ...base];
}

// Cutscenes play once by default; skip the opening narration when replaying an
// already-beaten chapter, unless the player turned the replay setting on.
function _cinReplaySkip(ch) {
  if (!ch) return false;
  if (typeof settings !== 'undefined' && settings && settings.replayMode) return false;
  return Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
}

function _beginChapter2(idx) {
  if (_narrativeActive) return;
  const ch = STORY_CHAPTERS2[idx];
  if (!ch) return;
  _activeStory2Chapter = ch;

  // A declared cinematic run starts here: play the whole stretch as one film
  // rather than as N click-through chapters. Guarded on the helper's presence
  // (smb-story-cinematic-sequence.js loads after this file) and self-disabling
  // if the run's chapters have drifted — see _resolveRun.
  if (typeof isStoryCinematicRunStart === 'function' && isStoryCinematicRunStart(ch.id) &&
      typeof playStoryCinematicRun === 'function') {
    if (playStoryCinematicRun(ch.id)) return;
  }

  if (ch.type === 'branch') {
    const _afterBranchNarr = () => _showBranchChoice(ch, () => _completeChapter2(ch));
    if (_cinReplaySkip(ch)) _afterBranchNarr();
    else _showStory2Narrative(_sagaChapterNarrative(ch), _afterBranchNarr);
    return;
  }

  if (ch.noFight) {
    _showStory2Narrative(_sagaChapterNarrative(ch), () => {
      if (ch._menuHidden) {
        // Silent completion — no victory screen. Mark done and chain to the next chapter.
        if (!_story2.defeated.includes(ch.id)) _story2.defeated.push(ch.id);
        _story2.tokens += ch.tokenReward || 0;
        _story2.chapter = Math.max(_story2.chapter, ch.id + 1);
        if (typeof _saveStory2 === 'function') _saveStory2();
        const _nextCh = STORY_CHAPTERS2[ch.id + 1];
        if (_nextCh) _beginChapter2(ch.id + 1);
        else if (typeof openStoryMenu === 'function') openStoryMenu();
      } else {
        _completeChapter2(ch);
      }
    });
    return;
  }

  // On retry (narrative already seen this session) or replay of a beaten chapter, skip to gauntlet
  if (_seenNarrativeIds.has(ch.id) || _cinReplaySkip(ch)) {
    _launchChapterWithGauntlet(ch);
    return;
  }

  _seenNarrativeIds.add(ch.id);
  const allLines = [..._sagaChapterNarrative(ch)];
  if (ch.preText) allLines.push(ch.preText);
  _showStory2Narrative(allLines, () => {
    _showPreFightStoreNag(ch, () => _launchChapterWithGauntlet(ch));
  });
}

// Direct launch — no gauntlet phases, just the chapter itself
function _directLaunchChapter(ch) {
  if (!ch) return;
  storyGauntletState = null;
  if (ch.type === 'interlude') {
    _launchInterludeChapter(ch);
  } else if (ch.type === 'exploration') {
    _launchExplorationChapter(ch);
  } else {
    _launchChapter2Fight(ch);
  }
}

// ── Interlude chapter launch ───────────────────────────────────────────────────
function _launchInterludeChapter(ch) {
  if (!ch) return;
  if (typeof resetInterlude === 'function') resetInterlude();

  // Select wide arena for the walk (use ch.arena if specified, else 'forest' as default)
  const arenaKey = ch.arena || 'forest';
  const arenaEl  = document.getElementById('arenaSelect');
  if (arenaEl) arenaEl.value = arenaKey;

  // Single-player walk: P1 only, no P2 enemy
  gameMode = 'exploration';
  if (typeof selectMode === 'function') selectMode('exploration');
  if (typeof selectLives === 'function') selectLives(ch.playerLives || 5);
  infiniteMode = true;

  storyModeActive = true;
  storyBossType   = null;
  storyTwoEnemies = false;

  // Ability override: abilities are gated purely by the skill tree
  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    noAbility:    !_sk.weaponAbility,
    noSuper:      true,    // no combat supers during a walk
    noClass:      !_sk.classUnlock,
    noDoubleJump: !_sk.doubleJump,
    noDodge:      !_sk.dodge,
    dmgMult:      1.0, speedMult: 1.0, jumpMult: 1.0,
  };

  if (typeof startGame === 'function') startGame();

  setTimeout(function () {
    // Init interlude state after fighters are spawned
    if (typeof initInterlude === 'function') initInterlude(ch);
    // Widen the level so the player can walk
    if (ch.worldWidth) {
      if (currentArena) currentArena.worldWidth = ch.worldWidth;
    }
  }, 150);
}

// Show narrative as an animated canvas scene (replaces the static black panel).
function _showStory2Narrative(lines, callback) {
  if (!lines || !lines.length) { _narrativeActive = false; if (callback) callback(); return; }

  _narrativeActive = true;

  if (typeof showNarrativeScene === 'function') {
    // Every between-chapter segment plays as a cutscene, not a click-through
    // reader: beats auto-advance on a reading-rate budget, the camera keeps
    // drifting, and holding click/Space scrubs. holdLastBeat stops the film on
    // its final beat and shows the ordinary Fight!/Continue button, so the
    // player still chooses the moment the match starts.
    //
    // A multi-chapter run (smb-story-cinematic-sequence.js) does NOT come
    // through here — it calls showNarrativeScene itself so it can span chapters.
    showNarrativeScene(lines, _activeStory2Chapter, function () {
      _narrativeActive = false;
      if (callback) callback();
    }, { cinematic: true, holdLastBeat: true });
  } else {
    // Fallback: legacy DOM panel if scene renderer not loaded
    const panel   = document.getElementById('storyDialoguePanel');
    const bodyEl  = document.getElementById('storyDialogueBody');
    const btn     = document.getElementById('storyDialogueFightBtn');
    if (!panel) { _narrativeActive = false; if (callback) callback(); return; }
    let idx = 0;
    function showLine() {
      if (idx >= lines.length) {
        panel.style.display = 'none';
        _narrativeActive = false;
        if (callback) callback();
        return;
      }
      bodyEl.innerHTML = `<p style="margin:0;font-size:0.93rem;color:#dde4ff;line-height:1.65;">${lines[idx]}</p>`;
      idx++;
      btn.textContent = idx < lines.length ? 'Next →' : (_activeStory2Chapter && _activeStory2Chapter.noFight ? 'Continue →' : '⚔️ Fight!');
      btn.onclick = showLine;
    }
    const chEl    = document.getElementById('storyDialogueChapter');
    const titleEl = document.getElementById('storyDialogueTitle');
    if (chEl)    chEl.textContent    = _activeStory2Chapter ? _worldIcon(_activeStory2Chapter.world) : '';
    if (titleEl) titleEl.textContent = _activeStory2Chapter ? _activeStory2Chapter.title : '';
    panel.style.display = 'flex';
    showLine();
  }
}

function _showStory2PreFight(ch) {
  // Legacy stub — now handled inline by _showStory2Narrative
  _launchChapter2Fight(ch);
}

function _showBranchChoice(ch, onComplete) {
  const choices = Array.isArray(ch.choices) && ch.choices.length ? ch.choices : [
    { label: 'Press On',  flag: `branch_${ch.id}_a`, consequence: null },
    { label: 'Step Back', flag: `branch_${ch.id}_b`, consequence: null },
  ];

  // Build overlay
  const overlay = document.createElement('div');
  overlay.id = '_storyBranchOverlay';
  overlay.style.cssText = [
    'position:fixed;inset:0;z-index:9000;display:flex;flex-direction:column',
    'align-items:center;justify-content:center;background:rgba(0,0,12,0.88)',
    'font-family:inherit;',
  ].join(';');

  const title = document.createElement('div');
  title.textContent = ch.branchPrompt || 'Choose your path.';
  title.style.cssText = 'color:#dde8ff;font-size:1.25rem;font-weight:700;margin-bottom:28px;text-align:center;max-width:520px;line-height:1.5;';
  overlay.appendChild(title);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;justify-content:center;';

  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.textContent = choice.label;
    btn.style.cssText = [
      'background:#1a2a44;border:2px solid #4466aa;color:#ccdaff',
      'padding:14px 28px;font-size:1rem;font-weight:600;border-radius:8px',
      'cursor:pointer;transition:background 0.15s,border-color 0.15s;min-width:160px;',
    ].join(';');
    btn.onmouseenter = () => { btn.style.background = '#263a5a'; btn.style.borderColor = '#88aaff'; };
    btn.onmouseleave = () => { btn.style.background = '#1a2a44'; btn.style.borderColor = '#4466aa'; };

    btn.onclick = () => {
      // Persist flag
      if (!_story2.branchFlags) _story2.branchFlags = {};
      _story2.branchFlags[choice.flag] = true;
      storyState.flags[choice.flag]    = true;
      if (typeof _saveStory2 === 'function') _saveStory2();

      if (choice.consequence) {
        title.textContent = choice.consequence;
        btnRow.style.display = 'none';
        const contBtn = document.createElement('button');
        contBtn.textContent = 'Continue →';
        contBtn.style.cssText = btn.style.cssText;
        contBtn.onclick = () => { document.body.removeChild(overlay); onComplete(); };
        overlay.appendChild(contBtn);
      } else {
        document.body.removeChild(overlay);
        onComplete();
      }
    };

    btnRow.appendChild(btn);
  });

  overlay.appendChild(btnRow);
  document.body.appendChild(overlay);
}

// ── Escort chapter launch ─────────────────────────────────────────────────────
function _launchEscortChapter(ch) {
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  // World / arc state (same as fight chapters)
  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;
  const _arc = getStoryArc(ch.id);
  if (_arc) storyCurrentArc = _arc.id;

  // Set arena
  if (ch.arena) {
    selectedArena = ch.arena;
    const arSelect = document.getElementById('arenaSelect');
    if (arSelect) arSelect.value = selectedArena;
  }

  // Fight script (story subtitles)
  storyFightScript    = Array.isArray(ch.fightScript) ? ch.fightScript.slice() : [];
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;

  // Player lives
  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;

  // Ability gate (same defaults as fight chapters) — skill tree only
  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    noDoubleJump: !_sk.doubleJump,
    noAbility:    !_sk.weaponAbility,
    noSuper:      !_sk.superMeter,
    noClass:      !_sk.classUnlock,
    noDodge:      !_sk.dodge,
    dmgMult:      1.0 + (_sk.heavyHit2 ? 0.25 : _sk.heavyHit1 ? 0.15 : 0),
    speedMult:    1.0 + (_sk.fastMove2 ? 0.20 : _sk.fastMove1 ? 0.10 : 0),
    jumpMult:     1.0 + (_sk.highJump2 ? 0.25 : _sk.highJump1 ? 0.15 : 0),
  };

  storyBossType       = null;
  storyOpponentName   = null;
  storyChapterCtx     = null;
  storyEnemyArmor     = [];
  storyTwoEnemies     = false;
  storySecondEnemyDef = null;
  storyAllyDef        = null;
  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(ch.id / 5) + 1);

  if (typeof setObjective === 'function')
    setObjective('Escort ' + ((ch.escortNPC && ch.escortNPC.name) || 'the NPC') + ' to safety');

  // Launch as escort (single-player, no P2 enemy)
  gameMode = 'escort';
  if (typeof selectMode === 'function') selectMode('escort');

  if (typeof startGame === 'function') startGame();

  // After startGame creates players[], initialise the escort engine
  setTimeout(function() {
    if (typeof initEscortMode === 'function') initEscortMode(ch);
  }, 120);
}

// ── Story mini-boss peaks ─────────────────────────────────────────────────────
// A chapter may declare `miniBoss: 'forestBeast' | 'yeti'` to add a creature-tier
// encounter on top of its normal fight. These reuse the Director's existing
// spawners (smb-data-mapperks.js), which push into minions[] and pick their own
// target, so nothing else needs wiring. Optional `miniBossHealth` scales it.
//
// Called AFTER startGame() and after players[] is populated — the spawners read
// players[] to choose a target and currentArena to choose a platform.
// ── The Trials ────────────────────────────────────────────────────────────────
// Arms a trial chapter once the world and fighters actually exist. Same retry
// budget as _storySpawnMiniBoss and for the same reason: the explore world is
// not finished until several frames after startGame(), so a fixed delay
// silently no-ops. Spec: docs/TRIALS_DESIGN.md.
function _storyArmTrial(ch) {
  if (!ch || !ch.trial || typeof trialPending === 'undefined') return;
  if (typeof resetTrialState === 'function') resetTrialState();
  // A request, not an application. updateTrials() applies it on the first frame
  // the real fighters exist — a delayed hook would set its flags on the previous
  // match's fighter objects, because startGame() rebuilds players[] a few frames
  // after this returns.
  trialPending = { kind: ch.trial };
}

function _storySpawnMiniBoss(ch, _tries) {
  if (!ch || !ch.miniBoss) return;
  const tries = _tries || 0;

  // The explore world finishes building several frames AFTER startGame(), so the
  // launch-site hook fires too early on exploration/walkFight chapters. Retry on
  // a short budget rather than guessing a single magic delay. Bail if the player
  // left the chapter in the meantime so a stale timer can't spawn into the menu
  // or into the next chapter.
  if (typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter !== ch) return;
  const ready = (typeof gameRunning !== 'undefined' && gameRunning)
             && (typeof currentArena !== 'undefined' && currentArena)
             && (typeof players !== 'undefined' && players && players.length > 0);
  if (!ready) {
    if (tries < 20) setTimeout(() => _storySpawnMiniBoss(ch, tries + 1), 120);
    return;
  }

  let spawned = null;
  if (ch.miniBoss === 'forestBeast' && typeof spawnForestBeastNow === 'function') {
    if (typeof forestBeast !== 'undefined' && forestBeast) return; // one at a time
    forestBeastCooldown = 0;
    spawnForestBeastNow();
    spawned = (typeof forestBeast !== 'undefined') ? forestBeast : null;
  } else if (ch.miniBoss === 'yeti' && typeof spawnYetiNow === 'function') {
    if (typeof yeti !== 'undefined' && yeti) return;
    yetiCooldown = 0;
    spawnYetiNow();
    spawned = (typeof yeti !== 'undefined') ? yeti : null;
  }
  if (!spawned) return;

  // Story mini-bosses are a pacing peak, not a random roadside encounter, so
  // they take an authored HP bump. Everything else stays at creature defaults.
  if (ch.miniBossHealth) {
    spawned.health    = ch.miniBossHealth;
    spawned.maxHealth = ch.miniBossHealth;
  }
  if (ch.miniBossName) spawned.name = ch.miniBossName;
}

function _launchChapter2Fight(ch) {
  if (!ch) return;

  // Reset per-fight story event state (abilities, distortion, event dedup)
  if (typeof resetStoryEventState === 'function') resetStoryEventState();

  // Exploration chapter: different launch path
  if (ch.type === 'exploration') {
    _launchExplorationChapter(ch);
    return;
  }

  // Escort chapter: protect an NPC to a goal position
  if (ch.type === 'escort') {
    _launchEscortChapter(ch);
    return;
  }

  // Ship flight chapter: horizontal shmup with the assembled ship
  if (ch.type === 'ship_flight') {
    if (typeof _launchShipFlightChapter === 'function') _launchShipFlightChapter(ch);
    return;
  }

  // Assassination chapter: defeat target before timer expires
  if (ch.type === 'assassination') {
    _launchAssassinationChapter(ch);
    return;
  }

  // Gauntlet chapter: consecutive rounds without healing
  if (ch.type === 'gauntlet') {
    _launchGauntletChapter(ch);
    return;
  }

  // Battle royale chapter: the field is the 94 bearers who came before Kael
  if (ch.type === 'battleroyale') {
    _launchBattleRoyaleChapter(ch);
    return;
  }

  // Boss fight: show cinematic intro before launching (async — delays startGame)
  if (ch.isBossFight) {
    if (typeof triggerEvent === 'function') triggerEvent('BOSS_INTRO', { ch }, true);
    const _bossCinDuration = 7800;
    // Single pending launch only: clicking Retry inside the 7.8s window used to
    // queue a second timer and double-spawn the boss.
    if (_bossCinLaunchTimer) clearTimeout(_bossCinLaunchTimer);
    _bossCinLaunchTimer = setTimeout(() => { _bossCinLaunchTimer = null; _launchChapter2FightImmediate(ch); }, _bossCinDuration);
    return;
  }

  _launchChapter2FightImmediate(ch);
}

let _bossCinLaunchTimer = null;
// Cancel a pending boss-intro launch. The 7.8s timer above outlives navigation,
// so leaving to the menu during the intro (pause→menu, error recovery) would
// otherwise fire _launchChapter2FightImmediate and spawn the boss over the menu.
function _cancelPendingBossLaunch() {
  if (_bossCinLaunchTimer) { clearTimeout(_bossCinLaunchTimer); _bossCinLaunchTimer = null; }
}
function _launchChapter2FightImmediate(ch) {
  const _phase = storyPendingPhaseConfig;
  // Close the story modal directly — bypass the ch0-lock guard (fight launch is always valid)
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  // Apply world modifiers for this chapter
  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;

  // Apply multiverse arc
  const _arc = getStoryArc(ch.id);
  if (_arc) storyCurrentArc = _arc.id;

  // Configure game for chapter
  if (ch.isTrueFormFight) {
    gameMode = 'trueform';
    if (typeof selectMode === 'function') selectMode('trueform');
  } else if (ch.isBossFight) {
    gameMode = 'boss';
    if (typeof selectMode === 'function') selectMode('boss');
  } else if (ch.isSovereignFight) {
    gameMode = 'adaptive';
    p2IsBot  = true;
    if (typeof selectMode === 'function') selectMode('adaptive');
  } else if (ch.isAbsoluteAxiomFight) {
    gameMode = 'absoluteaxiom';
    if (typeof selectMode === 'function') selectMode('absoluteaxiom');
    window._aaStoryHealth = ch.aaStoryHealth || 900;
  } else if (ch.isGodFight) {
    gameMode = 'god';
    if (typeof selectMode === 'function') selectMode('god');
  } else if (ch.isDamnationChapter) {
    gameMode = 'damnation';
    p2IsBot  = true;
    if (typeof selectMode === 'function') selectMode('damnation');
  } else {
    gameMode = '2p';
    p2IsBot  = true;
    if (typeof selectMode === 'function') selectMode('2p');
  }

  // Set arena
  if ((_phase && _phase.arena) || ch.arena) {
    selectedArena = (_phase && _phase.arena) || ch.arena;
    const arSelect = document.getElementById('arenaSelect');
    if (arSelect) arSelect.value = selectedArena;
  }

  // ── Ranged-weapon restriction ─────────────────────────────────────────────
  // Early story forbids ranged weapons so progression stays grounded and difficulty is consistent.
  // Later chapters/replays can use ranged loadouts normally.
  const _chBeaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
  const _RANGED_FALLBACK = 'sword'; // melee substitute when ranged is stripped
  const _isRanged = key => typeof WEAPONS !== 'undefined' && WEAPONS[key] && WEAPONS[key].type === 'ranged';
  // Tone filter: goofy weapons never appear in story mode (versus/sandbox keep them)
  const _isToneExcluded = key => typeof STORY_TONE_EXCLUDED_WEAPONS !== 'undefined' && STORY_TONE_EXCLUDED_WEAPONS.includes(key);
  const _rangedUnlocked = _chBeaten || ch.id >= 10;
  const _safeWeapon = key => _isToneExcluded(key) ? _RANGED_FALLBACK : ((_rangedUnlocked || !_isRanged(key)) ? key : _RANGED_FALLBACK);

  // Set P2 weapon/class to chapter opponent
  const _notBossOrTF = !ch.isBossFight && !ch.isTrueFormFight && !ch.isSovereignFight && !ch.isAbsoluteAxiomFight && !ch.isGodFight;
  if (_notBossOrTF && ch.weaponKey) {
    const p2w = document.getElementById('p2Weapon');
    if (p2w) p2w.value = _safeWeapon(ch.weaponKey);
  }
  if (_notBossOrTF && ch.classKey) {
    const p2c = document.getElementById('p2Class');
    if (p2c) p2c.value = ch.classKey;
  }
  if (_notBossOrTF && ch.aiDiff) {
    const p2d = document.getElementById('p2Difficulty');
    if (p2d) p2d.value = ch.aiDiff;
  }

  // Apply per-chapter fight script (tutorial hints, narrative subtitles)
  // Filter out entries that require abilities not yet unlocked.
  // Each entry can carry a `requires` array: ['ability','super','doubleJump']
  if (ch.fightScript && ch.fightScript.length) {
    const _ov = storyPlayerOverride || {};
    storyFightScript = ch.fightScript.filter(entry => {
      const req = entry.requires;
      if (!req) return true;
      const reqs = Array.isArray(req) ? req : [req];
      if (reqs.includes('doubleJump') && _ov.noDoubleJump) return false;
      if (reqs.includes('ability')    && _ov.noAbility)    return false;
      if (reqs.includes('super')      && _ov.noSuper)      return false;
      return true;
    });
    if (_phase && !_phase.finalChapter) {
      storyFightScript.unshift({
        frame: 20,
        text: `${_storyPhaseName(_phase.type)} — ${_phase.label || 'Engage and clear the arena.'}`,
        color: _phase.type === 'hazard_phase' ? '#ff8844' : _phase.type === 'elite_wave' ? '#ffcc66' : _phase.type === 'puzzle_lock' ? '#99ffcc' : '#aaccff',
        timer: 220,
      });
    }
    storyFightScriptIdx = 0;
    storyFightSubtitle  = null;
  } else {
    storyFightScript    = [];
    storyFightScriptIdx = 0;
    storyFightSubtitle  = null;
    if (_phase && !_phase.finalChapter) {
      storyFightSubtitle = {
        text: `${_storyPhaseName(_phase.type)} — ${_phase.label || 'Clear the phase.'}`,
        timer: 220,
        maxTimer: 220,
        color: _phase.type === 'hazard_phase' ? '#ff8844' : _phase.type === 'puzzle_lock' ? '#99ffcc' : '#aaccff'
      };
    }
  }

  // Apply per-chapter player lives
  if (typeof selectLives === 'function') selectLives((_phase && _phase.playerLives) || ch.playerLives || 3);
  infiniteMode = false;

  // ── Ability progression: gated purely by the skill tree ─────────────────
  // Abilities are no longer granted passively; the player must buy each node.
  const _caps = ch.playerCaps || {};
  const id = ch._origId !== undefined ? ch._origId : ch.id; // use original id for difficulty scaling
  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    // If chapter not yet beaten, strip ranged weapons from the player too
    weapon:        _caps.weapon !== undefined ? _safeWeapon(_caps.weapon) : (id < 1 ? 'sword' : ((_w => (_isToneExcluded(_w) || _isRanged(_w)) ? _RANGED_FALLBACK : null)(document.getElementById('p1Weapon')?.value))),
    noDoubleJump:  _caps.noDoubleJump !== undefined ? _caps.noDoubleJump : !_sk.doubleJump,
    noAbility:     _caps.noAbility    !== undefined ? _caps.noAbility    : !_sk.weaponAbility,
    noSuper:       _caps.noSuper      !== undefined ? _caps.noSuper      : !_sk.superMeter,
    noClass:       _caps.noClass      !== undefined ? _caps.noClass      : !_sk.classUnlock,
    noDodge:       !_sk.dodge,
    dmgMult:       1.0 + (_sk.heavyHit2 ? 0.25 : _sk.heavyHit1 ? 0.15 : 0),
    speedMult:     1.0 + (_sk.fastMove2 ? 0.20 : _sk.fastMove1 ? 0.10 : 0),
    jumpMult:      1.0 + (_sk.highJump2 ? 0.25 : _sk.highJump1 ? 0.15 : 0),
  };

  // Per-weapon mastery: fold the equipped weapon's damage bonus into the override
  if (typeof _weaponMasteryDmgBonus === 'function') {
    const _eqWeapon = storyPlayerOverride.weapon || document.getElementById('p1Weapon')?.value || 'sword';
    storyPlayerOverride.dmgMult *= (1 + _weaponMasteryDmgBonus(_eqWeapon));
  }

  // Stripped-powers trial: override all ability gates — only human physicality
  if (ch.strippedPowers) {
    storyPlayerOverride.noAbility    = true;
    storyPlayerOverride.noSuper      = true;
    storyPlayerOverride.noClass      = true;
    storyPlayerOverride.noDoubleJump = true;
    storyPlayerOverride.dmgMult      = 1.0;
    storyPlayerOverride.speedMult    = 1.0;
    storyPlayerOverride.jumpMult     = 1.0;
    // Flag for per-frame suppression of fragment/class visuals
    if (typeof window !== 'undefined') window._storyStrippedPowers = true;
  } else {
    if (typeof window !== 'undefined') window._storyStrippedPowers = false;
  }

  // Set in-fight objective based on chapter type
  if (typeof setObjective === 'function') {
    const _chOrigId = ch._origId !== undefined ? ch._origId : ch.id;
    let _obj;
    if (ch.isTrueFormFight)  _obj = 'Defeat True Form';
    else if (ch.isBossFight) _obj = ch.bossType === 'fallen_god' ? 'Defeat the Fallen God' : 'Defeat the Creator';
    else if (ch.isSovereignFight) _obj = 'Defeat the Sovereign';
    else if (ch.isAbsoluteAxiomFight) _obj = 'Defeat Absolute Axiom';
    else if (ch.isGodFight) _obj = 'Defeat God';
    else if (ch.type === 'exploration') _obj = 'Reach ' + (ch.objectName || 'the objective');
    else if (_chOrigId < 8)  _obj = 'Survive the attack — find out why.';
    else if (_chOrigId < 20) _obj = 'Investigate the fractures.';
    else if (_chOrigId < 40) _obj = 'Follow the trail. Someone is coordinating this.';
    else if (ch.opponentName) _obj = 'Defeat ' + ch.opponentName;
    else if (_chOrigId < 60) _obj = 'Breach the Creator\'s domain.';
    else                     _obj = 'Prepare for the Creator.';
    setObjective(_obj);
  }

  // Ability toasts are now shown only when purchased in the skill tree

  // Boss type override (e.g. 'fallen_god' → spawns FallenGod instead of Boss)
  storyBossType = ch.bossType || null;

  // Opponent name and appearance
  storyOpponentName  = ch.opponentName  || null;
  storyOpponentColor = ch.opponentColor || null;
  storyCharId        = _resolveStoryCharId(ch.opponentName || '');
  storyChapterCtx    = { origId: (ch._origId !== undefined ? ch._origId : ch.id), noAdaptive: !!ch.noAdaptive };

  // Armor and multi-enemy setup
  storyEnemyArmor = ch.armor || [];
  storyTwoEnemies = !!ch.twoEnemies;
  // Strip ranged weapon from second enemy on unbeaten chapters
  if (ch.secondEnemy) {
    const _sed = Object.assign({}, ch.secondEnemy);
    if (_sed.weaponKey) _sed.weaponKey = _safeWeapon(_sed.weaponKey);
    storySecondEnemyDef = _sed;
  } else if (ch.twoEnemies) {
    // Auto-generate second enemy from chapter opponent data when no explicit def
    storySecondEnemyDef = {
      weaponKey: _safeWeapon(ch.weaponKey || 'sword'),
      classKey:  ch.classKey  || 'warrior',
      aiDiff:    ch.aiDiff    || 'medium',
      color:     ch.opponentColor || '#cc5500',
    };
  } else {
    storySecondEnemyDef = null;
  }

  // Ally fighter on the player's side (companion chapters, e.g. Axiom in the God fight)
  if (ch.allyDef) {
    const _sad = Object.assign({}, ch.allyDef);
    if (_sad.weaponKey) _sad.weaponKey = _safeWeapon(_sad.weaponKey);
    storyAllyDef = _sad;
  } else {
    storyAllyDef = null;
  }

  // Mark story2 fight active
  storyModeActive = true;

  // Scale STORY_ENEMY_CONFIGS to chapter progression (defaults to 1 for v1 story)
  storyCurrentLevel = Math.min(8, Math.floor(id / 5) + 1);

  // Boss chapter: register director sequences that fire during the fight
  if (ch.isBossFight && typeof directorOnce === 'function') {
    // Use setTimeout so players[] is populated after startGame initializes
    setTimeout(() => {
      const _boss = players && players.find(p => p.isBoss);
      if (!_boss) return;

      directorOnce('boss_first_blood',
        () => gameRunning && _boss.health < _boss.maxHealth - 180,
        () => {
          if (typeof showBossDialogue === 'function') showBossDialogue('"You landed that. Good."', 120);
          if (typeof setCameraDrama === 'function') setCameraDrama('focus', 60, _boss, 1.18);
        }
      );

      directorOnce('boss_half_hp',
        () => gameRunning && _boss.health < _boss.maxHealth * 0.50,
        () => {
          if (typeof setCameraDrama === 'function') {
            setCameraDrama('wideshot', 100);
            setTimeout(() => setCameraDrama('focus', 70, _boss, 1.30), 1000);
          }
          if (typeof screenShakeIntensity !== 'undefined') screenShakeIntensity = Math.max(screenShakeIntensity || 0, 10);
          if (typeof showBossDialogue === 'function') showBossDialogue('"Half gone. You\'re better than I expected."', 160);
          if (typeof slowMotionFor === 'function') slowMotionFor(0.40, 900);
          if (director) director._worldState = 'boss';
        }
      );

      directorOnce('boss_final_phase',
        () => gameRunning && _boss.health < _boss.maxHealth * 0.20,
        () => {
          storyDistortLevel = Math.min(1.0, storyDistortLevel + 0.30);
          if (typeof setCameraDrama === 'function') setCameraDrama('wideshot', 160);
          if (typeof slowMotionFor === 'function') slowMotionFor(0.42, 1300);
          if (typeof showBossDialogue === 'function') showBossDialogue('"You weren\'t in the design. Yet here you are."', 210);
          if (typeof screenShakeIntensity !== 'undefined') screenShakeIntensity = Math.max(screenShakeIntensity || 0, 13);
          if (typeof directorSchedule === 'function') {
            directorSchedule([{
              id: 'boss_fp_focus', delay: 130,
              condition: () => gameRunning,
              action: () => {
                if (typeof setCameraDrama === 'function') setCameraDrama('focus', 90, _boss, 1.38);
              }
            }]);
          }
        }
      );
    }, 800); // 800ms after startGame so players[] is ready
  }

  if (typeof startGame === 'function') startGame();
  setTimeout(() => { if (players[0]) _applySkillTreeToPlayer(players[0]); }, 50);

  // World boss variant: patch the boss after players[] is populated
  if (ch.isWorldBoss) {
    setTimeout(() => spawnWorldBoss(worldId), 100);
  }

  // Creature mini-boss peak (see _storySpawnMiniBoss).
  if (ch.miniBoss) {
    setTimeout(() => _storySpawnMiniBoss(ch), 120);
  }

  // The Trials (see _storyArmTrial).
  if (ch.trial) _storyArmTrial(ch);
  else if (typeof resetTrialState === 'function') resetTrialState();

  // Axiom teaser (ch63): patch the Boss entity color + suppress all threshold cinematics + reset player to 1 life
  if (ch._axiomTeaser) {
    setTimeout(() => {
      if (!gameRunning) return;
      const _axiomBoss = players && players.find(p => p && p.isBoss);
      if (_axiomBoss) {
        _axiomBoss.color = '#cc44ff';
        if (_axiomBoss._cinematicFired) {
          ['75','paradox50','40','10','phase2','phase3','rage','desp','warn'].forEach(k => _axiomBoss._cinematicFired.add(k));
        }
      }
      const _p1 = players && players.find(p => !p.isBoss && !p.isAI);
      if (_p1) { _p1.lives = 1; _p1._maxLives = 1; }
      chosenLives = 1;
      bossFightLivesLock = false;
    }, 150);
  }
}

// ── Assassination chapter launch ──────────────────────────────────────────────
function _launchAssassinationChapter(ch) {
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;
  const _arc = getStoryArc(ch.id);
  if (_arc) storyCurrentArc = _arc.id;

  if (ch.arena) {
    selectedArena = ch.arena;
    const arSelect = document.getElementById('arenaSelect');
    if (arSelect) arSelect.value = selectedArena;
  }

  storyFightScript    = Array.isArray(ch.fightScript) ? ch.fightScript.slice() : [];
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;

  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;

  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    noDoubleJump: !_sk.doubleJump,
    noAbility:    !_sk.weaponAbility,
    noSuper:      !_sk.superMeter,
    noClass:      !_sk.classUnlock,
    noDodge:      !_sk.dodge,
    dmgMult:      1.0 + (_sk.heavyHit2 ? 0.25 : _sk.heavyHit1 ? 0.15 : 0),
    speedMult:    1.0 + (_sk.fastMove2 ? 0.20 : _sk.fastMove1 ? 0.10 : 0),
    jumpMult:     1.0 + (_sk.highJump2 ? 0.25 : _sk.highJump1 ? 0.15 : 0),
  };

  if (ch.weaponKey) { const w = document.getElementById('p2Weapon'); if (w) w.value = ch.weaponKey; }
  if (ch.classKey)  { const c = document.getElementById('p2Class');  if (c) c.value = ch.classKey; }
  if (ch.aiDiff)    { const d = document.getElementById('p2Difficulty'); if (d) d.value = ch.aiDiff; }

  storyBossType       = null;
  storyOpponentName   = ch.opponentName  || 'Target';
  storyOpponentColor  = ch.opponentColor || null;
  storyCharId         = _resolveStoryCharId(ch.opponentName || '');
  storyChapterCtx     = { origId: (ch._origId !== undefined ? ch._origId : ch.id), noAdaptive: !!ch.noAdaptive };
  storyEnemyArmor     = ch.armor || [];
  storyTwoEnemies     = false;
  storySecondEnemyDef = null;
  storyAllyDef        = null;
  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(ch.id / 5) + 1);
  gameMode            = 'assassination';
  p2IsBot             = true;

  if (typeof selectMode === 'function') selectMode('2p');

  if (typeof setObjective === 'function') setObjective('Eliminate the target before they escape');

  if (typeof startGame === 'function') startGame();
  setTimeout(() => {
    if (players[0]) _applySkillTreeToPlayer(players[0]);
    if (typeof initAssassinationMode === 'function') initAssassinationMode(ch);
  }, 80);
}

// ── Gauntlet chapter launch ────────────────────────────────────────────────────
function _launchGauntletChapter(ch) {
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;
  const _arc = getStoryArc(ch.id);
  if (_arc) storyCurrentArc = _arc.id;

  if (ch.arena) {
    selectedArena = ch.arena;
    const arSelect = document.getElementById('arenaSelect');
    if (arSelect) arSelect.value = selectedArena;
  }

  storyFightScript    = Array.isArray(ch.fightScript) ? ch.fightScript.slice() : [];
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;

  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;

  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    noDoubleJump: !_sk.doubleJump,
    noAbility:    !_sk.weaponAbility,
    noSuper:      !_sk.superMeter,
    noClass:      !_sk.classUnlock,
    noDodge:      !_sk.dodge,
    dmgMult:      1.0 + (_sk.heavyHit2 ? 0.25 : _sk.heavyHit1 ? 0.15 : 0),
    speedMult:    1.0 + (_sk.fastMove2 ? 0.20 : _sk.fastMove1 ? 0.10 : 0),
    jumpMult:     1.0 + (_sk.highJump2 ? 0.25 : _sk.highJump1 ? 0.15 : 0),
  };

  storyBossType       = null;
  storyOpponentName   = ch.opponentName  || 'Enemy';
  storyOpponentColor  = ch.opponentColor || null;
  storyCharId         = _resolveStoryCharId(ch.opponentName || '');
  storyChapterCtx     = { origId: (ch._origId !== undefined ? ch._origId : ch.id), noAdaptive: !!ch.noAdaptive };
  storyEnemyArmor     = ch.armor || [];
  storyTwoEnemies     = false;
  storySecondEnemyDef = null;
  storyAllyDef        = null;
  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(ch.id / 5) + 1);
  gameMode            = 'gauntlet';
  p2IsBot             = true;

  if (typeof selectMode === 'function') selectMode('2p');
  if (typeof setObjective === 'function') setObjective('Defeat all ' + (ch.gauntletRounds || 3) + ' rounds');

  if (typeof startGame === 'function') startGame();
  setTimeout(() => {
    if (players[0]) _applySkillTreeToPlayer(players[0]);
    if (typeof initGauntletMode === 'function') initGauntletMode(ch);
  }, 80);
}

// ── Battle Royale chapter — the 94 bearers ────────────────────────────────────
// The reframe docs/TRIALS_DESIGN.md asked for: the field is not anonymous bots,
// it is every fragment bearer who came before Kael, all at once. The bearer
// field itself is built in initBattleRoyale() / _brSpawnBots(), which DERIVE it
// from this chapter's type rather than reading a flag set here — see
// smb-battleroyale.js. Nothing here needs a post-startGame() timer: BR's own
// init runs inside _startGameCore with players[] already rebuilt.
function _launchBattleRoyaleChapter(ch) {
  if (!ch) return;
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;

  storyBossType       = null;
  storyOpponentName   = ch.opponentName || 'Bearer';
  storyOpponentColor  = ch.opponentColor || null;
  storyCharId         = null;
  storyChapterCtx     = { origId: (ch._origId !== undefined ? ch._origId : ch.id), noAdaptive: !!ch.noAdaptive };
  storyEnemyArmor     = [];
  storyTwoEnemies     = false;
  storySecondEnemyDef = null;
  storyAllyDef        = null;
  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(ch.id / 5) + 1);
  // BR builds its own 9000x2800 arena in _makeBRArena(), so the chapter's
  // `arena:` is deliberately not applied.
  gameMode            = 'battleroyale';
  p2IsBot             = true;

  if (typeof selectMode === 'function') selectMode('battleroyale');
  if (typeof setObjective === 'function') setObjective('Outlast all 94');

  if (typeof startGame === 'function') startGame();
}

// ── World Boss variants ────────────────────────────────────────────────────────
