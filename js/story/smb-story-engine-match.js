'use strict';

// smb-story-engine-match.js — spawnWorldBoss, story2OnMatchEnd, _completeChapter2, storyVictory, story2Init
// Depends on: smb-globals.js, smb-story-registry.js (and preceding story-engine splits)

// ── Saga scoping ──────────────────────────────────────────────────────────────
// On a 'full' build these resolve to the whole story, so behaviour is unchanged.
// smb-saga-structure.js loads AFTER this file, so both guard on its presence.
function _sagaFinalId() {
  if (typeof activeSagaFinalChapterId === 'function') return activeSagaFinalChapterId();
  return STORY_CHAPTERS2.reduce((m, c) => Math.max(m, c.id), -1);
}
function _sagaInRange(chId) {
  if (typeof isChapterInActiveSaga === 'function') return isChapterInActiveSaga(chId);
  return true;
}

// Patches the freshly-spawned Boss instance with world-specific stat/behaviour
// tweaks.  Keep these as simple property overrides — do NOT rebuild Boss logic.
function spawnWorldBoss(wId) {
  if (!players || !Array.isArray(players)) return;
  const boss = players.find(p => p && p.isBoss && !p.isTrueForm);
  if (!boss) return;

  switch (wId) {
    case 'fracture':
      // Teleport-heavy: shorter beam cooldown, snaps position toward player periodically
      boss._worldBossVariant = 'fracture';
      boss.beamCooldown       = Math.min(boss.beamCooldown || 600, 400);
      boss._fractureTeleportCd = 0; // countdown handled in Boss.updateAI guard block below
      break;

    case 'war':
      // Aggressive combo boss: faster attacks, higher KB output
      boss._worldBossVariant  = 'war';
      boss.attackCooldownMult = Math.min(boss.attackCooldownMult || 0.35, 0.22);
      boss.kbBonus            = (boss.kbBonus || 1.8) * 1.35;
      boss.speed              = (boss.speed || 3.2) * 1.2;
      if (typeof showBossDialogue === 'function') {
        setTimeout(() => showBossDialogue('"War has no patience."', 140), 1200);
      }
      break;

    case 'mirror':
      // Mirror AI: copies the player's last weapon key at fight start
      boss._worldBossVariant = 'mirror';
      if (players[0] && typeof WEAPONS !== 'undefined') {
        const playerWeaponKey = players[0].weaponKey || 'sword';
        if (WEAPONS[playerWeaponKey]) {
          boss.weapon    = WEAPONS[playerWeaponKey];
          boss.weaponKey = playerWeaponKey;
        }
      }
      boss.kbResist = (boss.kbResist || 0.3) * 0.8; // slightly less tanky — relies on mirroring
      break;

    case 'godfall':
      // High-damage boss: raw stat pump, slower movement to compensate
      boss._worldBossVariant = 'godfall';
      boss.kbBonus           = (boss.kbBonus || 1.8) * 1.6;
      boss.speed             = Math.max((boss.speed || 3.2) * 0.8, 2.0);
      boss.health            = Math.round(boss.health * 1.2);
      boss.maxHealth         = boss.health;
      if (typeof showBossDialogue === 'function') {
        setTimeout(() => showBossDialogue('"Gods do not fall — they collapse everything around them."', 180), 1200);
      }
      break;

    case 'code':
      // UI disruption boss: triggers storyDistortLevel ramp on fight start
      boss._worldBossVariant = 'code';
      if (typeof storyDistortLevel !== 'undefined') {
        storyDistortLevel = Math.min(1.0, (storyDistortLevel || 0) + 0.25);
      }
      boss.color = '#00ffcc'; // teal tint to signal Code variant
      if (typeof showBossDialogue === 'function') {
        setTimeout(() => showBossDialogue('"You\'re reading the wrong version of this fight."', 160), 1200);
      }
      break;

    default:
      break;
  }
}

// ── Called when the player wins a story2 chapter ─────────────────────────────
// ── Shop recommendation on chapter loss ───────────────────────────────────────
function _showStory2LoseNag(ch) {
  // Wait one frame so endGame() can finish building the overlay before we inject into it
  requestAnimationFrame(() => {
    const ov = document.getElementById('gameOverOverlay');
    if (!ov) return;

    // Remove any previous nag so replay doesn't stack them
    const old = ov.querySelector('#story2LoseNag');
    if (old) old.remove();

    // Find items the player can afford and hasn't bought yet
    const affordable = Object.entries(STORY_ABILITIES2).filter(([key, ab]) => {
      const owned = _story2.unlockedAbilities.includes(key);
      const hasBP = !ab.requiresBlueprint || _story2.blueprints.includes(key);
      return !owned && hasBP && _story2.tokens >= ab.tokenCost;
    });

    // Build nag HTML
    const nag = document.createElement('div');
    nag.id = 'story2LoseNag';
    nag.style.cssText = [
      'margin-top:14px', 'padding:12px 16px',
      'background:rgba(180,60,20,0.18)',
      'border:1px solid rgba(255,120,40,0.35)',
      'border-radius:10px', 'font-size:0.78rem',
      'color:#ffcc99', 'text-align:left', 'max-width:340px', 'margin-inline:auto',
    ].join(';');

    if (affordable.length === 0) {
      // Player can't afford anything — tell them tokens come from winning/replaying
      nag.innerHTML = `
        <div style="font-weight:700;margin-bottom:5px;color:#ffaa66;">💡 Ability Store</div>
        <div style="color:#ccbbaa;">You don't have enough tokens to buy anything right now.
          Beat earlier chapters or replay them to earn more tokens — then spend them in the
          <b>Ability Store</b> before your next attempt.</div>`;
    } else {
      // Pick the single most impactful affordable item to highlight
      // Priority: medkit (instant heal) > last_stand2 > ghost_step2 > others; else just cheapest
      const PRIORITY = ['medkit2', 'last_stand2', 'ghost_step2', 'shield_bash2', 'reflect2'];
      let pick = affordable.find(([k]) => PRIORITY.includes(k)) || affordable[0];
      const [pickKey, pickAb] = pick;

      const moreCount = affordable.length - 1;
      const moreText  = moreCount > 0
        ? `<span style="color:#ffee99"> + ${moreCount} more item${moreCount > 1 ? 's' : ''} you can afford</span>`
        : '';

      nag.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;color:#ffaa66;">
          🏪 Ability Store — ${_story2.tokens} 🪙 available
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:1.6rem;line-height:1;">${pickAb.icon}</span>
          <div>
            <div style="font-weight:700;color:#fff;">${pickAb.name}
              <span style="color:#ffcc55;font-weight:400;"> — ${pickAb.tokenCost} 🪙</span>
            </div>
            <div style="color:#ddd;font-size:0.73rem;">${pickAb.desc}</div>
          </div>
        </div>
        ${moreText ? `<div style="font-size:0.71rem;margin-bottom:8px;">${moreText}</div>` : ''}
        <button id="story2NagStoreBtn" style="
          width:100%;padding:8px 0;background:linear-gradient(135deg,#8833cc,#aa44ee);
          border:none;border-radius:8px;color:#fff;font-weight:700;font-size:0.82rem;
          cursor:pointer;letter-spacing:0.5px;">
          🏪 Visit Ability Store
        </button>`;
    }

    // Insert nag above the button row
    const btnRow = ov.querySelector('.btn-row');
    if (btnRow) btnRow.before(nag);
    else ov.querySelector('.overlay-box').appendChild(nag);

    // Wire up Visit Store button — open story menu directly on the store tab
    const storeBtn = nag.querySelector('#story2NagStoreBtn');
    if (storeBtn) {
      storeBtn.onclick = () => {
        ov.style.display = 'none';
        storyModeActive = false;
        if (typeof backToMenu === 'function') backToMenu();
        setTimeout(() => { if (typeof openStoryMenuShop === 'function') openStoryMenuShop(); }, 340);
      };
    }
  });
}

// Set to true by storyCheckEvents when Axiom scripted-defeats the player in ch91.
// Causes story2OnMatchEnd to auto-advance instead of showing the retry screen.
let _axiomForcedPlayerLoss = false;

// Hooked into endGame via storyOnMatchEnd — we intercept after storyModeActive check
function story2OnMatchEnd(playerWon) {
  const ch = _activeStory2Chapter;
  if (!ch || !storyModeActive) return false; // not a story2 fight

  // Flush any unshown early fight-script entries (frame ≤ 90) so they always display
  if (storyFightScript && storyFightScriptIdx < storyFightScript.length) {
    const earlyEntry = storyFightScript.slice(storyFightScriptIdx).find(e => e.frame <= 90);
    if (earlyEntry) {
      const dur = earlyEntry.timer || 200;
      storyFightSubtitle = { text: earlyEntry.text, timer: dur, maxTimer: dur, color: earlyEntry.color, speaker: earlyEntry.speaker || null };
    }
  }
  if (!playerWon) {
    // Ch63: Axiom scripted defeat — advance automatically, do not show retry screen.
    // Phase expansion reassigns ch.id; the original id lives in ch._origId.
    if (_axiomForcedPlayerLoss && (ch._origId !== undefined ? ch._origId : ch.id) === 63) {
      _axiomForcedPlayerLoss = false;
      _completeChapter2(ch);
      return true;
    }
    _axiomForcedPlayerLoss = false;
    if (_story2.runState) _story2.runState.noDeathChain = 0;
    _showStory2RetryScreen(ch);
    return true; // handled — don't complete chapter
  }

  const p1 = players && players.find(p => !p.isBoss && !p.isAI);
  if (p1 && p1.maxHealth > 0) {
    _storySetCarryHealthPct(p1.health / p1.maxHealth);
  }

  // Multiverse world boss beaten — record world clear, unlock next world, apply scaling
  if (ch.isMultiverseWorld && ch.multiverseWorldId && typeof MultiverseManager !== 'undefined') {
    MultiverseManager.onWorldComplete(ch.multiverseWorldId);
    MultiverseManager.deactivate();
  }

  if (storyGauntletState && _advanceStoryGauntletPhase(ch)) {
    if (!_story2.runState) _story2.runState = { healthPct: 1, noDeathChain: 0 };
    _story2.runState.noDeathChain = (_story2.runState.noDeathChain || 0) + 1;
    _saveStory2();
    return true;
  }

  // Award tokens + blueprint
  storyGauntletState = null;
  storyPendingPhaseConfig = null;
  storyPhaseIndicator = null;
  _story2.tokens += _storyTokenReward(ch.tokenReward);
  if (ch.blueprintDrop && !_story2.blueprints.includes(ch.blueprintDrop)) {
    _story2.blueprints.push(ch.blueprintDrop);
  }
  // Armor blueprint drop: killing an armored enemy drops one random piece blueprint
  if (ch.armor && ch.armor.length > 0) {
    if (!_story2.armorBlueprints) _story2.armorBlueprints = [];
    const _armorPiece = ch.armor[Math.floor(Math.random() * ch.armor.length)];
    const _bpKey = 'armor_' + _armorPiece;
    if (!_story2.armorBlueprints.includes(_bpKey)) {
      _story2.armorBlueprints.push(_bpKey);
    }
  }
  const _firstClear = !_story2.defeated.includes(ch.id);
  if (_firstClear) {
    _story2.defeated.push(ch.id);
    // Recompute rather than increment — saga-scoped and idempotent.
    if (typeof _storyRecomputePowerLevel === 'function') _storyRecomputePowerLevel();
    if (typeof unlockAchievement === 'function') unlockAchievement('story_begin');
    // Immediately commit defeated list to account.data so it survives before saveGame flushes
    const _acctD = window.GameState ? GameState.getActiveAccount() : null;
    if (_acctD && _acctD.data) {
      if (!_acctD.data.story || typeof _acctD.data.story !== 'object') _acctD.data.story = {};
      if (!Array.isArray(_acctD.data.story.defeated)) _acctD.data.story.defeated = [];
      if (!_acctD.data.story.defeated.includes(ch.id)) _acctD.data.story.defeated.push(ch.id);
    }
  }
  const _prevChapter = _story2.chapter;
  _story2.chapter = Math.max(_story2.chapter, ch.id + 1);
  if (_story2.chapter !== _prevChapter) {
    console.info('[STATE MUTATION] chapter', _prevChapter, '->', _story2.chapter);
    // Immediately commit chapter to account.data — authoritative before saveGame flushes
    const _acctC = window.GameState ? GameState.getActiveAccount() : null;
    if (_acctC && _acctC.data) {
      if (!_acctC.data.story || typeof _acctC.data.story !== 'object') _acctC.data.story = {};
      _acctC.data.story.chapter = _story2.chapter;
      _acctC.data.chapter = _story2.chapter;
    }
  }
  if (typeof completeObjective === 'function') completeObjective();
  // Online: broadcast story state so clients stay in sync
  if (typeof onlineMode !== 'undefined' && onlineMode && typeof NetworkManager !== 'undefined' && NetworkManager.connected) {
    const _bossEntity = typeof players !== 'undefined' && players.find(p => p && p.isBoss);
    const _syncData = {
      chapter:    _story2.chapter,
      defeated:   _story2.defeated.slice(),
      bossHealth: _bossEntity ? _bossEntity.health : undefined,
      objective:  window.currentObjective ? window.currentObjective.text : undefined,
      isCinematic: typeof isCinematic !== 'undefined' ? isCinematic : false,
    };
    NetworkManager.sendGameEvent('story_sync', _syncData);
  }
  if (!_story2.runState) _story2.runState = { healthPct: 1, noDeathChain: 0 };
  _story2.runState.noDeathChain = (_story2.runState.noDeathChain || 0) + 1;

  // Sovereign chapter win — unlock Neural AI and Sovereign Ω modes
  if (ch.isSovereignFight && !sovereignBeaten) {
    if (typeof setAccountFlagWithRuntime === 'function') {
      setAccountFlagWithRuntime(['unlocks', 'sovereignBeaten'], true, function(v) { sovereignBeaten = v; });
    } else {
      sovereignBeaten = true;
    }
    const adCard  = document.getElementById('modeAdaptive');
    const sovCard = document.getElementById('modeSovereign');
    if (adCard)  adCard.style.display  = '';
    if (sovCard) sovCard.style.display = '';
  }

  // Check story completion (trigger on last non-epilogue chapter win)
  // Saga builds end at their own last fight, not the full story's (see
  // docs/SAGA_SPLIT_PLAN.md). _sagaInRange() is the whole story on a 'full' build.
  const _lastFightId = STORY_CHAPTERS2
    .filter(c => !c.noFight && !c.isEpilogue && !c.isDamnationChapter && _sagaInRange(c.id))
    .reduce((m,c)=>Math.max(m,c.id),-1);
  if (ch.id >= _lastFightId && !_story2.storyComplete) {
    _completeStory2();
  }
  // Level won: its rest-checkpoint resume point is spent.
  if (_story2.cpResume && _story2.cpResume.chId === ch.id) _story2.cpResume = null;
  _saveStory2();
  if (typeof checkCompletionAchievements === 'function') checkCompletionAchievements();

  // ── Ship part awards (first-clear only) ────────────────────────────────
  // Hull fragments scattered through Act 0 and Act 1.
  // Engine drops at the Act 1 climax (ch ~24). Core at Act 3 (ch ~50).
  // Crystal is awarded by the fracture preview system, not here.
  // Award against the ORIGINAL chapter id (phase expansion reassigns ch.id),
  // and only on the final phase — otherwise every phase of an expanded chapter
  // re-awards on its own first clear.
  const _chOrig = ch._origId !== undefined ? ch._origId : ch.id;
  const _isFinalPhase = ch._origId === undefined || ch._phaseFinal === true;
  if (_firstClear && _isFinalPhase && typeof giveShipPart === 'function') {
    if (_chOrig === 5)  giveShipPart('hull');   // Act 0 — first victory
    if (_chOrig === 12) giveShipPart('hull');   // Act 0 arc 2 close
    if (_chOrig === 18) giveShipPart('hull');   // Act 1 — void arena cleared
    if (_chOrig === 24) giveShipPart('hull');   // Act 1 climax
    if (_chOrig === 30) giveShipPart('hull');   // Act 2 entry
    if (_chOrig === 24) giveShipPart('engine'); // Act 1 boss — engine recovered
    if (_chOrig === 50) giveShipPart('core');   // Act 3 climax — dimensional core
  }

  // ── Motivation advancement ─────────────────────────────────────────────
  // Stage 0→1: player has fought enough to start asking why (ch 10)
  // Stage 1→2: player learns the Creator controls the branch (ch 30)
  // Stage 2→3: player understands True Form is the only end (ch 55)
  if (_firstClear && _isFinalPhase && typeof advanceMotivation === 'function') {
    if (_chOrig === 10) advanceMotivation(); // 0→1: investigation
    if (_chOrig === 30) advanceMotivation(); // 1→2: understanding
    if (_chOrig === 55) advanceMotivation(); // 2→3: commitment
  }

  // ── Fracture unlock: reveal branch_alpha after Act 1 ──────────────────
  if (_firstClear && ch.id === 20 && typeof unlockFracture === 'function') {
    unlockFracture('branch_alpha');
  }

  // Fallen God post-defeat: play Axiom origin cutscene, then show victory overlay.
  // The cutscene runs on its own canvas overlay and RAF loop (game loop is already stopped).
  // _showStory2Victory is deferred until the cutscene ends so it doesn't appear on top.
  if (ch.bossType === 'fallen_god') {
    if (_firstClear && typeof ch.onComplete === 'function') {
      try { ch.onComplete(); } catch(e) { /* guard */ }
    }
    if (typeof startAxiomOriginCutscene === 'function') {
      startAxiomOriginCutscene(() => _showStory2Victory(ch));
    } else {
      _showStory2Victory(ch);
    }
    return true;
  }

  // ── Per-chapter onComplete hook ───────────────────────────────────────────
  // Arc files can attach `onComplete()` to a chapter object to fire side effects
  // (set story flags, trigger lore moments, etc.) on first-clear win.
  if (_firstClear && typeof ch.onComplete === 'function') {
    try { ch.onComplete(); } catch (e) { /* guard: never let a hook crash the win path */ }
  }

  // Show victory overlay (instead of or in addition to level complete)
  _showStory2Victory(ch);
  return true; // consumed by story2 system
}

function _completeChapter2(ch) {
  // Called for no-fight chapters (epilogue)
  storyGauntletState = null;
  storyPendingPhaseConfig = null;
  storyPhaseIndicator = null;
  if (!_story2.defeated.includes(ch.id)) {
    _story2.defeated.push(ch.id);
    // Recompute rather than increment — saga-scoped and idempotent.
    if (typeof _storyRecomputePowerLevel === 'function') _storyRecomputePowerLevel();
  }
  _story2.tokens += _storyTokenReward(ch.tokenReward);
  _story2.chapter = Math.max(_story2.chapter, ch.id + 1);
  if (ch.unlocksFragment && typeof wxUnlockFragmentStyle === 'function') wxUnlockFragmentStyle(true);
  // isEpilogue marks reflective no-fight codas throughout the story (ch 13-16, 84,
  // 149, 185), NOT "the end." Only the true final chapter (highest id) completes it.
  // Fight-chapter completion is handled separately via _lastFightId in story2OnMatchEnd.
  const _finalChapterId2 = _sagaFinalId();
  if (ch.isEpilogue && ch.id >= _finalChapterId2) _completeStory2();
  _awardSagaCompletion();
  _saveStory2();
  if (typeof checkCompletionAchievements === 'function') checkCompletionAchievements();
  _showStory2Victory(ch);
}

// Award the completion achievement for every saga fully cleared. Called on story
// completion and after each chapter clear, so a 'full' build hands out saga1/saga2
// as the player passes those boundaries rather than only at ch. 183.
function _awardSagaCompletion() {
  if (typeof SAGA_STRUCTURE === 'undefined' || typeof unlockAchievement !== 'function') return;
  if (!_story2 || !Array.isArray(_story2.defeated)) return;
  for (const saga of SAGA_STRUCTURE) {
    const [lo, hi] = sagaChapterRange(saga.id);
    let all = true;
    for (let i = lo; i <= hi; i++) {
      if (!_story2.defeated.includes(i)) { all = false; break; }
    }
    if (all) unlockAchievement(saga.id + '_complete');
  }
}

function _completeStory2() {
  _story2.storyComplete = true;
  if (typeof unlockAchievement === 'function') unlockAchievement('story_complete');
  _awardSagaCompletion();
  if (typeof setAccountFlagWithRuntime === 'function') {
    setAccountFlagWithRuntime(['unlocks', 'storyOnline'], true, function(v) { storyOnline = v; });
  } else {
    storyOnline = true;
  }
  // Show Story Online mode card
  const soCard = document.getElementById('modeStoryOnline');
  if (soCard) soCard.style.display = '';
  _saveStory2();
}

function _showStory2Victory(ch) {
  const overlay = document.getElementById('storyVictoryOverlay');
  if (!overlay) { openStoryMenu(); return; }

  const titleEl   = document.getElementById('storyVictoryChTitle');
  const postEl    = document.getElementById('storyVictoryPostText');
  const rewardEl  = document.getElementById('storyVictoryRewards');
  const nextBtn   = document.getElementById('storyVictoryNextBtn');

  if (titleEl) titleEl.textContent = ch.title;
  // A chapter that ends the ACTIVE saga can close differently from the same
  // chapter read mid-story: `sagaFinaleText` replaces postText only when this
  // build stops here. On a 'full' build a saga-boundary chapter is a transition
  // and keeps its normal postText, so the combined story reads unchanged.
  const _isSagaFinale = ch.sagaFinaleText && ch.id >= _sagaFinalId();
  if (postEl)  postEl.textContent  = (_isSagaFinale ? ch.sagaFinaleText : ch.postText) || 'Victory!';

  if (rewardEl) {
    let html = `<div style="color:#ffd700;font-size:0.80rem;margin-bottom:5px;">Rewards earned:</div>`;
    html += `<div style="color:#ffee99;font-size:0.76rem;">🪙 +${_storyTokenReward(ch.tokenReward)} tokens (total: ${_story2.tokens})</div>`;
    if (ch.blueprintDrop && STORY_ABILITIES2[ch.blueprintDrop]) {
      html += `<div style="color:#88ccff;font-size:0.76rem;margin-top:3px;">📋 Blueprint: ${STORY_ABILITIES2[ch.blueprintDrop].name}</div>`;
    }
    if (ch.armor && ch.armor.length > 0) {
      const _piece = ch.armor[Math.floor(Math.random() * ch.armor.length)];
      const _pieceNames = { helmet: 'Helmet', chestplate: 'Chestplate', leggings: 'Leggings' };
      html += `<div style="color:#9ab8e8;font-size:0.76rem;margin-top:3px;">🛡️ Armor Blueprint: ${_pieceNames[_piece] || _piece}</div>`;
    }
    if (_story2.storyComplete) {
      html += `<div style="color:#ffaaff;font-size:0.76rem;margin-top:5px;font-style:italic;">🌐⚔️ Story Online mode unlocked!</div>`;
    }
    if (ch.isSovereignFight && sovereignBeaten) {
      html += `<div style="color:#cc44ff;font-size:0.82rem;margin-top:8px;font-weight:800;letter-spacing:1px;text-shadow:0 0 10px #cc44ff;">⚡ NEURAL AI MODES UNLOCKED</div>`;
      html += `<div style="color:#aa88dd;font-size:0.72rem;margin-top:2px;font-style:italic;">Challenge SOVEREIGN &amp; SOVEREIGN Ω from the main menu.</div>`;
    }
    rewardEl.innerHTML = html;
  }

  // The true final chapter is the highest id; only it should read as "the end."
  // isEpilogue is also used for mid-story reflective codas (see _completeChapter2),
  // so gate the "no Continue" ending on the real final chapter, not the flag.
  const _finalChapterId = _sagaFinalId();
  // Find the next VISIBLE chapter for the button label (skip over hidden transition chapters)
  let _nextVisIdx = ch.id + 1;
  while (STORY_CHAPTERS2[_nextVisIdx] && STORY_CHAPTERS2[_nextVisIdx]._menuHidden) _nextVisIdx++;
  const nextCh = STORY_CHAPTERS2[ch.id + 1];    // first immediate next (may be hidden)
  const nextVisCh = STORY_CHAPTERS2[_nextVisIdx]; // first visible next

  if (nextBtn) {
    if (ch.id === 0) {
      // First chapter beaten — offer "Continue to Game" to unlock the main menu
      nextBtn.style.display = '';
      nextBtn.textContent = '🎮 Continue to Game';
      nextBtn.style.cssText = 'padding:12px 28px;font-size:1rem;font-weight:800;letter-spacing:1px;background:linear-gradient(135deg,#1a5acc,#2277ee);border:none;border-radius:10px;color:#fff;cursor:pointer;box-shadow:0 4px 20px rgba(50,120,255,0.5);width:100%;margin-top:8px;';
      nextBtn.onclick = () => {
        const overlay = document.getElementById('storyVictoryOverlay');
        if (overlay) overlay.style.display = 'none';
        _activeStory2Chapter = null;
        storyModeActive = false;
        if (typeof backToMenu === 'function') backToMenu();
        if (typeof showChapter1SavePrompt === 'function') {
          setTimeout(() => showChapter1SavePrompt(), 250);
        }
        _updateStoryCloseBtn();
      };
    } else if (nextCh && ch.id < _finalChapterId) {
      nextBtn.style.display = '';
      nextBtn.textContent = '▶ Continue' + (nextVisCh ? ': ' + nextVisCh.title : '');
      nextBtn.style.cssText = 'padding:12px 28px;font-size:1rem;font-weight:800;letter-spacing:1px;background:linear-gradient(135deg,#1a8a44,#22bb66);border:none;border-radius:10px;color:#fff;cursor:pointer;box-shadow:0 4px 20px rgba(0,200,80,0.5);width:100%;margin-top:8px;';
      nextBtn.onclick = () => storyVictoryNextChapter();
    } else {
      nextBtn.style.display = 'none';
    }
  }

  // Hide the regular game-over overlay so victory takes full focus
  const goOverlay = document.getElementById('gameOverOverlay');
  if (goOverlay) goOverlay.style.display = 'none';

  overlay.style.display = 'flex';
}

function storyVictoryNextChapter() {
  const overlay = document.getElementById('storyVictoryOverlay');
  const ch = _activeStory2Chapter;
  if (overlay) overlay.style.display = 'none';
  if (ch) {
    const nextCh = STORY_CHAPTERS2[ch.id + 1];
    if (nextCh) {
      _activeStory2Chapter = null;

      // Detect arc boundary — show multiverse travel cinematic when entering a new arc
      const curArc  = _getArcForChapter(ch.id);
      const nextArc = _getArcForChapter(nextCh.id);
      const crossingArc = nextArc && curArc && nextArc.id !== curArc.id;

      function _doLaunch() {
        // Reveal the story modal as the backdrop BEFORE launching. If the next
        // chapter is a fight, _beginChapter2 → _launchChapter2FightImmediate hides
        // it again; doing this after the launch re-opened the modal on top of the
        // now-running level (had to close both the level and the modal to play).
        const m = document.getElementById('storyModal');
        if (m) m.style.display = 'flex';
        _renderChapterList();
        _story2TokenDisplay();
        _beginChapter2(nextCh.id);
      }

      if (crossingArc && typeof startMultiverseTravelCinematic === 'function') {
        // Find act color for the next arc
        let arcColor = '#8844ff';
        for (const act of STORY_ACT_STRUCTURE) {
          if (act.arcs.some(a => a.id === nextArc.id)) { arcColor = act.color; break; }
        }
        startMultiverseTravelCinematic(nextArc.label, arcColor, _doLaunch);
      } else {
        _doLaunch();
      }
      return;
    }
  }
  storyVictoryBackToMenu();
}

function storyVictoryBackToMenu() {
  const overlay = document.getElementById('storyVictoryOverlay');
  if (overlay) overlay.style.display = 'none';
  _activeStory2Chapter = null;
  storyModeActive = false;
  storyGauntletState = null;
  storyPendingPhaseConfig = null;
  storyPhaseIndicator = null;
  storyEnemyArmor = []; storyTwoEnemies = false; storySecondEnemyDef = null; storyAllyDef = null;
  storyBossType = null;
  if (typeof backToMenu === 'function') backToMenu();
  setTimeout(openStoryMenu, 300);
}

// ── Init: show Story Online card if already complete ─────────────────────────
