'use strict';
// smb-finisher-engine — Depends on: smb-finisher-helpers.js


// ============================================================
// FINISHER PICKER
// ============================================================
function _pickFinisher(attacker) {
  // A classless entity (Sovereign) reaches an authored class finisher through
  // `_finisherKey` — the same escape hatch DomainManager uses via `_domainKey`.
  // CLASS_FINISHERS.nullblade was written for him and could never fire: the
  // lookup below needs a charClass, and his is 'none', so both haW and haC
  // missed and every one of his kills fell through without a finisher while
  // the player got FIN_HEROS_TRIUMPH on all ten of theirs.
  const _fk = attacker._finisherKey;
  if (_fk && CLASS_FINISHERS[_fk]) return { key: 'class_' + _fk, def: CLASS_FINISHERS[_fk] };

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
// SHARED PRESENTATION LAYER
// ============================================================
// Every finisher def may opt into these; all fields are optional.
//   def.face   — false to disable auto-facing, or (att,tgt,timer,data) => [attFacing, tgtFacing]
//                (return null/undefined for either slot to fall back to the default)
//   def.swing  — {at, dur} or an array of them: render-only weapon swing windows on the
//                attacker. Drives the real WEAPON_SWINGS grammar, so the weapon actually
//                arcs (and leaves its swing-trail ribbon) instead of sitting in idle pose.
//   def.impact — frame from which the target reads as hurt (grimace + hurt pose).
//   def.approach — {at, dur, gap}: walk the attacker in to `gap` px from the target's
//                near edge. For melee finishers whose choreography never closed the
//                distance, so the killing blow swung through empty air.
// ============================================================

const FIN_ANTIC_FRAMES = 5;    // wind-up frames inserted before each def.swing
const FIN_ANTIC_AMOUNT = 0.62; // radians of counter-motion at the peak
const FIN_HOLD_FRAMES  = 5;
const FIN_RECOVER_IFRAMES = 48;  // 0.8s of i-frames when a finisher hands control back
const FIN_BRACE_FRAMES = 4;
const FIN_HURT_FRAMES  = 10;
const FIN_SQUASH_FRAMES = 7;
// Limb smear during a finisher swing. Fighter.draw() only smears when the state
// is 'attacking'/'ragdoll'/spinning, and _finApplyPose deliberately never writes
// attackTimer (that would re-arm the melee hit-scan and let a finisher damage
// bystanders) — so the biggest swing in the game was the one swing that never
// trailed. These drive an opt-out smear over every def.swing window.
const FIN_SMEAR_SAMPLES = 5;
const FIN_SMEAR_ALPHA   = 0.30;

// Applied after def.update so it wins over the def's own positioning. Only for
// defs that don't already lunge — never add this on top of an authored dash.
function _finApplyApproach(att, tgt, def, timer, data) {
  const ap = def.approach;
  if (!ap) return;
  if (timer < ap.at) { data._apFromX = att.x; return; }
  if (data._apToX === undefined) {
    const dir = data.dir || (tgt.cx() > att.cx() ? 1 : -1);
    const gap = (ap.gap === undefined) ? 28 : ap.gap;
    if (data._apFromX === undefined) data._apFromX = att.x;
    let to = dir > 0 ? tgt.x - att.w - gap : tgt.x + tgt.w + gap;
    // Never walk backwards — if we already started inside that gap, stay put
    if ((dir > 0 && to < data._apFromX) || (dir < 0 && to > data._apFromX)) to = data._apFromX;
    data._apToX = to;
  }
  const p = Math.min(1, (timer - ap.at) / (ap.dur || 12));
  att.x = data._apFromX + (data._apToX - data._apFromX) * _finEaseOut(p);
}

// Fighters must always face each other. Without this the attacker keeps whatever
// facing it had at kill time — commonly its back to the target, with the weapon
// swinging out the wrong side and clipping through the victim.
function _finApplyFacing(att, tgt, def, timer, data) {
  if (def.face === false) return;
  let fa = null, ft = null;
  if (typeof def.face === 'function') {
    let r = null;
    try { r = def.face(att, tgt, timer, data); } catch (e) { r = null; }
    if (r) { fa = r[0]; ft = r[1]; }
  }
  if (fa === null || fa === undefined) {
    const dx = tgt.cx() - att.cx();
    // Deadzone: near-perfect overlap keeps the previous facing rather than flip-flopping
    if (Math.abs(dx) >= 3) { fa = dx > 0 ? 1 : -1; if (ft === null || ft === undefined) ft = -fa; }
  }
  if (fa) att.facing = fa;
  if (ft) tgt.facing = ft;
}

// Render-only swing pose. Never writes attackTimer — that would re-arm the melee
// hit-scan in Fighter.update() and let a finisher damage bystanders.
function _finApplyPose(att, tgt, def, timer) {
  att._finPoseP = null;
  att._finAnticip = 0;
  const sw = def.swing;
  if (sw) {
    const list = Array.isArray(sw) ? sw : [sw];
    for (const w of list) {
      const dur = w.dur || 12;
      if (timer >= w.at && timer < w.at + dur) { att._finPoseP = (timer - w.at) / dur; break; }
      // swingPose() clamps progress to 0..1, so wind-up cannot be expressed
      // through _finPoseP — it needs its own channel.
      const anT = (w.antic === undefined) ? FIN_ANTIC_FRAMES : w.antic;
      if (anT > 0 && timer >= w.at - anT && timer < w.at) {
        att._finPoseP   = 0;
        att._finAnticip = Math.sin(((timer - (w.at - anT)) / anT) * Math.PI * 0.5) *
                          (w.anticAmt === undefined ? FIN_ANTIC_AMOUNT : w.anticAmt);
        break;
      }
    }
  }
  tgt._finPoseState = _finVictimBeat(def, timer);
  att._finSmear     = _finSmearAt(def, timer);
  _finApplyDeform(att, tgt, def, timer);
}

// Which smear window, if any, covers this frame.
//
// Defaults to every def.swing window so all existing defs gain smear without
// being edited — the same opt-out shape as def.holds defaulting from def.impact.
// `def.smear` overrides: pass an array of {at, dur, samples, alpha} to place the
// smear somewhere other than the swing, or `def.smear = false` to disable it for
// a finisher whose presentation does not want trails (a slow crush, a hold).
function _finSmearAt(def, timer) {
  if (def.smear === false) return null;
  const src = def.smear
    ? (Array.isArray(def.smear) ? def.smear : [def.smear])
    : (def.swing ? (Array.isArray(def.swing) ? def.swing : [def.swing]) : null);
  if (!src) return null;
  for (const w of src) {
    if (w.at === undefined) continue;
    const dur = w.dur || 12;
    if (timer >= w.at && timer < w.at + dur) {
      return { samples: w.samples || FIN_SMEAR_SAMPLES,
               alpha:   w.alpha   === undefined ? FIN_SMEAR_ALPHA : w.alpha };
    }
  }
  return null;
}

// Shape deformation across the beats. Fighter.draw() has fixed bone lengths for
// every gameplay reason, so this is the only place the finisher rig is allowed
// to stretch and compress.
function _finApplyDeform(att, tgt, def, timer) {
  att._finStretch = 1;
  att._finSquash  = null;
  tgt._finSquash  = null;

  if (att._finAnticip) {
    const u = att._finAnticip / FIN_ANTIC_AMOUNT;
    att._finSquash = { x: 1 + u * 0.09, y: 1 - u * 0.09 };
  } else if (att._finPoseP !== null && att._finPoseP !== undefined) {
    const p = att._finPoseP;
    const drive = Math.sin(Math.min(1, p) * Math.PI);
    att._finStretch = 1 + drive * 0.42;
    att._finSquash  = { x: 1 - drive * 0.07, y: 1 + drive * 0.10 };
  }

  const imp = def.impact;
  if (!imp) return;
  const dt = timer - imp;
  if (dt >= 0 && dt < FIN_SQUASH_FRAMES) {
    const k = 1 - dt / FIN_SQUASH_FRAMES;
    tgt._finSquash = { x: 1 + k * 0.24, y: 1 - k * 0.20 };
  }
}

// Victim beat track. Without this the target's entire performance is a single
// 'hurt' pose held from def.impact to the end of the sequence.
function _finVictimBeat(def, timer) {
  const imp = def.impact;
  if (!imp) return null;
  if (timer < imp - FIN_BRACE_FRAMES) return null;
  if (timer < imp) return 'shielding';
  if (timer < imp + FIN_HURT_FRAMES) return 'hurt';
  return 'ragdoll';
}

// Impact freezes. Defaults to one hold on def.impact so every existing def gains
// a beat without being edited; def.holds overrides.
function _finApplyHolds(att, tgt, def, timer, data) {
  const list = def.holds || (def.impact ? [{ at: def.impact, frames: FIN_HOLD_FRAMES }] : null);
  if (!list) return;
  if (!data._finHeld) data._finHeld = {};
  for (let i = 0; i < list.length; i++) {
    const h = list[i];
    if (timer !== h.at || data._finHeld[i]) continue;
    data._finHeld[i] = true;
    if (typeof animHold === 'function') animHold(h.frames || FIN_HOLD_FRAMES);
    if (h.shake !== false && typeof screenShake !== 'undefined' && typeof settings !== 'undefined' && settings.screenShake) {
      screenShake = Math.max(screenShake, h.shake || 16);
    }
    if (typeof CinCam !== 'undefined' && CinCam.zoomTo && h.zoom !== false) {
      CinCam.zoomTo((h.zoom || 1.34));
      if (att) CinCam.focusPoint((att.cx() + tgt.cx()) / 2, (att.cy() + tgt.cy()) / 2);
    }
  }
}

function _finClearPose(f) {
  if (!f) return;
  f._finPoseP = null;
  f._finPoseState = null;
  f._finAnticip = 0;
  f._finStretch = 1;
  f._finSquash = null;
  f._finSmear = null;
  f._finNoBlink = false;
}

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
  // The freeze-alive lock is not real i-frames — don't render it as the blink flicker
  attacker._finNoBlink = true; target._finNoBlink = true;
  attacker._finPoseP = null;   target._finPoseP = null;
  attacker._finPoseState = null; target._finPoseState = null;

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
      _finClearPose(attacker); _finClearPose(target);
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

  // NOTE: no auto name card here. Every finisher def draws its own title via
  // _finTitle() in its draw(), so slamming a CinFX.nameCard in as well put the
  // finisher's name on screen twice, in two different styles, at the same time.

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

  // Shared presentation: run AFTER def.update so it reads the def's final positions
  _finApplyApproach(attacker, target, def, activeFinisher.timer, data);
  _finApplyFacing(attacker, target, def, activeFinisher.timer, data);
  _finApplyPose(attacker, target, def, activeFinisher.timer);
  _finApplyHolds(attacker, target, def, activeFinisher.timer, data);

  activeFinisher.timer++;

  if (activeFinisher.timer >= activeFinisher.totalDuration) {
    // Clean up motion trail on attacker
    if (typeof CinFX !== 'undefined') CinFX.motionTrailOff(activeFinisher.attacker);
    _finClearPose(attacker); _finClearPose(target);
    // Restore camera / time
    CinCam.restore();
    slowMotion = 1.0; // resume game world
    // End sentinel so processInput + AI come back
    if (activeCinematic && activeCinematic._isFinisherSentinel) {
      activeCinematic = null;
    }
    isCinematic = false;
    if (typeof clearCombatLock === 'function') clearCombatLock('finisher');
    // Recovery i-frames for the attacker. A finisher locks you in place for its
    // whole duration and hands control back mid-crowd; without this, a player who
    // executes one enemy while swarmed eats free hits on the frame the lock ends
    // and is punished for using the move. Short enough not to be an escape tool:
    // it covers the hand-back, not a reposition.
    if (attacker && attacker.health > 0) {
      attacker.invincible = Math.max(attacker.invincible || 0, FIN_RECOVER_IFRAMES);
    }
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
