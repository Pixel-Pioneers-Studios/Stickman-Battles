'use strict';
// smb-finisher-engine — Depends on: smb-finisher-helpers.js


// ============================================================
// FINISHER PICKER
// ============================================================
function _pickFinisher(attacker) {
  const wKey = attacker.weaponKey;
  const cKey = attacker.charClass;
  const haW  = !!(WEAPON_FINISHERS[wKey]);
  // Class finisher only fires if the class has no locked weapon OR the attacker is still using it
  const classLockedWeapon = cKey && typeof CLASSES !== 'undefined' && CLASSES[cKey] && CLASSES[cKey].weapon;
  const classWeaponMatch  = !classLockedWeapon || attacker.weaponKey === classLockedWeapon;
  const haC  = cKey && cKey !== 'none' && classWeaponMatch && !!(CLASS_FINISHERS[cKey]);

  if (!haW && !haC) return null;
  if ( haW && !haC) return { key: wKey,          def: WEAPON_FINISHERS[wKey] };
  if (!haW &&  haC) return { key: 'class_'+cKey, def: CLASS_FINISHERS[cKey]  };

  // Both — weighted 50/50 with consecutive-skip bonus (+10% per skip, capped 10/90)
  const wSkips = attacker._finSkipW || 0;
  const cSkips = attacker._finSkipC || 0;
  const wChance = Math.max(0.1, Math.min(0.9, 0.5 + (cSkips - wSkips) * 0.1));
  if (Math.random() < wChance) {
    attacker._finSkipW = 0;
    attacker._finSkipC = cSkips + 1;
    return { key: wKey, def: WEAPON_FINISHERS[wKey] };
  } else {
    attacker._finSkipC = 0;
    attacker._finSkipW = wSkips + 1;
    return { key: 'class_'+cKey, def: CLASS_FINISHERS[cKey] };
  }
}

// ── Per-character boss finisher pools ────────────────────────
const _TF_KILL_POOL      = [FIN_VOID_SLAM, FIN_REALITY_BREAK, FIN_TF_ERASURE, FIN_TF_PHASE_SHIFT];
const _CREATOR_KILL_POOL = [FIN_SKY_EXECUTION, FIN_DARKNESS_FALLS, FIN_CR_CODE_DELETION];
const _YETI_KILL_POOL    = [FIN_YETI_AVALANCHE, FIN_YETI_POLAR_SLAM, FIN_YETI_ICE_BURIAL];
const _BEAST_KILL_POOL   = [FIN_BEAST_FERAL_TACKLE, FIN_BEAST_NATURE_DEVOUR, FIN_BEAST_SAVAGE_LAUNCH];
// Legacy fallback
const _BOSS_KILL_POOL    = [FIN_VOID_SLAM, FIN_REALITY_BREAK, FIN_SKY_EXECUTION, FIN_DARKNESS_FALLS];

// ============================================================
// TRIGGER
// ============================================================
function triggerFinisher(attacker, target) {
  if (!settings.finishers) return false;
  if (activeFinisher)      return false;
  // Never start a finisher while a cinematic owns the stage: it would replace
  // activeCinematic, orphan that cinematic's onEnd, and strand its combat lock.
  if (typeof activeCinematic !== 'undefined' && activeCinematic) return false;
  if (typeof isCinematic !== 'undefined' && isCinematic) return false;
  if (!attacker || !target) return false;
  if (trainingMode || tutorialMode) return false;
  if (onlineMode)          return false;
  // In BR (or any mode with many bot-vs-bot fights) only show finishers the local player is part of
  if (gameMode === 'battleroyale') {
    var _localP = players[0];
    if (!_localP || (attacker !== _localP && target !== _localP)) return false;
  }

  let def = null;

  if (attacker.isBoss && !target.isBoss) {
    // Boss kills player — pick from character-specific pool
    let _pool;
    if (attacker.isTrueForm)           _pool = _TF_KILL_POOL;
    else if (attacker.isYeti)          _pool = _YETI_KILL_POOL;
    else if (attacker.isBeast)         _pool = _BEAST_KILL_POOL;
    else                               _pool = _CREATOR_KILL_POOL;
    def = _pool[Math.floor(Math.random() * _pool.length)];
  } else if ((target.isBoss || target.isSovereignMK2) && !attacker.isBoss) {
    // Player kills boss or Sovereign
    def = FIN_HEROS_TRIUMPH;
  } else if (!attacker.isBoss && !target.isBoss) {
    // Player vs player
    const picked = _pickFinisher(attacker);
    if (!picked) return false;
    def = picked.def;
  } else {
    return false;
  }

  if (!def) return false;

  // Freeze target alive
  target.health    = 1;
  target.invincible = 9999;
  target.vx = 0; target.vy = 0;
  attacker.vx = 0; attacker.vy = 0;

  const data = {};
  if (def.setup) {
    try {
      def.setup(attacker, target, data);
    } catch (e) {
      // Roll back the freeze-alive lock — otherwise the target is stuck at
      // health=1/invincible=9999 with no finisher driving completion.
      console.error('[finisher] setup threw — aborting finisher:', e);
      target.health = 0;
      target.invincible = 0;
      return false;
    }
  }

  activeFinisher = {
    attacker,
    target,
    timer: 0,
    totalDuration: def.duration || 90,
    def,
    data,
  };

  // Block processInput() and updateAI() during the finisher
  activeCinematic = _makeFinisherSentinel();
  isCinematic = true;
  if (typeof setCombatLock === 'function') setCombatLock('finisher');

  // Completely stop the game world — physics, particles, everything freezes
  slowMotion = 0;

  // Achievement tracking — only credit the human player's finishers
  if (!attacker.isAI && !attacker.isBoss && typeof unlockAchievement === 'function') {
    _achStats.finisherCount = (_achStats.finisherCount || 0) + 1;
    unlockAchievement('first_finisher');
    if (_achStats.finisherCount >= 10) unlockAchievement('finisher_master');
  }

  return true;
}

// ============================================================
// UPDATE (called each frame between player update + draw)
// ============================================================
function updateFinisher() {
  if (!activeFinisher) return;
  const { attacker, target, def, data } = activeFinisher;

  // Keep target frozen
  target.invincible = Math.max(target.invincible, 2);
  // Keep attacker from drifting under gravity
  attacker.invincible = Math.max(attacker.invincible, 2);

  // Auto motion trail: enable on attacker from frame 1, disable when finisher ends
  if (activeFinisher.timer === 1 && typeof CinFX !== 'undefined') {
    CinFX.motionTrailOn(attacker, def.accentColor || attacker.color || '#ffffff');
  }

  // Auto name card: slam in at frame 18 using the finisher's name property
  if (activeFinisher.timer === 18 && def.name && typeof CinFX !== 'undefined') {
    CinFX.nameCard(def.name, def.accentColor || '#ffffff', { dur: Math.min(90, def.duration - 28) });
  }

  // A throwing finisher must never stall the timer at slowMotion=0 forever —
  // force-complete so the normal end path below restores camera/time/locks.
  if (def.update) {
    try {
      def.update(attacker, target, activeFinisher.timer, data);
    } catch (e) {
      console.error('[finisher] update threw — force-completing:', e);
      activeFinisher.timer = activeFinisher.totalDuration;
    }
  }

  activeFinisher.timer++;

  if (activeFinisher.timer >= activeFinisher.totalDuration) {
    // Clean up motion trail on attacker
    if (typeof CinFX !== 'undefined') CinFX.motionTrailOff(activeFinisher.attacker);
    // Restore camera / time
    CinCam.restore();
    slowMotion = 1.0; // resume game world
    // End sentinel so processInput + AI come back
    if (activeCinematic && activeCinematic._isFinisherSentinel) {
      activeCinematic = null;
    }
    isCinematic = false;
    if (typeof clearCombatLock === 'function') clearCombatLock('finisher');
    // Let normal death logic take over
    target.health    = 0;
    target.invincible = 0;
    activeFinisher   = null;
  }
}

// ============================================================
// DRAW (called in screen-space after drawAchievementPopups)
// ============================================================
function drawFinisher(ctx) {
  if (!activeFinisher) return;
  const { attacker, target, timer, totalDuration, def, data } = activeFinisher;
  const t = timer / totalDuration;

  // Radial vignette base (each finisher may add its own on top)
  _finVignette(ctx, Math.min(0.45, t * 2.8));

  if (def.draw) def.draw(ctx, attacker, target, t, timer, data);
}
