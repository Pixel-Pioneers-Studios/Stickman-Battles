'use strict';
// smb-story-engine-explore2.js — updateExploration, _exploreSpawnEnemy, triggerScene, drawFallenWarriorMemory
// Depends on: smb-globals.js, smb-story-registry.js (and preceding story-engine splits)

// ── Clear-the-area gate ───────────────────────────────────────────────────────
// A level is only finished when every enemy in it is down: the exit stays sealed
// while a hostile still stands. Optional foes that live off the golden path are
// exempt — vault wardens guarding hidden caches and side-portal elites were never
// part of the required fight, so they can be walked past forever.
function _exploreOptionalFoe(o) {
  return !!(o && (o.isChestGuardian || o.isSidePortalEnemy || o.isOptionalEnemy || o.isHiddenEnemy));
}
function _exploreHostile(m) {
  return !!(m && m.health > 0 && !m.isStoryAlly && m.storyFaction !== 'player' && m._teamId !== 1);
}
// Living + still-queued mandatory enemies, plus the nearest one so the HUD can
// point at it. Queued defs count: an authored enemy the player outran is still
// part of the level, and _exploreForceSpawnAll drains the queue at the exit so
// the count can actually reach zero.
function _exploreRemainingFoes() {
  const p1 = players && players[0];
  let count = 0, nearest = null, nd = Infinity;
  // Escape levels are won by outrunning the fracture wall and stealth levels by
  // slipping through; enemies there are obstacles, not a clear requirement.
  if ((typeof escapeModeActive  !== 'undefined' && escapeModeActive) ||
      (typeof stealthModeActive !== 'undefined' && stealthModeActive)) {
    return { count: 0, alive: 0, queued: 0, nearest: null, nearestDist: nd };
  }
  const consider = (m) => {
    if (!_exploreHostile(m) || _exploreOptionalFoe(m)) return;
    count++;
    if (!p1) return;
    const d = Math.abs(m.cx() - p1.cx());
    if (d < nd) { nd = d; nearest = m; }
  };
  if (typeof minions !== 'undefined' && minions) minions.forEach(consider);
  if (typeof players !== 'undefined' && players) {
    for (const p of players) { if (p !== p1 && p.storyFaction === 'enemy') consider(p); }
  }
  let queued = 0;
  if (typeof exploreSpawnQ !== 'undefined' && exploreSpawnQ) {
    for (const d of exploreSpawnQ) if (!_exploreOptionalFoe(d)) queued++;
  }
  return { count: count + queued, alive: count, queued, nearest, nearestDist: nd };
}
// The level's own stated objective, when it has one and it is not finished yet.
// Returns a player-facing reason string, or null when nothing is outstanding.
// This is what makes "retrieve the caches" a real requirement instead of set
// dressing the player can run past on the way to the exit.
function _exploreObjectivePending() {
  if (typeof scavengeModeActive !== 'undefined' && scavengeModeActive &&
      typeof scavengeItems !== 'undefined' && scavengeItems && scavengeItems.length) {
    const left = scavengeItems.filter(s => !s.collected).length;
    if (left > 0) return `${left} ${left === 1 ? 'cache' : 'caches'} still out there`;
  }
  if (typeof puzzleModeActive !== 'undefined' && puzzleModeActive &&
      typeof puzzleSwitches !== 'undefined' && puzzleSwitches && puzzleSwitches.length) {
    const left = puzzleSwitches.length - (typeof puzzleStep !== 'undefined' ? puzzleStep : 0);
    if (left > 0) return `${left} ${left === 1 ? 'mechanism' : 'mechanisms'} still inactive`;
  }
  if (typeof gauntletActive !== 'undefined' && gauntletActive) {
    return `gauntlet round ${gauntletRound}/${gauntletTotalRounds} unfinished`;
  }
  // The live escort is smb-escort.js's `escortNPC` (it loads after, and shadows
  // the modes.js implementation that drives `escortNPCTarget`). Both are checked
  // so this keeps working whichever one a chapter ends up running.
  const _esc = (typeof escortNPC !== 'undefined' && escortNPC) ? escortNPC
             : (typeof escortNPCTarget !== 'undefined' ? escortNPCTarget : null);
  if (_esc && _esc.health > 0 && typeof escortGoalX !== 'undefined' &&
      (typeof _esc.cx === 'function' ? _esc.cx() : _esc.x) < escortGoalX) {
    return `${_esc.name || escortNPCName || 'your escort'} is not safe yet`;
  }
  return null;
}

// The single "can this level be completed right now?" test. Objective first (it
// is the point of the level), then the clear-the-area rule. Returns null when
// the level is genuinely finished.
function storyLevelClearBlocker() {
  const obj = _exploreObjectivePending();
  if (obj) return { kind: 'objective', reason: obj, count: 0 };
  const rem = _exploreRemainingFoes();
  if (rem.count > 0) {
    const p1 = players && players[0];
    let where = '';
    if (rem.nearest && rem.alive > 0 && p1) {
      where = rem.nearest.cx() < p1.cx() ? ' — back the way you came' : ' — ahead of you';
    }
    return {
      kind: 'enemies',
      reason: `${rem.count} enem${rem.count === 1 ? 'y' : 'ies'} still standing${where}`,
      count: rem.count,
      rem,
    };
  }
  return null;
}

// Deferred completion. A mode's own win condition (last cache picked up, last
// mechanism thrown, escort delivered) arms the win here instead of ending the
// match outright, so it still has to pass storyLevelClearBlocker(). It fires the
// frame the final requirement falls.
let _pendingLevelWin = null;
let _exploreGoalNag  = 0;
function storyArmLevelWin(label, onWin) {
  if (_pendingLevelWin) return;
  _pendingLevelWin = { label: label || 'Objective complete', onWin: onWin || null, nagAt: 0 };
}
function _storyResetLevelWin() { _pendingLevelWin = null; _exploreGoalNag = 0; _recallTimer = 0; exploreFoesRemaining = 0; }
function _updatePendingLevelWin() {
  if (!_pendingLevelWin || exploreGoalFound) return;
  const blocker = storyLevelClearBlocker();
  if (blocker) {
    window._exploreForceSpawnAll = true;
    exploreGoalBlocked      = blocker.count;
    exploreGoalBlockReason  = blocker.reason;
    if (frameCount - _pendingLevelWin.nagAt > 260) {
      _pendingLevelWin.nagAt = frameCount;
      storyFightSubtitle = {
        text: `${_pendingLevelWin.label} — but ${blocker.reason}`,
        timer: 190, maxTimer: 190, color: '#ffcc44'
      };
    }
    return;
  }
  const win = _pendingLevelWin;
  _pendingLevelWin = null;
  exploreGoalBlocked     = 0;
  exploreGoalBlockReason = '';
  window._exploreForceSpawnAll = false;
  if (win.onWin) win.onWin();
}

// Straggler recall. Once the exit is sealed, a required enemy that is far away
// and not fighting anyone becomes a search problem across a 6000px world — and
// worlds with shaft gaps can drop one into a tunnel chamber the player has no
// reason to revisit. After RECALL_DELAY of that, the straggler is pulled to the
// player instead, which turns a hunt back into a fight. Same leash pattern the
// Vault Warden already uses; optional foes are never recalled because nothing
// forces the player to fight them.
const _RECALL_DELAY = 300;  // 5s of a sealed exit with nobody in reach
const _RECALL_NEAR  = 900;  // a foe closer than this is findable on your own
let _recallTimer = 0;
function _updateStragglerRecall(p1) {
  if (!p1 || exploreGoalFound || exploreArenaLock) { _recallTimer = 0; return; }
  if (!exploreGoalBlocked) { _recallTimer = 0; return; }
  const rem = _exploreRemainingFoes();
  // Nothing spawned yet (all still queued) — the drain handles that case.
  if (!rem.alive || !rem.nearest) { _recallTimer = 0; return; }
  if (rem.nearestDist < _RECALL_NEAR) { _recallTimer = 0; return; }
  if (++_recallTimer < _RECALL_DELAY) return;
  _recallTimer = 0;
  const foe = rem.nearest;
  const dir = foe.cx() < p1.cx() ? -1 : 1;
  const spot = (typeof pickSafeSpawnNear === 'function')
    ? pickSafeSpawnNear(p1.cx() + dir * 260, 'any', p1.x) : null;
  spawnParticles(foe.cx(), foe.cy(), '#ff7766', 14);
  foe.x = spot ? spot.x : (p1.x + dir * 260);
  foe.y = spot ? spot.y - foe.h : p1.y;
  foe.vx = 0; foe.vy = 0;
  foe.target = p1;
  spawnParticles(foe.cx(), foe.cy(), '#ff7766', 18);
  storyFightSubtitle = {
    text: `${foe.name || 'A straggler'} finds you.`,
    timer: 160, maxTimer: 160, color: '#ff9977'
  };
  if (typeof setCameraDrama === 'function') setCameraDrama('impact', 26);
}

// True once the player is close enough to the exit that the gate is in play.
// The ambient pressure spawners stand down inside this zone — an endless drip of
// new stalkers at the exit would make "clear them all" unfinishable.
function _exploreNearGoal(p1) {
  return !!(p1 && typeof exploreGoalX !== 'undefined' && p1.x > exploreGoalX - 900);
}

function _spawnSurvivalWave(ss, p1) {
  const count   = ss.waveSize + Math.floor((ss.wave - 1) / 2); // waves grow slightly
  const isElite = ss.wave >= ss.totalWaves; // final wave is elite
  for (let i = 0; i < count; i++) {
    const def = Object.assign({}, ss.baseEnemy, {
      wx:       750 + i * 50,
      isElite,
      health:   isElite ? 180 : 110,
      name:     isElite ? (ss.baseEnemy.name + ' Elite') : ss.baseEnemy.name,
    });
    _exploreSpawnEnemy(def, p1);
  }
}

// True while a SCRIPTED pressure beat already owns the fight — a tripped stealth
// alarm, an arena lock, or an escape/defense objective. The ambient pressure
// spawners (Pressure Stalker / Ambush Elite) must stay out of the way there:
// stacking an unannounced elite on top of an alarm wave is what made a failed
// stealth run unwinnable.
function _storyPressureScripted() {
  if (exploreArenaLock) return true;
  if (typeof stealthModeActive !== 'undefined' && stealthModeActive &&
      typeof stealthAlarmed !== 'undefined' && stealthAlarmed) return true;
  if (typeof escapeModeActive  !== 'undefined' && escapeModeActive)  return true;
  if (typeof defenseModeActive !== 'undefined' && defenseModeActive) return true;
  return false;
}

function _updateSurvivalWave(p1) {
  const ss = storeSurvivalState;
  if (!ss || !ss.active || exploreGoalFound) return;
  const liveEnemies = minions.filter(m => m.health > 0).length;
  ss.timer--;

  if (ss.state === 'countdown' && ss.timer <= 0) {
    ss.state = 'active';
    ss.wave  = 1;
    ss.timer = 9999;
    _spawnSurvivalWave(ss, p1);
    storyFightSubtitle = { text: `⚔ Wave 1/${ss.totalWaves} — Defend!`, timer: 190, maxTimer: 190, color: '#ff9944' };
    screenShake = 10;

  } else if (ss.state === 'active' && liveEnemies === 0) {
    if (ss.wave >= ss.totalWaves) {
      ss.state  = 'victory';
      ss.active = false;
      exploreGoalFound = true;
      SoundManager && typeof SoundManager.superActivate === 'function' && SoundManager.superActivate();
      spawnParticles && spawnParticles(p1.cx(), p1.cy(), '#ffffaa', 28);
      storyFightSubtitle = { text: `All ${ss.totalWaves} waves cleared!`, timer: 250, maxTimer: 250, color: '#ffffaa' };
      setTimeout(() => { if (!gameRunning) return; endGame(); }, 2200);
    } else {
      ss.state = 'between';
      ss.timer = 90;
      storyFightSubtitle = { text: `Wave ${ss.wave} cleared — next incoming...`, timer: 80, maxTimer: 80, color: '#88ffcc' };
    }

  } else if (ss.state === 'between' && ss.timer <= 0) {
    ss.state = 'active';
    ss.wave++;
    ss.timer = 9999;
    _spawnSurvivalWave(ss, p1);
    storyFightSubtitle = { text: `⚔ Wave ${ss.wave}/${ss.totalWaves} — Hold!`, timer: 190, maxTimer: 190, color: '#ff9944' };
    screenShake = 10;
  }
}

function updateExploration() {
  if (!exploreActive || !players[0] || !gameRunning) return;
  const p1 = players[0];

  // Apply carried-over HP once, on the first frame the player exists
  if (exploreSeedHealth != null) {
    p1.health = Math.max(1, Math.min(p1.maxHealth, exploreSeedHealth));
    exploreSeedHealth = null;
  }

  // Mid-region launch: place the player at their chapter's segment start
  if (exploreStartX != null) {
    p1.x = exploreStartX; p1.vx = 0;
    exploreStartX = null;
  }

  // Reverse loading zone: the LEFT edge of a walk→fight world backtracks to
  // the previous chapter's world, entering at its exit end — the mirror of the
  // forward walk-through goal: purely positional once armed.
  // Works out of every walkable world (walk→fight duels AND exploration modes);
  // the target is resolved at launch by _storyBackChapterFor (null = hard wall).
  // Arming guard: a fresh spawn near the left edge must not instantly bounce
  // back — the zone arms only after the player has walked into the world.
  const _hasBack = (typeof exploreBackChapter !== 'undefined' && exploreBackChapter != null);
  const _edgeL = (currentArena && currentArena.mapLeft) || 0;
  if (_hasBack && p1.x > _edgeL + 420) window._exploreBackArmed = true;
  const _backByWalk = window._exploreBackArmed && p1.x <= _edgeL + 30;
  const _backByPush = p1.x <= _edgeL + 8 &&
    p1.controls && typeof keysDown !== 'undefined' && keysDown.has(p1.controls.left);
  if (_hasBack && !exploreGoalFound && !exploreArenaLock && !window._exploreBackPending &&
      (_backByWalk || _backByPush)) {
    const _prev = (typeof STORY_CHAPTERS2 !== 'undefined') ? STORY_CHAPTERS2[exploreBackChapter] : null;
    if (_prev) {
      window._exploreBackPending = true;
      _story2.health = Math.round(Math.max(1, p1.health)); // carry HP backward too
      if (typeof _saveStory2 === 'function') _saveStory2();
      storyFightSubtitle = { text: '← ' + (_prev.title || 'the previous area'), timer: 90, maxTimer: 90, color: '#88ccff' };
      // Near-seamless jump: the launch funnel marks the transition seamless
      // (no loading screen — see _storyMarkTransition), so only a short beat
      // is needed before the world swap.
      setTimeout(() => {
        window._exploreBackPending = false;
        if (!gameRunning) return;
        _exploreEnterFromRight = true;
        if (typeof _beginChapter2 === 'function') _beginChapter2(_prev.id);
      }, 280);
      return;
    }
  }

  // Chase phase: count down the escape timer each frame
  if (storyChaseTimer > 0 && !exploreGoalFound) {
    storyChaseTimer--;
    if (storyChaseTimer <= 0) {
      exploreGoalFound = true; // block further goal/checkpoint checks
      screenShake = 22;
      storyFightSubtitle = { text: '⏱ Time expired — route collapsed!', timer: 240, maxTimer: 240, color: '#ff4422' };
      p1.lives = 0; // signal a loss to endGame()
      setTimeout(() => { if (!gameRunning) return; endGame(); }, 1400);
      return;
    }
  }

  // Survival wave management (runs before normal explore logic)
  if (storeSurvivalState && storeSurvivalState.active) {
    _updateSurvivalWave(p1);
  }

  // New explore modes
  if (typeof updateStealthMode  === 'function' && stealthModeActive)  updateStealthMode();
  if (typeof updateEscapeMode   === 'function' && escapeModeActive)   updateEscapeMode();
  if (typeof updateDefenseMode  === 'function' && defenseModeActive)  updateDefenseMode();
  if (typeof updateScavengeMode === 'function' && scavengeModeActive) updateScavengeMode();
  if (typeof updatePuzzleMode   === 'function' && puzzleModeActive)   updatePuzzleMode();

  updateExplorePickups(p1);
  _updatePendingLevelWin();
  // Keep the sealed-exit banner honest — it appears as the player nears the exit
  // and clears the frame the last requirement is met, wherever they are standing.
  if (!exploreGoalFound && (exploreGoalBlockReason || _exploreNearGoal(p1))) {
    const _b = storyLevelClearBlocker();
    exploreGoalBlocked     = _b ? _b.count  : 0;
    exploreGoalBlockReason = _b ? _b.reason : '';
  }
  // HUD count, refreshed every 10 frames — the player needs to see the rule from
  // the start of the level, not discover it at a sealed door.
  if (!exploreGoalFound && frameCount % 10 === 0) {
    exploreFoesRemaining = _exploreRemainingFoes().count;
  } else if (exploreGoalFound) {
    exploreFoesRemaining = 0;
  }
  _updateStragglerRecall(p1);

  const activeEnemyCount = minions.filter(m => m.health > 0).length;
  const inCombat = activeEnemyCount > 0 || !!players.find(p => p !== p1 && p.health > 0 && p.isAI);
  exploreCombatQuiet = inCombat ? 0 : (exploreCombatQuiet + 1);
  // The passivity clock must measure genuine idling, nothing else. It used to
  // free-run through fights, so a long brawl left it fully primed and an Ambush
  // Elite dropped the frame the last enemy died — punishing the player for
  // fighting, which is the opposite of the intent. Combat, taking a hit, and
  // swinging all reset it.
  if (inCombat || p1.hurtTimer > 0 || p1.attackTimer > 0 || p1.attackEndlag > 0) exploreAmbushTimer = 0;
  else exploreAmbushTimer++;
  if (exploreArenaLock) {
    p1.x = clamp(p1.x, exploreArenaLock.left, exploreArenaLock.right - p1.w);
    if (currentArena) {
      currentArena.mapLeft = exploreArenaLock.left;
      currentArena.mapRight = exploreArenaLock.right;
    }
    // Camera beat: the gate slams (pull back, set at lock creation), then the
    // camera pushes in on whoever is blocking the way, then releases on the clear.
    const _lockAge = frameCount - (exploreArenaLock.bornFrame || 0);
    if (_lockAge === 46 && typeof setCameraDrama === 'function') {
      const _lockFoe = minions.find(m => m.health > 0 && m.isArenaLockEnemy);
      if (_lockFoe) setCameraDrama('focus', 70, _lockFoe, 1.16);
    }
    const lockAlive = minions.some(m => m.health > 0 && m.isArenaLockEnemy);
    if (!lockAlive) {
      if (currentArena) {
        currentArena.mapLeft = exploreArenaLock.prevLeft;
        currentArena.mapRight = exploreArenaLock.prevRight;
      }
      storyFightSubtitle = { text: `${exploreArenaLock.label || 'Arena lock'} cleared. Move.`, timer: 150, maxTimer: 150, color: '#88ffcc' };
      exploreArenaLock = null;
      if (typeof setCameraDrama === 'function') setCameraDrama('impact', 34);
    }
  }

  // Far boundary: player wandered far beyond the world — reset the chapter
  const _farLimit = exploreWorldLen + 2500;
  if (p1.x > _farLimit || p1.x < -1200) {
    p1.x = 60; p1.y = 300; p1.vx = 0; p1.vy = 0;
    storyFightSubtitle = { text: '⚠ You wandered too far — back to the start!', timer: 200, maxTimer: 200, color: '#ff6644' };
    screenShake = 30;
    return;
  }

  // One-map region: crossing a segment boundary completes that segment's chapter
  // in place (rewards + save) without ending the match. A region segment IS a
  // level — it awards tokens, blueprints and a `defeated` entry — so the boundary
  // is sealed by exactly the same rule as the world exit. Without this the gate
  // only covered the final exit and a region map could still be banked chapter by
  // chapter at a dead run.
  if (exploreRegion && !exploreArenaLock && !exploreGoalFound) {
    for (const b of exploreRegion.boundaries) {
      if (b.done || p1.cx() < b.x) continue;
      const _bBlock = storyLevelClearBlocker();
      if (_bBlock) {
        window._exploreForceSpawnAll = true;
        exploreGoalBlocked     = _bBlock.count;
        exploreGoalBlockReason = _bBlock.reason;
        // Hold the line rather than bounce the player backwards — the boundary is
        // mid-world, so a shove would fight whatever they were doing.
        p1.x = Math.min(p1.x, b.x - p1.w / 2 - 2);
        if (p1.vx > 0) p1.vx = 0;
        if (!_exploreGoalNag || frameCount - _exploreGoalNag > 200) {
          _exploreGoalNag = frameCount;
          storyFightSubtitle = {
            text: `🔒 Sealed — ${_bBlock.reason}`,
            timer: 170, maxTimer: 170, color: '#ff7766'
          };
          if (SoundManager && typeof SoundManager.shieldBlock === 'function') SoundManager.shieldBlock();
        }
        break;
      }
      b.done = true;
      _regionCompleteChapter(b.chId);
    }
  }

  // Goal reached?
  if (!exploreArenaLock && !exploreGoalFound && p1.x + p1.w >= exploreGoalX && p1.health > 0) {
    // Sealed exit: reaching the mark used to BE the win condition, so any level
    // could be skipped at a dead run. The exit now only opens once the level's
    // objective is done and every required enemy is down. Hidden/optional foes
    // (vault wardens, side-portal elites) are exempt — see _exploreOptionalFoe.
    const _blocker = storyLevelClearBlocker();
    if (_blocker) {
      window._exploreForceSpawnAll = true;
      exploreGoalBlocked     = _blocker.count;
      exploreGoalBlockReason = _blocker.reason;
      // Nudge the player back off the mark so the check re-arms cleanly.
      p1.x = Math.min(p1.x, exploreGoalX - p1.w - 4);
      if (p1.vx > 0) p1.vx = 0;
      if (!_exploreGoalNag || frameCount - _exploreGoalNag > 200) {
        _exploreGoalNag = frameCount;
        storyFightSubtitle = {
          text: `🔒 Sealed — ${_blocker.reason}`,
          timer: 170, maxTimer: 170, color: '#ff7766'
        };
        if (SoundManager && typeof SoundManager.shieldBlock === 'function') SoundManager.shieldBlock();
      }
    } else {
    exploreGoalBlocked     = 0;
    exploreGoalBlockReason = '';
    window._exploreForceSpawnAll = false;
    exploreGoalFound = true;
    // Region: the exit belongs to the LAST chapter — the normal victory flow
    // (rewards, overlay, defeated) must run against it, not the launched one.
    if (exploreRegion && typeof STORY_CHAPTERS2 !== 'undefined') {
      const _lastId = exploreRegion.chapters[exploreRegion.chapters.length - 1];
      if (_activeStory2Chapter && _activeStory2Chapter.id !== _lastId && STORY_CHAPTERS2[_lastId]) {
        _activeStory2Chapter = STORY_CHAPTERS2[_lastId];
      }
    }
    // Persist current HP so it carries into the next walk→fight chapter
    if (exploreDuelMode) { _story2.health = Math.round(p1.health); if (typeof _saveStory2 === 'function') _saveStory2(); }
    SoundManager.superActivate();
    spawnParticles(exploreGoalX + 20, 380, '#ffffaa', 40);

    // Walk-through transition: when the NEXT chapter is also a walkable world
    // (walk→fight or any exploration mode), there is NO end screen — the exit IS
    // the loading zone. Award this chapter in place (same as region boundaries)
    // and launch the next world directly; its narrative scene (if unseen) plays
    // as the between-areas cutscene.
    const _doneCh = _activeStory2Chapter;
    const _nextCh = (_doneCh && typeof STORY_CHAPTERS2 !== 'undefined')
      ? STORY_CHAPTERS2[_doneCh.id + 1] : null;
    const _nextWalkable = _nextCh && (_nextCh.walkFight === true || _nextCh.type === 'exploration');
    if (_nextWalkable && typeof _regionCompleteChapter === 'function' && typeof _beginChapter2 === 'function') {
      _regionCompleteChapter(_doneCh.id);
      storyFightSubtitle = { text: `✨ ${exploreGoalName} found — entering ${_nextCh.title || 'the next area'}…`, timer: 110, maxTimer: 110, color: '#ffffaa' };
      // Near-seamless walk-through: no loading screen (seamless launch funnel),
      // just a short beat so the subtitle registers before the world swap.
      setTimeout(() => {
        if (!gameRunning) return;
        _beginChapter2(_nextCh.id);
      }, 450);
      return;
    }

    // Otherwise (next chapter is a set-piece fight/scene, or story end):
    // classic completion with the victory flow.
    storyFightSubtitle = { text: `✨ ${exploreGoalName} found! Moving on...`, timer: 200, maxTimer: 200, color: '#ffffaa' };
    setTimeout(() => {
      if (!gameRunning) return;
      endGame();
    }, 2200);
    }
  }

  for (let i = 0; i < exploreCheckpoints.length; i++) {
    const cp = exploreCheckpoints[i];
    if (cp.hit || p1.cx() < cp.x || exploreArenaLock) continue;
    // Rest beacons sit on the surface; walking under one in a tunnel does not
    // light it (it stays armed until the player passes it up top).
    if (cp.rest && p1.y + p1.h > _EXP_SURF_Y + 4) continue;
    cp.hit = true;
    exploreCheckpointIdx = i;
    if (cp.rest) {
      // Rest beacon: no fight. Record the resume point for a game-over Retry.
      if (_activeStory2Chapter) {
        _story2.cpResume = { chId: _activeStory2Chapter.id, x: cp.x };
        if (typeof _saveStory2 === 'function') _saveStory2();
      }
      // ...and the mid-life respawn point, as the subtitle promises. Without it
      // a fall into an authored gap sent the player back to the level start.
      const _restSpawn = typeof pickSafeSpawnNear === 'function' ? pickSafeSpawnNear(cp.x, 'any') : null;
      if (_restSpawn) { p1.spawnX = _restSpawn.x; p1.spawnY = _restSpawn.y; }
      cp.litFrame = frameCount;
      spawnParticles(cp.x, _EXP_SURF_Y - 60, '#ffd27a', 22);
      if (SoundManager && SoundManager.superActivate) SoundManager.superActivate();
      storyFightSubtitle = { text: 'Checkpoint reached — fall, and you rise here.', timer: 170, maxTimer: 170, color: '#ffd27a' };
      continue;
    }
    const safeSpawn = typeof pickSafeSpawnNear === 'function' ? pickSafeSpawnNear(cp.x, 'any') : null;
    if (safeSpawn) {
      p1.spawnX = safeSpawn.x;
      p1.spawnY = safeSpawn.y;
    }
    const _fightCps = exploreCheckpoints.filter(c => !c.rest);
    storyFightSubtitle = {
      text: `Checkpoint secured ${_fightCps.indexOf(cp) + 1}/${_fightCps.length}`,
      timer: 170,
      maxTimer: 170,
      color: '#7dffcc'
    };
    spawnParticles(cp.x, p1.cy(), '#7dffcc', 14);
    // Region checkpoints carry their own chapter's opponent; plain walkFight
    // checkpoints fall back to the launched chapter's duel opponent.
    const _cpCh = (cp.chId != null && typeof STORY_CHAPTERS2 !== 'undefined') ? STORY_CHAPTERS2[cp.chId] : _activeStory2Chapter;
    const _opp = cp.opp || exploreDuelOpponent;
    // Replay Mode off + already-beaten chapter → walk through freely, skip the fight entirely
    const _replaySkip = (typeof _cinReplaySkip === 'function') && _cinReplaySkip(_cpCh);
    if (exploreDuelMode && _opp && !_replaySkip) {
      if (!exploreArenaLock && currentArena) {
        exploreArenaLock = {
          left: Math.max(0, cp.x - 260),
          right: Math.min(exploreWorldLen, cp.x + 340),
          prevLeft: currentArena.mapLeft,
          prevRight: currentArena.mapRight,
          label: _opp.name,
          bornFrame: frameCount,
        };
      }
      _exploreSpawnEnemy({ wx: cp.x + 180, exactX: cp.x + 180, name: _opp.name, weaponKey: _opp.weaponKey, classKey: _opp.classKey, aiDiff: _opp.aiDiff, color: _opp.color, health: _opp.health, armor: _opp.armor, isArenaLockEnemy: true }, p1);
      const _sec = _opp.second;
      if (_sec) {
        _exploreSpawnEnemy({ wx: cp.x + 300, exactX: cp.x + 300, name: _sec.name, weaponKey: _sec.weaponKey, classKey: _sec.classKey, aiDiff: _sec.aiDiff, color: _sec.color, health: _sec.health || 120, armor: _sec.armor, isElite: true, isArenaLockEnemy: true }, p1);
      }
      // Difficulty escorts (Challenge/Evolution). A duel otherwise has one
      // authored opponent, so the explore enemy cap never reached it. Low base
      // HP because the chapter shift already multiplies it ~2-3x.
      const _extra = typeof _storyDiffCfg === 'function' ? (_storyDiffCfg().duelExtra | 0) : 0;
      const _escW = ['spear', 'axe', 'sword', 'hammer'].filter(w => w !== _opp.weaponKey);
      for (let e = 0; e < _extra; e++) {
        const _ex = e % 2 === 0 ? cp.x - 160 - e * 40 : cp.x + 260 + e * 40;
        _exploreSpawnEnemy({ wx: _ex, exactX: _ex, name: _opp.name + ' Escort', weaponKey: _escW[e % _escW.length], classKey: 'warrior', aiDiff: _opp.aiDiff, color: _opp.color, health: 60, isArenaLockEnemy: true }, p1);
      }
      storyFightSubtitle = { text: `${_opp.name}${_sec ? ' and ' + _sec.name : ''}${_extra ? ' and ' + _extra + ' more' : ''} block${_sec || _extra ? '' : 's'} your path!`, timer: 180, maxTimer: 180, color: '#ffcc66' };
      if (typeof setCameraDrama === 'function') setCameraDrama('wideshot', 46);
    } else if (!_replaySkip && ((_activeStory2Chapter && _activeStory2Chapter.id >= 8) || (storyGauntletState && storyGauntletState.index > 0))) {
      if (!exploreArenaLock && currentArena) {
        exploreArenaLock = {
          left: Math.max(0, cp.x - 240),
          right: Math.min(exploreWorldLen, cp.x + 320),
          prevLeft: currentArena.mapLeft,
          prevRight: currentArena.mapRight,
          label: 'Checkpoint Arena',
          bornFrame: frameCount,
        };
        storyFightSubtitle = { text: 'Arena lock engaged. Clear the wave.', timer: 180, maxTimer: 180, color: '#ffcc66' };
        if (typeof setCameraDrama === 'function') setCameraDrama('wideshot', 46);
      }
      _exploreSpawnEnemy({ wx: cp.x + 80, name: 'Checkpoint Hunter', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#886644', isElite: true, health: 150, isArenaLockEnemy: true }, p1);
      if ((_activeStory2Chapter && _activeStory2Chapter.id >= 18) || exploreEnemyCap >= 4) {
        _exploreSpawnEnemy({ wx: cp.x + 150, name: 'Checkpoint Warden', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#556677', isElite: true, health: 170, isArenaLockEnemy: true }, p1);
      }
    }
  }

  // Side portals are optional, so entering takes a fresh press of the shield
  // (down) key while inside one. Touch alone used to pull the player in: the
  // seeded position can land on an authored switch or climb, and walking past
  // it started a two-elite fight nobody chose. A guard held while walking in
  // does not count; it has to be released and pressed again.
  const _portalKey = p1.controls && p1.controls.shield;
  const _portalDown = !!(_portalKey && typeof keysDown !== 'undefined' && keysDown.has(_portalKey));
  for (const portal of exploreSidePortals) {
    if (!portal.active || portal.entered) continue;
    portal.near = Math.abs(p1.cx() - portal.x) < 34 && Math.abs(p1.cy() - portal.y) < 120;
    if (!portal.near) { portal._keyUp = false; continue; }
    if (_portalDown && portal._keyUp) {
      _storyEnterSidePortal(portal, p1, _activeStory2Chapter);
      continue;
    }
    portal._keyUp = !_portalDown;
  }
  for (const portal of exploreSidePortals) {
    if (!portal || !portal.challengeActive) continue;
    const livePortalEnemy = minions.some(m => m.health > 0 && m.isSidePortalEnemy);
    if (!livePortalEnemy) {
      portal.challengeActive = false;
      _story2.tokens += _storyTokenReward(portal.reward);
      if (portal.type === 'distorted_rift') {
        if (!_story2.metaUpgrades) _story2.metaUpgrades = { damage: 0, survivability: 0, healUses: 0 };
        _story2.metaUpgrades.damage = Math.min(6, _story2.metaUpgrades.damage + 1);
      }
      _saveStory2();
      storyFightSubtitle = {
        text: portal.type === 'distorted_rift'
          ? `Distorted Rift conquered — +${_storyTokenReward(portal.reward)} 🪙 and +1 damage rank.`
          : `Side portal cleared — +${_storyTokenReward(portal.reward)} 🪙`,
        timer: 220,
        maxTimer: 220,
        color: portal.type === 'distorted_rift' ? '#ff88ff' : '#88ffcc'
      };
    }
  }

  if (!storeSurvivalState && !exploreDuelMode && !_exploreChapterBeaten && !_storyPressureScripted() &&
      !_exploreNearGoal(p1) &&
      exploreCombatQuiet > 260 && activeEnemyCount < exploreEnemyCap) {
    const spawnAhead = p1.x + GAME_W * 0.92;
    _exploreSpawnEnemy({
      wx: spawnAhead,
      name: 'Pressure Stalker',
      weaponKey: _activeStory2Chapter && _activeStory2Chapter.id >= 18 ? 'spear' : 'sword',
      classKey: _activeStory2Chapter && _activeStory2Chapter.id >= 20 ? 'assassin' : 'warrior',
      aiDiff: _activeStory2Chapter && _activeStory2Chapter.id >= 24 ? 'hard' : 'medium',
      color: '#665544'
    }, p1);
    exploreCombatQuiet = 120;
  }

  // Anti-idle prod. 360 frames (6s) fired on any brief pause; with the timer now
  // reset by combat it measures real standing-around, so the window is a full
  // 15s. Early chapters get a plain ambusher — a scaled elite is a boss-tier
  // wall when the player is still on starting gear.
  const _ambushChId  = _activeStory2Chapter ? _activeStory2Chapter.id : 0;
  const _ambushElite = _ambushChId >= 10;
  if (!storeSurvivalState && !exploreDuelMode && !_exploreChapterBeaten && !_storyPressureScripted() &&
      !_exploreNearGoal(p1) &&
      exploreAmbushTimer > 900 && Math.abs(p1.vx) < 1.1 && !inCombat && activeEnemyCount < exploreEnemyCap) {
    _exploreSpawnEnemy({
      wx: p1.x + 120,
      name: _ambushElite ? 'Ambush Elite' : 'Ambusher',
      weaponKey: 'axe',
      classKey: _ambushElite ? 'berserker' : 'warrior',
      aiDiff: _ambushChId >= 25 ? 'expert' : _ambushElite ? 'hard' : 'medium',
      color: '#994444',
      isElite: _ambushElite,
      health: _ambushElite ? 165 : 110
    }, p1);
    exploreAmbushTimer = 0;
    storyFightSubtitle = {
      text: _ambushElite ? 'Passive too long. An elite found you.' : 'You stood still too long. Someone found you.',
      timer: 170, maxTimer: 170, color: '#ff7766'
    };
  }

  // Spawn enemies from queue as player advances
  // Guards (isGuard:true) bypass the cap and spawn immediately at world load
  // Regular enemies are capped at exploreEnemyCap concurrent
  const activeRegularCount = minions.filter(m => m.health > 0 && !m.isExploreGuard).length;
  if (exploreSpawnQ.length > 0) {
    const next = exploreSpawnQ[0];
    if (next) {
      const isGuard = !!next.isGuard;
      // At the sealed exit the distance window no longer applies: an enemy the
      // player outran must still be spawned, or the clear-the-area gate waits on
      // a foe that never exists.
      const _drain = !!window._exploreForceSpawnAll;
      const readyToSpawn = isGuard
        ? !minions.some(m => m.isExploreGuard && m._guardX === next.wx) // guard not yet spawned
        : (activeRegularCount < exploreEnemyCap && (_drain || p1.x + GAME_W * 0.8 >= next.wx));
      if (readyToSpawn) {
        exploreSpawnQ.shift();
        _exploreSpawnEnemy(next, p1);
      }
    }
  }
}

function updateExplorePickups(p1) {
  if (!explorePickups || !explorePickups.length || !p1) return;
  for (const it of explorePickups) {
    if (it.collected) continue;
    if (it.type === 'chest') {
      _updateChestPickup(it, p1);
      continue;
    }
    if (Math.abs(p1.cx() - it.x) < 42 && Math.abs(p1.cy() - it.y) < 74) {
      it.collected = true;
      // One-time: record this pickup as permanently taken so it never regenerates
      if (it.key) { _story2.lootTaken = _story2.lootTaken || {}; _story2.lootTaken[it.key] = 1; if (typeof _saveStory2 === 'function') _saveStory2(); }
      const col = it.type === 'heal' ? '#66ff88' : it.type === 'coin' ? '#ffcc33' : '#66ccff';
      spawnParticles(it.x, it.y, col, 16);
      if (SoundManager && SoundManager.superActivate) SoundManager.superActivate();
      if (it.type === 'coin') {
        _story2.tokens = (_story2.tokens || 0) + it.value;
        if (typeof _saveStory2 === 'function') _saveStory2();
        storyFightSubtitle = { text: `+${it.value} 🪙`, timer: 120, maxTimer: 120, color: '#ffcc33' };
      } else if (it.type === 'xp') {
        if (typeof _storyAwardKillExp === 'function') _storyAwardKillExp(it.value);
        else _story2.exp = (_story2.exp || 0) + it.value;
        storyFightSubtitle = { text: `+${it.value} EXP`, timer: 120, maxTimer: 120, color: '#66ccff' };
      } else if (it.type === 'heal') {
        p1.health = Math.min(p1.maxHealth, p1.health + it.value);
        storyFightSubtitle = { text: `Healing crystal  +${it.value} HP`, timer: 150, maxTimer: 150, color: '#66ff88' };
      }
    }
  }
}

// Hidden-loot chests: open on touch. Some caches are watched by one or two weak
// scavengers at seeded posts in the tunnel maze (see the loot pass); a guarded
// cache stays locked until they fall. Entirely optional — off the golden path.
function _chestGuardAlive(it) {
  return !!(it.guarded && minions.some(m => m._chestKey === it.key && m.health > 0));
}

const _CACHE_GUARD_WEAPONS = ['sword', 'axe', 'spear'];
function _updateChestPickup(it, p1) {
  const dx = Math.abs(p1.cx() - it.x);
  // Lazy-spawn the guards as the player closes in. Underground caches wake
  // once the player is down in that cache's tunnels, not while walking above.
  const _inReach = it.underground
    ? (dx < 900 && p1.y + p1.h > _EXP_SURF_Y + 20)
    : dx < 420;
  if (it.guarded && !it._guardSpawned && _inReach) {
    it._guardSpawned = true;
    it.guards.forEach((g, gi) => {
      const wk = _CACHE_GUARD_WEAPONS[Math.floor(_exploreKeyRand(it.key, 7 + gi) * _CACHE_GUARD_WEAPONS.length)];
      _exploreSpawnEnemy({
        wx: g.x, exactX: g.x - 17, exactY: g.floorY - 86,
        name: it.underground ? 'Tunnel Scavenger' : 'Cache Scavenger',
        weaponKey: wk, classKey: 'warrior', aiDiff: 'easy',
        color: '#8a7a5a', health: 70, isWeak: true,
        isChestGuardian: true, chestKey: it.key, postX: g.x,
      }, p1);
    });
    storyFightSubtitle = {
      text: it.guards.length > 1 ? '⚠ Scavengers are picking over this cache.' : '⚠ A scavenger guards this cache.',
      timer: 170, maxTimer: 170, color: '#ffaa44'
    };
  }
  // Leash: each guard holds its post — it never chases across the world.
  if (it.guarded && it._guardSpawned && !it.collected) {
    for (const g of minions) {
      if (g._chestKey !== it.key || g.health <= 0 || g._guardPostX == null) continue;
      if (Math.abs(g.cx() - g._guardPostX) <= 520) continue;
      spawnParticles(g.cx(), g.cy(), '#8a7a5a', 10);
      g.x = g._guardPostX - g.w / 2; g.y = g._guardPostY - g.h - 2; g.vx = 0; g.vy = 0;
      g.health = Math.min(g.maxHealth, g.health + 20);
      spawnParticles(g.cx(), g.cy(), '#8a7a5a', 12);
    }
  }
  if (dx < 46 && Math.abs(p1.cy() - it.y) < 78) {
    if (_chestGuardAlive(it)) {
      if (!it._lockNag || frameCount - it._lockNag > 240) {
        it._lockNag = frameCount;
        storyFightSubtitle = { text: '🔒 Its guards are still around.', timer: 140, maxTimer: 140, color: '#ff7766' };
      }
      return;
    }
    // Open the chest
    it.collected = true;
    if (it.key) { _story2.lootTaken = _story2.lootTaken || {}; _story2.lootTaken[it.key] = 1; if (typeof _saveStory2 === 'function') _saveStory2(); }
    const c = it.contents || {};
    const parts = [];
    if (c.tokens) { _story2.tokens = (_story2.tokens || 0) + c.tokens; parts.push(`+${c.tokens} 🪙`); }
    if (c.exp) {
      if (typeof _storyAwardKillExp === 'function') _storyAwardKillExp(c.exp);
      else _story2.exp = (_story2.exp || 0) + c.exp;
      parts.push(`+${c.exp} EXP`);
    }
    if (c.heal) { p1.health = Math.min(p1.maxHealth, p1.health + c.heal); parts.push(`+${c.heal} HP`); }
    if (typeof _saveStory2 === 'function') _saveStory2();
    spawnParticles(it.x, it.y, it.tier === 'elite' ? '#ffaa22' : '#88ccff', 26);
    if (SoundManager && SoundManager.superActivate) SoundManager.superActivate();
    // Last cache of an already-cleared level = the level's star, right now.
    const _chId = parseInt(it.key, 10);
    const _starNow = typeof storyChapterStarred === 'function' && storyChapterStarred(_chId);
    storyFightSubtitle = {
      text: `${it.tier === 'elite' ? '🗝️ Elite cache' : '🧰 Hidden cache'}  ${parts.join('  ')}${_starNow ? '  ★ Level 100%' : ''}`,
      timer: 190, maxTimer: 190, color: it.tier === 'elite' ? '#ffcc55' : '#aaddff'
    };
    if (typeof checkCompletionAchievements === 'function') checkCompletionAchievements();
  }
}

// Complete a region segment's chapter mid-match: grant the same first-clear
// rewards the victory flow gives (tokens, blueprint, armor blueprint, defeated,
// chapter advance — mirrors story2OnMatchEnd's award block in match.js) and
// save, but keep the match running so the player walks straight on.
function _regionCompleteChapter(chId) {
  const ch = (typeof STORY_CHAPTERS2 !== 'undefined') ? STORY_CHAPTERS2[chId] : null;
  if (!ch || !_story2) return;
  const _first = !_story2.defeated.includes(ch.id);
  if (_first) {
    _story2.tokens += _storyTokenReward(ch.tokenReward);
    if (ch.blueprintDrop && !_story2.blueprints.includes(ch.blueprintDrop)) {
      _story2.blueprints.push(ch.blueprintDrop);
    }
    if (ch.armor && ch.armor.length > 0) {
      if (!_story2.armorBlueprints) _story2.armorBlueprints = [];
      const _piece = 'armor_' + ch.armor[Math.floor(Math.random() * ch.armor.length)];
      if (!_story2.armorBlueprints.includes(_piece)) _story2.armorBlueprints.push(_piece);
    }
    _story2.defeated.push(ch.id);
    const _acct = (typeof window !== 'undefined' && window.GameState) ? GameState.getActiveAccount() : null;
    if (_acct && _acct.data) {
      if (!_acct.data.story || typeof _acct.data.story !== 'object') _acct.data.story = {};
      if (!Array.isArray(_acct.data.story.defeated)) _acct.data.story.defeated = [];
      if (!_acct.data.story.defeated.includes(ch.id)) _acct.data.story.defeated.push(ch.id);
    }
  }
  _story2.chapter = Math.max(_story2.chapter, ch.id + 1);
  if (players[0]) _story2.health = Math.round(players[0].health);
  if (typeof _saveStory2 === 'function') _saveStory2();
  if (typeof checkCompletionAchievements === 'function') checkCompletionAchievements();
  storyFightSubtitle = {
    text: `✓ ${ch.title} complete${_first && ch.tokenReward ? '  +' + _storyTokenReward(ch.tokenReward) + ' 🪙' : ''}`,
    timer: 260, maxTimer: 260, color: '#88ffcc',
  };
  // Objective points at the next segment's chapter
  if (exploreRegion && typeof setObjective === 'function') {
    const _idx = exploreRegion.chapters.indexOf(chId);
    const _next = (typeof STORY_CHAPTERS2 !== 'undefined') ? STORY_CHAPTERS2[exploreRegion.chapters[_idx + 1]] : null;
    if (_next) setObjective('Continue: ' + _next.title);
  }
}

function _exploreSpawnEnemy(def, p1) {
  const isGuard = !!def.isGuard;
  let mx, my;
  if (def.exactX != null) {
    // Contained duel: spawn at an exact X on the ground floor (inside the arena lock, near the player)
    // exactY places underground spawns (tunnel chest guardians) below the surface floor
    const floor = ((currentArena && currentArena.platforms) || []).find(pl => pl.isFloor);
    mx = def.exactX;
    my = def.exactY != null ? def.exactY : (floor ? floor.y : 440) - 84; // 84 = Minion h — spawn feet exactly on the floor
  } else {
    // Guards spawn directly at their post (near the relic), not offset from player
    const spawnX = isGuard ? def.wx : Math.max(p1.x + GAME_W * 0.7, def.wx);
    // Exploration worlds have one continuous isFloor platform — spawn grounded on it
    // (pickSafeSpawnNear picks ANY platform incl. high floaters → floating/embedded enemies)
    const _exFloor = exploreActive
      ? ((currentArena && currentArena.platforms) || []).find(pl => pl.isFloor)
      : null;
    if (_exFloor) {
      mx = spawnX;
      my = _exFloor.y - 84; // 84 = Minion h — spawn feet exactly on the floor
    } else {
      const safeSpawn = typeof pickSafeSpawnNear === 'function'
        ? pickSafeSpawnNear(spawnX, isGuard ? 'any' : 'right', p1 ? p1.x : undefined)
        : null;
      mx = safeSpawn ? safeSpawn.x : spawnX;
      my = safeSpawn ? safeSpawn.y - 84 : 300;
    }
  }
  const m = new Minion(mx, my, def.color || '#888888', def.weaponKey || 'sword', true, def.aiDiff || 'medium');
  // Minion's constructor only takes (x, y) — it hardcodes purple, a coin-flip
  // axe/sword, and 'hard' AI, silently dropping the args above. Every other
  // `new Minion()` call site relies on that, so the authored values are applied
  // here instead. Without this, a chapter's `aiDiff: 'easy'` scout fought at
  // 'hard' and the difficulty floor in _storyScaleEnemyUnit had nothing to do.
  m.color     = def.color || '#888888';
  m.weaponKey = def.weaponKey || 'sword';
  m.weapon    = (typeof WEAPONS !== 'undefined' && WEAPONS[m.weaponKey]) || m.weapon;
  m.aiDiff    = def.aiDiff || 'medium';
  m.name     = def.name || 'Enemy';
  m.lives    = 1;
  m.health   = def.health || (isGuard ? 120 : 80);
  m.maxHealth= def.health || (isGuard ? 120 : 80);
  m.dmgMult  = isGuard ? 1.2 : 1.0;
  if (isGuard) {
    m.isExploreGuard = true;
    m._guardX = def.wx; // the x position they guard
  }
  if (def.isArenaLockEnemy) {
    m.isArenaLockEnemy = true;
    m._aiHoldUntil = frameCount + 180; // 3s grace to register the lock before they engage
  }
  if (def.isSidePortalEnemy) m.isSidePortalEnemy = true;
  if (def.isChestGuardian) {
    m.isChestGuardian = true; m._chestKey = def.chestKey;
    if (def.postX != null) { m._guardPostX = def.postX; m._guardPostY = (def.exactY != null ? def.exactY + 86 : my + 84); }
  }
  if (def.classKey && def.classKey !== 'none' && typeof applyClass === 'function') {
    applyClass(m, def.classKey);
    // applyClass overwrites maxHealth with the class's base HP. An explicitly
    // authored health is a deliberate per-enemy value and outranks that default,
    // so it is restored here; when the chapter did not specify one, the class HP
    // is the better number and stands.
    if (def.health) { m.maxHealth = def.health; m.health = def.health; }
  }
  _storyScaleEnemyUnit(m, _activeStory2Chapter ? _activeStory2Chapter.id : 1, { elite: !!def.isElite });
  // Weak encounter (cache scavengers): roughly half a standard enemy at this
  // point of the story, whatever the chapter scaling made of it.
  if (def.isWeak) {
    m.maxHealth = Math.max(30, Math.round(m.maxHealth * 0.5));
    m.health    = m.maxHealth;
    m.dmgMult  *= 0.6;
    m.attackCooldownMult = (m.attackCooldownMult || 1) * 1.3;
    m._storyWeak = true;
  }
  if (def.armor && typeof storyApplyArmor === 'function') {
    storyApplyArmor(m, def.armor);
  }
  m.storyFaction = 'enemy';
  m._teamId = 2;
  m.target = p1;
  p1.storyFaction = 'player';
  p1._teamId = 1;
  p1.target = m; // P1 targets most recently spawned
  minions.push(m);
}

// ── Fallen Warrior Memory ─────────────────────────────────────────────────────
// A rare (~10%) ambient scene that fires once per fight in late-game chapters
// (id >= 60) to build tension before/during the TrueForm arc.
// Shows a silhouette warrior fighting, then being instantly defeated.
// ─────────────────────────────────────────────────────────────────────────────

let _fallenWarrior = null; // null when inactive

/**
 * Trigger a named ambient scene.  Currently only "fallen_warrior_memory".
 * Safe to call multiple times — ignored if the scene is already playing or
 * if the fight-level flag is already set.
 */
function triggerScene(name) {
  if (!storyModeActive || !gameRunning) return;
  if (name !== 'fallen_warrior_memory') return;
  if (storyEventFired['FALLEN_WARRIOR']) return; // once per fight
  if (_fallenWarrior) return; // already playing

  storyEventFired['FALLEN_WARRIOR'] = true;
  _fallenWarrior = {
    timer:    0,
    duration: 168, // 2.8 s at 60 fps
  };
}

/**
 * Draw the fallen warrior memory overlay in screen-space.
 * Called from smc-loop.js after drawStoryPhaseHUD().
 */
function drawFallenWarriorMemory() {
  if (!_fallenWarrior) return;
  _fallenWarrior.timer++;
  const f   = _fallenWarrior.timer;       // 1 … 168
  const DUR = _fallenWarrior.duration;

  if (f > DUR) { _fallenWarrior = null; return; }

  const cw  = canvas.width;
  const ch  = canvas.height;
  const cx  = cw * 0.5;
  const cy  = ch * 0.5;
  const scY = ch / GAME_H; // logical-to-screen Y scale

  // ── Envelope alphas ──────────────────────────────────────────
  // Fade in  : f  0 → 20
  // Hold     : f 20 → 140
  // Fade out : f 140 → 168
  const fadeIn  = Math.min(1, f / 20);
  const fadeOut = f > 140 ? 1 - (f - 140) / 28 : 1;
  const baseA   = Math.min(fadeIn, fadeOut);

  ctx.save();

  // ── Background vignette ──────────────────────────────────────
  const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.55);
  vg.addColorStop(0,   `rgba(0,0,0,${(baseA * 0.82).toFixed(3)})`);
  vg.addColorStop(0.6, `rgba(0,0,0,${(baseA * 0.72).toFixed(3)})`);
  vg.addColorStop(1,   `rgba(0,0,0,0)`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, cw, ch);

  // ── Silhouette drawing helper ─────────────────────────────────
  // Draws a simple stickman silhouette at (sx, sy) facing dir (+1/-1),
  // scaled by s, with action pose based on phase.
  function _drawSilhouette(sx, sy, s, dir, pose) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(dir * s, s);
    ctx.fillStyle   = `rgba(0,0,0,${baseA.toFixed(3)})`;
    ctx.strokeStyle = `rgba(200,200,255,${(baseA * 0.55).toFixed(3)})`;
    ctx.lineWidth   = 2 / s;
    ctx.shadowColor = 'rgba(150,150,255,0.4)';
    ctx.shadowBlur  = 8 / s;

    // Head
    ctx.beginPath();
    ctx.arc(0, -50 * scY, 7 * scY, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(0, -43 * scY);
    ctx.lineTo(0, -18 * scY);
    ctx.stroke();

    if (pose === 'stand') {
      // Arms down
      ctx.beginPath();
      ctx.moveTo(0, -38 * scY); ctx.lineTo(-12 * scY, -26 * scY);
      ctx.moveTo(0, -38 * scY); ctx.lineTo( 12 * scY, -26 * scY);
      ctx.stroke();
      // Legs
      ctx.beginPath();
      ctx.moveTo(0, -18 * scY); ctx.lineTo(-9 * scY, 0);
      ctx.moveTo(0, -18 * scY); ctx.lineTo( 9 * scY, 0);
      ctx.stroke();

    } else if (pose === 'attack') {
      // Punch arm forward
      ctx.beginPath();
      ctx.moveTo(0, -38 * scY); ctx.lineTo( 22 * scY, -36 * scY);
      ctx.moveTo(0, -38 * scY); ctx.lineTo(-10 * scY, -28 * scY);
      ctx.stroke();
      // Stride legs
      ctx.beginPath();
      ctx.moveTo(0, -18 * scY); ctx.lineTo(-12 * scY,  2 * scY);
      ctx.moveTo(0, -18 * scY); ctx.lineTo( 10 * scY, -2 * scY);
      ctx.stroke();

    } else if (pose === 'fly') {
      // Ragdoll — arms/legs splayed
      ctx.beginPath();
      ctx.moveTo(0, -38 * scY); ctx.lineTo(-18 * scY, -32 * scY);
      ctx.moveTo(0, -38 * scY); ctx.lineTo( 14 * scY, -44 * scY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -18 * scY); ctx.lineTo(-14 * scY,  4 * scY);
      ctx.moveTo(0, -18 * scY); ctx.lineTo( 16 * scY,  8 * scY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Phase logic ──────────────────────────────────────────────
  // Phase A  (f  1-40): warrior stands, facing the enemy (off-screen right)
  // Phase B  (f 41-70): warrior lunges — attack pose, slides forward
  // Phase C  (f 71-90): white flash + instant defeat — warrior flies left
  // Phase D  (f 91-140): warrior lies on ground; "THEY FAILED." text
  // Phase E  (f 141-168): fade out

  const sfX  = cx - cw * 0.10; // warrior screen X at rest
  const sfY  = cy + ch * 0.14; // feet level (mid-lower screen)

  if (f <= 40) {
    // Stand
    _drawSilhouette(sfX, sfY, 1, 1, 'stand');

  } else if (f <= 70) {
    // Lunge: slide right
    const prog = (f - 40) / 30;
    _drawSilhouette(sfX + prog * cw * 0.15, sfY, 1, 1, 'attack');

  } else if (f <= 90) {
    // Impact flash + fly
    const prog = (f - 70) / 20;
    // White flash (fades fast)
    if (f <= 76) {
      const flashA = (1 - (f - 70) / 6) * baseA * 0.7;
      ctx.fillStyle = `rgba(255,255,255,${flashA.toFixed(3)})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    // Warrior flying left and up
    const flyX = sfX + cw * 0.15 - prog * cw * 0.30;
    const flyY = sfY - prog * ch * 0.16 + prog * prog * ch * 0.20; // arc
    _drawSilhouette(flyX, flyY, 1, -1, 'fly');

  } else if (f <= 140) {
    // Crumpled on ground
    const crumpX = sfX + cw * 0.15 - cw * 0.30;
    _drawSilhouette(crumpX, sfY, 1, -1, 'fly');

    // "THEY FAILED." text — fades in between f 95-115
    const textA = Math.min(1, (f - 95) / 20) * baseA;
    if (textA > 0) {
      const fs = Math.round(cw * 0.030);
      ctx.font        = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
      ctx.textAlign   = 'center';
      ctx.letterSpacing = '0.12em';
      // Shadow
      ctx.shadowColor = 'rgba(100,80,200,0.9)';
      ctx.shadowBlur  = 18;
      ctx.fillStyle   = `rgba(220,210,255,${textA.toFixed(3)})`;
      ctx.fillText('THEY FAILED.', cx, cy - ch * 0.22);
      // Thin underline rule
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = `rgba(200,180,255,${(textA * 0.35).toFixed(3)})`;
      ctx.lineWidth   = 1;
      const tw = ctx.measureText('THEY FAILED.').width;
      ctx.beginPath();
      ctx.moveTo(cx - tw * 0.5, cy - ch * 0.22 + fs * 0.25);
      ctx.lineTo(cx + tw * 0.5, cy - ch * 0.22 + fs * 0.25);
      ctx.stroke();
    }
  }
  // Phase E: just the envelope fades — nothing extra to draw

  ctx.restore();
}
